package com.hrb.agentspool.operation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.hrb.agentspool.agent.AgentConfig;
import com.hrb.agentspool.agent.AgentRepository;
import com.hrb.agentspool.config.CredentialService;
import com.hrb.agentspool.llm.LlmClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Seleção de memórias para o prompt (retrieval por embedding com fallback por
 * recência) e consolidação do acervo via LLM.
 */
@Service
public class OperationMemoryService {
    private static final int TOP_K = 12;          // memórias ranqueadas por relevância
    private static final int RECENCY_LIMIT = 30;  // fallback sem embeddings
    private static final List<String> CATEGORIES = List.of("FACT", "DECISION", "LEARNING");

    public record MemoryDraft(String content, String category) {}
    public record ConsolidationPreview(List<OperationMemory> before, List<MemoryDraft> after) {}

    private final OperationRepository operations;
    private final OperationMemoryRepository memories;
    private final AgentRepository agents;
    private final LlmClient llm;
    private final CredentialService credentials;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${app.embedding-base-url:}")
    private String embeddingBaseUrl;
    @Value("${app.embedding-model:}")
    private String embeddingModel;
    @Value("${app.embedding-api-key:}")
    private String embeddingApiKey;

    public OperationMemoryService(OperationRepository operations, OperationMemoryRepository memories,
                                  AgentRepository agents, LlmClient llm, CredentialService credentials) {
        this.operations = operations;
        this.memories = memories;
        this.agents = agents;
        this.llm = llm;
        this.credentials = credentials;
    }

    public boolean embeddingsEnabled() {
        return embeddingModel != null && !embeddingModel.isBlank();
    }

    /**
     * Memórias ACTIVE para o system prompt: todas as pinned + as não-pinned mais
     * relevantes para a query (top-K por cosseno). Sem endpoint de embedding, com
     * query vazia ou em qualquer falha, degrada para as mais recentes.
     */
    public List<OperationMemory> selectForPrompt(Long operationId, String query) {
        List<OperationMemory> active = memories.findAllByOperationIdOrderByCreatedAtDesc(operationId).stream()
                .filter(memory -> "ACTIVE".equals(memory.getStatus())).toList();
        List<OperationMemory> pinned = active.stream().filter(OperationMemory::getPinned).toList();
        List<OperationMemory> candidates = active.stream().filter(memory -> !memory.getPinned()).toList();

        List<OperationMemory> selected = new ArrayList<>(pinned);
        if (!embeddingsEnabled() || query == null || query.isBlank()) {
            selected.addAll(candidates.stream().limit(RECENCY_LIMIT).toList());
            return selected;
        }
        try {
            backfillEmbeddings(candidates);
            float[] queryVector = llm.embed(embeddingBaseUrl, embeddingKey(), embeddingModel, List.of(query)).get(0);
            selected.addAll(candidates.stream()
                    .filter(memory -> memory.getEmbeddingJson() != null && embeddingModel.equals(memory.getEmbeddingModel()))
                    .sorted(Comparator.comparingDouble(
                            (OperationMemory memory) -> cosine(queryVector, parseVector(memory.getEmbeddingJson()))).reversed())
                    .limit(TOP_K).toList());
            return selected;
        } catch (Exception e) {
            // endpoint fora do ar ou modelo inválido: retrieval nunca derruba o run
            selected.addAll(candidates.stream().limit(RECENCY_LIMIT).toList());
            return selected;
        }
    }

    /** Indexa uma memória (best-effort): falha de embedding nunca impede a gravação. */
    public void tryEmbed(OperationMemory memory) {
        if (!embeddingsEnabled()) return;
        try {
            float[] vector = llm.embed(embeddingBaseUrl, embeddingKey(), embeddingModel,
                    List.of(memory.getContent())).get(0);
            memory.setEmbeddingJson(mapper.writeValueAsString(vector));
            memory.setEmbeddingModel(embeddingModel);
            memories.save(memory);
        } catch (Exception ignored) {
            // fica sem vetor; o backfill do próximo selectForPrompt tenta de novo
        }
    }

    /** Reindexa em lote as memórias sem vetor ou indexadas com outro modelo. */
    private void backfillEmbeddings(List<OperationMemory> candidates) throws Exception {
        List<OperationMemory> missing = candidates.stream()
                .filter(memory -> memory.getEmbeddingJson() == null || !embeddingModel.equals(memory.getEmbeddingModel()))
                .toList();
        if (missing.isEmpty()) return;
        List<float[]> vectors = llm.embed(embeddingBaseUrl, embeddingKey(), embeddingModel,
                missing.stream().map(OperationMemory::getContent).toList());
        for (int i = 0; i < missing.size(); i++) {
            OperationMemory memory = missing.get(i);
            memory.setEmbeddingJson(mapper.writeValueAsString(vectors.get(i)));
            memory.setEmbeddingModel(embeddingModel);
        }
        memories.saveAll(missing);
    }

