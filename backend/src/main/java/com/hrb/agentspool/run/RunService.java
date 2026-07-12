package com.hrb.agentspool.run;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hrb.agentspool.agent.AgentConfig;
import com.hrb.agentspool.agent.AgentRepository;
import com.hrb.agentspool.config.CredentialService;
import com.hrb.agentspool.llm.LlmClient;
import com.hrb.agentspool.skill.AgentSkill;
import com.hrb.agentspool.skill.AgentSkillRepository;
import com.hrb.agentspool.skill.SkillProposal;
import com.hrb.agentspool.skill.SkillProposalRepository;
import com.hrb.agentspool.tools.ToolRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Orquestra a execução de um agente: monta as mensagens, chama o LLM em loop,
 * intercala tool calls e emite eventos SSE em tempo real.
 */
@Service
public class RunService {
    private static final int MAX_STEPS = 12;

    private final AgentRepository agents;
    private final AgentRunRepository runs;
    private final LlmClient llm;
    private final ToolRegistry tools;
    private final AgentSkillRepository skills;
    private final SkillProposalRepository skillProposals;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${app.hermes-base-url:}")
    private String hermesBaseUrl;
    @Value("${app.openclaw-base-url:}")
    private String openclawBaseUrl;
    private final CredentialService credentials;

    // runId -> request pendente (entre /start e /stream)
    private final ConcurrentHashMap<Long, StartRunRequest> pending = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public RunService(AgentRepository agents, AgentRunRepository runs, LlmClient llm, ToolRegistry tools,
                      AgentSkillRepository skills, SkillProposalRepository skillProposals,
                      CredentialService credentials) {
        this.agents = agents;
        this.runs = runs;
        this.llm = llm;
        this.tools = tools;
        this.skills = skills;
        this.skillProposals = skillProposals;
        this.credentials = credentials;
    }

    /** Cria o registro de run (status RUNNING) e guarda o request para o /stream consumir. */
    public Long start(StartRunRequest req) {
        AgentRun run = new AgentRun();
        run.setAgentId(req.agentId);
        run.setStatus("RUNNING");
        run.setInputPrompt(req.prompt);
        run.setStartedAt(LocalDateTime.now());
        run = runs.save(run);
        pending.put(run.getId(), req);
        return run.getId();
    }

    /** Executa o agente de forma assíncrona, emitindo eventos SSE. */
    public void stream(Long runId, SseEmitter emitter) {
        StartRunRequest req = pending.remove(runId);
        if (req == null) {
            send(emitter, "error", "{\"message\":\"run não encontrado ou já iniciado\"}");
            emitter.complete();
            return;
        }
        executor.submit(() -> runLoop(runId, req, emitter));
    }

