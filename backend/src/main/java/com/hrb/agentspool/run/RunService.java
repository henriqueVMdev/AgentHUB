package com.hrb.agentspool.run;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hrb.agentspool.agent.AgentConfig;
import com.hrb.agentspool.agent.AgentRepository;
import com.hrb.agentspool.llm.LlmClient;
import com.hrb.agentspool.tools.ToolRegistry;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
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
    private final ObjectMapper mapper = new ObjectMapper();

    // runId -> request pendente (entre /start e /stream)
    private final ConcurrentHashMap<Long, StartRunRequest> pending = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public RunService(AgentRepository agents, AgentRunRepository runs, LlmClient llm, ToolRegistry tools) {
        this.agents = agents;
        this.runs = runs;
        this.llm = llm;
        this.tools = tools;
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

            ArrayNode messages = mapper.createArrayNode();
            if (agent.getSystemPrompt() != null && !agent.getSystemPrompt().isBlank()) {
                messages.add(msg("system", agent.getSystemPrompt()));
            }
            messages.add(msg("user", req.prompt));

            ArrayNode toolDefs = tools.definitionsFor(agent.getEnabledTools());

            for (int step = 0; step < MAX_STEPS; step++) {
                JsonNode assistant = llm.chat(agent.getBaseUrl(), req.apiKey, agent.getModelId(),
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

                    String result = tools.execute(fnName, args);

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