    /**
     * Pede ao LLM uma versão consolidada (dedupe/fusão/contradições) das memórias
     * não-pinned ACTIVE. Só gera o preview — nada é gravado até applyConsolidation.
     */
    public ConsolidationPreview consolidatePreview(Long operationId) throws Exception {
        Operation operation = operations.findById(operationId).orElseThrow();
        List<OperationMemory> targets = consolidationTargets(operationId);
        if (targets.size() < 2) throw new IllegalStateException("É preciso ter ao menos 2 memórias não fixadas para consolidar.");
        AgentConfig agent = consolidationAgent(operation);

        StringBuilder listing = new StringBuilder();
        for (OperationMemory memory : targets) {
            listing.append("- [").append(memory.getCategory()).append("] (")
                    .append(memory.getCreatedAt().toLocalDate()).append(") ")
                    .append(memory.getContent().trim().replace("\n", " ")).append("\n");
        }
        ArrayNode messages = mapper.createArrayNode();
        messages.add(mapper.createObjectNode().put("role", "system").put("content",
                "You curate the shared memory of an AI agent operation. Consolidate the list: merge duplicates, "
                + "combine related items, and resolve contradictions (the newest date wins). Preserve every distinct "
                + "durable fact, decision and learning — do not invent or drop unique information. Each item must be "
                + "self-contained and at most " + OperationController.MAX_MEMORY_CHARS + " characters. Respond with "
                + "ONLY a JSON array: [{\"content\":\"...\",\"category\":\"FACT|DECISION|LEARNING\"}]"));
        messages.add(mapper.createObjectNode().put("role", "user").put("content", listing.toString()));

        JsonNode response = llm.chat(agent.getBaseUrl(), chatKey(agent), agent.getModelId(), 0.2, messages, null);
        List<MemoryDraft> drafts = parseDrafts(response.path("choices").path(0).path("message").path("content").asText(""));
        if (drafts.isEmpty()) throw new IllegalStateException("O modelo não retornou uma lista consolidada válida.");
        return new ConsolidationPreview(targets, drafts);
    }

    /** Substitui as memórias não-pinned ACTIVE pela lista consolidada aprovada na UI. */
    @Transactional
    public List<OperationMemory> applyConsolidation(Long operationId, List<MemoryDraft> drafts) {
        operations.findById(operationId).orElseThrow();
        List<MemoryDraft> valid = drafts == null ? List.of() : drafts.stream()
                .filter(draft -> draft.content() != null && !draft.content().isBlank()
                        && draft.content().length() <= OperationController.MAX_MEMORY_CHARS)
                .toList();
        if (valid.isEmpty()) throw new IllegalStateException("A lista consolidada está vazia.");
        memories.deleteAll(consolidationTargets(operationId));
        List<OperationMemory> saved = new ArrayList<>();
        for (MemoryDraft draft : valid) {
            OperationMemory memory = new OperationMemory();
            memory.setOperationId(operationId);
            memory.setContent(draft.content().trim());
            memory.setCategory(CATEGORIES.contains(draft.category()) ? draft.category() : "FACT");
            saved.add(memories.save(memory));
        }
        saved.forEach(this::tryEmbed);
        return saved;
    }

    private List<OperationMemory> consolidationTargets(Long operationId) {
        return memories.findAllByOperationIdOrderByCreatedAtDesc(operationId).stream()
                .filter(memory -> "ACTIVE".equals(memory.getStatus()) && !memory.getPinned()).toList();
    }

    /** Usa o modelo de um agente membro (nativos primeiro — chamada direta de chat/completions). */
    private AgentConfig consolidationAgent(Operation operation) {
        List<AgentConfig> members = operation.getMemberAgentIds() == null ? List.of()
                : agents.findAllById(operation.getMemberAgentIds());
        return members.stream().filter(agent -> "native".equals(agent.getAgentType())).findFirst()
                .or(() -> members.stream().findFirst())
                .orElseThrow(() -> new IllegalStateException("A operação precisa de um agente membro para consolidar."));
    }

    private List<MemoryDraft> parseDrafts(String content) {
        String raw = content.trim();
        int start = raw.indexOf('[');
        int end = raw.lastIndexOf(']');
        if (start < 0 || end <= start) return List.of();
        try {
            JsonNode parsed = mapper.readTree(raw.substring(start, end + 1));
            List<MemoryDraft> drafts = new ArrayList<>();
            for (JsonNode item : parsed) {
                String text = item.path("content").asText("").trim();
                if (!text.isBlank() && text.length() <= OperationController.MAX_MEMORY_CHARS) {
                    drafts.add(new MemoryDraft(text, item.path("category").asText("FACT")));
                }
            }
            return drafts;
        } catch (Exception e) {
            return List.of();
        }
    }

    private String embeddingKey() {
        return embeddingApiKey != null && !embeddingApiKey.isBlank()
                ? embeddingApiKey : credentials.get(CredentialService.OPENROUTER);
    }

    private String chatKey(AgentConfig agent) {
        return switch (agent.getAgentType()) {
            case "hermes" -> credentials.get(CredentialService.HERMES);
            case "openclaw" -> credentials.get(CredentialService.OPENCLAW);
            case "external" -> credentials.get(CredentialService.EXTERNAL);
            default -> credentials.get(CredentialService.OPENROUTER);
        };
    }

    private float[] parseVector(String json) {
        try {
            return mapper.readValue(json, float[].class);
        } catch (Exception e) {
            return new float[0];
        }
    }

    private double cosine(float[] a, float[] b) {
        if (a.length == 0 || a.length != b.length) return -1;
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return normA == 0 || normB == 0 ? -1 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