    private void runLoop(Long runId, StartRunRequest req, SseEmitter emitter) {
        AgentRun run = runs.findById(runId).orElseThrow();
        try {
            AgentConfig agent = agents.findById(req.agentId).orElseThrow();

            ArrayNode messages = previousMessages(req, agent);
            if (messages.isEmpty()) {
                String systemPrompt = buildSystemPrompt(agent);
                if (!systemPrompt.isBlank()) messages.add(msg("system", systemPrompt));
            }
            messages.add(msg("user", req.prompt));

            // Hermes e OpenClaw executam o próprio loop e suas próprias ferramentas no gateway.
            // Enviar também as tools locais criaria dois orquestradores concorrentes.
            ArrayNode toolDefs = buildToolDefs(agent);

            for (int step = 0; step < MAX_STEPS; step++) {
                JsonNode assistant = llm.chat(runtimeBaseUrl(agent), runtimeApiKey(agent, req.apiKey), agent.getModelId(),
                        agent.getTemperature(), messages, toolDefs);
                messages.add(assistant);

                String content = assistant.path("content").asText("");
                if (!content.isBlank()) {
                    send(emitter, "assistant", json("content", content));
                }

                JsonNode toolCalls = assistant.path("tool_calls");
                if (!toolCalls.isArray() || toolCalls.isEmpty()) {
                    break; // resposta final
                }

                for (JsonNode call : toolCalls) {
                    String callId = call.path("id").asText();
                    String fnName = call.path("function").path("name").asText();
                    String rawArgs = call.path("function").path("arguments").asText("{}");
                    JsonNode args = safeParse(rawArgs);

                    send(emitter, "tool_call", mapper.createObjectNode()
                            .put("name", fnName).put("args", rawArgs).toString());

                    String result = executeTool(agent, fnName, args, req.apiKey, 0, runId);

                    send(emitter, "tool_result", mapper.createObjectNode()
                            .put("name", fnName).put("result", result).toString());

                    ObjectNode toolMsg = mapper.createObjectNode();
                    toolMsg.put("role", "tool");
                    toolMsg.put("tool_call_id", callId);
                    toolMsg.put("content", result);
                    messages.add(toolMsg);
                }
            }

            run.setStatus("DONE");
            run.setMessagesJson(mapper.writeValueAsString(messages));
            run.setEndedAt(LocalDateTime.now());
            runs.save(run);
            send(emitter, "done", "{}");
            emitter.complete();
        } catch (Exception e) {
            run.setStatus("ERROR");
            run.setEndedAt(LocalDateTime.now());
            runs.save(run);
            send(emitter, "error", json("message", e.getMessage() == null ? e.toString() : e.getMessage()));
            emitter.complete();
        }
    }

    private ObjectNode msg(String role, String content) {
        ObjectNode m = mapper.createObjectNode();
        m.put("role", role);
        m.put("content", content);
        return m;
    }

    private ArrayNode previousMessages(StartRunRequest req, AgentConfig agent) {
        if (req.continuationRunId == null) return mapper.createArrayNode();
        return runs.findById(req.continuationRunId)
                .filter(previous -> previous.getAgentId().equals(agent.getId()))
                .filter(previous -> previous.getMessagesJson() != null && !previous.getMessagesJson().isBlank())
                .map(previous -> {
                    try {
                        JsonNode parsed = mapper.readTree(previous.getMessagesJson());
                        return parsed.isArray() ? (ArrayNode) parsed.deepCopy() : mapper.createArrayNode();
                    } catch (Exception ignored) {
                        return mapper.createArrayNode();
                    }
                }).orElseGet(mapper::createArrayNode);
    }

    private String buildSystemPrompt(AgentConfig agent) {
        StringBuilder prompt = new StringBuilder();
        if (agent.getSystemPrompt() != null) prompt.append(agent.getSystemPrompt().trim());
        List<Long> ids = agent.getEnabledSkillIds() == null ? List.of() : agent.getEnabledSkillIds();
        List<AgentSkill> active = skills.findAllById(ids).stream()
                .filter(skill -> "ACTIVE".equals(skill.getStatus())).toList();
        if (!active.isEmpty()) {
            prompt.append("\n\n<available_skills>\n");
            for (AgentSkill skill : active) {
                prompt.append("## ").append(skill.getName()).append(" (v").append(skill.getVersion()).append(")\n")
                        .append(skill.getDescription() == null ? "" : skill.getDescription()).append("\n")
                        .append(skill.getContent()).append("\n\n");
            }
            prompt.append("</available_skills>");
        }
        if (agent.getAutoLearnSkills()) {
            prompt.append("\n\nWhen you complete a reusable multi-step workflow, find a correction, or improve an enabled skill, call propose_skill_change. Propose only durable procedures, never secrets or task-specific data. Proposals require human approval.");
        }
        return prompt.toString().trim();
    }

    private ArrayNode buildToolDefs(AgentConfig agent) {
        if (!"native".equals(agent.getAgentType())) return mapper.createArrayNode();
        ArrayNode defs = tools.definitionsFor(agent.getEnabledTools());
        if (agent.getCollaboratorAgentIds() != null && !agent.getCollaboratorAgentIds().isEmpty()) {
            String collaborators = agents.findAllById(agent.getCollaboratorAgentIds()).stream()
                    .map(a -> a.getId() + "=" + a.getName()).reduce((a, b) -> a + ", " + b).orElse("");
            ObjectNode properties = mapper.createObjectNode();
            properties.set("agent_id", mapper.createObjectNode().put("type", "integer")
                    .put("description", "Allowed collaborator: " + collaborators));
            properties.set("task", mapper.createObjectNode().put("type", "string"));
            defs.add(functionTool("delegate_agent", "Delegate a bounded subtask to one allowed collaborator.",
                    properties, "agent_id", "task"));
        }
        if (agent.getAutoLearnSkills()) {
            ObjectNode properties = mapper.createObjectNode();
            properties.set("action", mapper.createObjectNode().put("type", "string")
                    .set("enum", mapper.createArrayNode().add("CREATE").add("UPDATE")));
            properties.set("target_skill_id", mapper.createObjectNode().put("type", "integer")
                    .put("description", "Required only for UPDATE and must be an enabled skill."));
            properties.set("name", mapper.createObjectNode().put("type", "string"));
            properties.set("description", mapper.createObjectNode().put("type", "string"));
            properties.set("content", mapper.createObjectNode().put("type", "string")
                    .put("description", "Complete reusable procedure in Markdown."));
            properties.set("rationale", mapper.createObjectNode().put("type", "string"));
            defs.add(functionTool("propose_skill_change", "Stage a new or improved skill for human review.",
                    properties, "action", "name", "content", "rationale"));
        }
        return defs;
    }

    private ObjectNode functionTool(String name, String description, ObjectNode properties, String... required) {
        ObjectNode parameters = mapper.createObjectNode().put("type", "object");
        parameters.set("properties", properties);
        ArrayNode requiredNode = mapper.createArrayNode();
        for (String field : required) requiredNode.add(field);
        parameters.set("required", requiredNode);
        ObjectNode function = mapper.createObjectNode().put("name", name).put("description", description);
        function.set("parameters", parameters);
        ObjectNode tool = mapper.createObjectNode().put("type", "function");
        tool.set("function", function);
        return tool;
    }

    private String executeTool(AgentConfig agent, String name, JsonNode args, String requestKey,
                               int depth, Long sourceRunId) throws Exception {
        if ("delegate_agent".equals(name)) {
            if (depth >= 2) return "Delegation depth limit reached.";
            long childId = args.path("agent_id").asLong(-1);
            if (agent.getCollaboratorAgentIds() == null || !agent.getCollaboratorAgentIds().contains(childId)) {
                return "Agent is not in the collaborator allowlist.";
            }
            AgentConfig child = agents.findById(childId).orElseThrow();
            return executeChild(child, args.path("task").asText(), requestKey, depth + 1, sourceRunId);
        }
        if ("propose_skill_change".equals(name)) {
            if (!agent.getAutoLearnSkills()) return "Skill learning is disabled for this agent.";
            String action = args.path("action").asText("CREATE").toUpperCase();
            Long targetId = args.hasNonNull("target_skill_id") ? args.path("target_skill_id").asLong() : null;
            if ("UPDATE".equals(action) && (targetId == null || agent.getEnabledSkillIds() == null
                    || !agent.getEnabledSkillIds().contains(targetId))) {
                return "An UPDATE may only target a skill enabled for this agent.";
            }
            String content = args.path("content").asText();
            if (content.isBlank() || content.length() > 50_000) return "Skill content must contain 1 to 50000 characters.";
            SkillProposal proposal = new SkillProposal();
            proposal.setAction("UPDATE".equals(action) ? "UPDATE" : "CREATE");
            proposal.setTargetSkillId(targetId);
            proposal.setSourceAgentId(agent.getId());
            proposal.setSourceRunId(sourceRunId);
            proposal.setName(limit(args.path("name").asText("unnamed-skill"), 120));
            proposal.setDescription(limit(args.path("description").asText(""), 500));
            proposal.setContent(content);
            proposal.setRationale(limit(args.path("rationale").asText(""), 2000));
            proposal = skillProposals.save(proposal);
            return "Skill proposal #" + proposal.getId() + " staged for human approval.";
        }
        return tools.execute(name, args);
    }

    private String executeChild(AgentConfig child, String task, String requestKey, int depth, Long sourceRunId) throws Exception {
        ArrayNode messages = mapper.createArrayNode();
        String systemPrompt = buildSystemPrompt(child);
        if (!systemPrompt.isBlank()) messages.add(msg("system", systemPrompt));
        messages.add(msg("user", task));
        String result = chatLoop(child, messages, requestKey, depth, sourceRunId);
        return result.isBlank() ? "Collaborator completed without a text response." : result;
    }

    /**
     * Executa o agente de forma síncrona sobre um histórico simples (sem SSE, sem AgentRun).
     * Usado pelo inbox para gerar rascunhos. Cada turn é {role, content}.
     */
    public String complete(Long agentId, List<String[]> turns) throws Exception {
        AgentConfig agent = agents.findById(agentId).orElseThrow();
        ArrayNode messages = mapper.createArrayNode();
        String systemPrompt = buildSystemPrompt(agent);
        if (!systemPrompt.isBlank()) messages.add(msg("system", systemPrompt));
        for (String[] turn : turns) messages.add(msg(turn[0], turn[1]));
        return chatLoop(agent, messages, null, 0, null);
    }

    /** Loop LLM + tools síncrono; retorna o último texto do assistant. */
    private String chatLoop(AgentConfig agent, ArrayNode messages, String requestKey, int depth, Long sourceRunId) throws Exception {
        ArrayNode defs = buildToolDefs(agent);
        String lastContent = "";
        for (int step = 0; step < 6; step++) {
            JsonNode assistant = llm.chat(runtimeBaseUrl(agent), runtimeApiKey(agent, requestKey), agent.getModelId(),
                    agent.getTemperature(), messages, defs);
            messages.add(assistant);
            if (!assistant.path("content").asText("").isBlank()) lastContent = assistant.path("content").asText();
            JsonNode calls = assistant.path("tool_calls");
            if (!calls.isArray() || calls.isEmpty()) break;
            for (JsonNode call : calls) {
                String callId = call.path("id").asText();
                String fn = call.path("function").path("name").asText();
                JsonNode fnArgs = safeParse(call.path("function").path("arguments").asText("{}"));
                ObjectNode toolMsg = mapper.createObjectNode().put("role", "tool")
                        .put("tool_call_id", callId)
                        .put("content", executeTool(agent, fn, fnArgs, requestKey, depth, sourceRunId));
                messages.add(toolMsg);
            }
        }
        return lastContent;
    }

    private String limit(String value, int max) {
        return value == null ? "" : value.substring(0, Math.min(value.length(), max));
    }

    private String runtimeBaseUrl(AgentConfig agent) {
        return switch (agent.getAgentType()) {
            case "hermes" -> hermesBaseUrl == null || hermesBaseUrl.isBlank() ? agent.getBaseUrl() : hermesBaseUrl;
            case "openclaw" -> openclawBaseUrl == null || openclawBaseUrl.isBlank() ? agent.getBaseUrl() : openclawBaseUrl;
            default -> agent.getBaseUrl();
        };
    }

    private String runtimeApiKey(AgentConfig agent, String requestKey) {
        String configured = switch (agent.getAgentType()) {
            case "hermes" -> credentials.get(CredentialService.HERMES);
            case "openclaw" -> credentials.get(CredentialService.OPENCLAW);
            case "external" -> credentials.get(CredentialService.EXTERNAL);
            default -> credentials.get(CredentialService.OPENROUTER);
        };
        return configured == null || configured.isBlank() ? requestKey : configured;
    }

    private String json(String key, String value) {
        return mapper.createObjectNode().put(key, value).toString();
    }

    private JsonNode safeParse(String raw) {
        try {
            return mapper.readTree(raw);
        } catch (Exception e) {
            return mapper.createObjectNode();
        }
    }

    private void send(SseEmitter emitter, String event, String data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(data));
        } catch (Exception ignored) {
            // cliente desconectou — o loop encerra sozinho na próxima iteração de send
        }
    }
}
