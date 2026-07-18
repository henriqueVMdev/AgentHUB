package com.hrb.agentspool.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Consumer;
import java.util.stream.Stream;

/**
 * Cliente para qualquer endpoint OpenAI-compatible (/v1/chat/completions).
 * chat() é non-streaming; chatStream() faz stream:true com parse de deltas
 * e remonta a resposta no mesmo formato do non-streaming.
 */
@Component
public class LlmClient {
    private static final String OPENROUTER_URL = "https://openrouter.ai/api/v1";

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Envia com retry para falhas transitórias: 429/5xx e erros de conexão, com
     * backoff (2s, 4s). Um 429 momentâneo do OpenRouter não derruba o run — e uma
     * rotina agendada não falha silenciosa de madrugada. 4xx de verdade não repete.
     * No streaming o retry só acontece aqui, antes de qualquer delta ser consumido.
     */
    private <T> HttpResponse<T> sendWithRetry(HttpRequest req, HttpResponse.BodyHandler<T> handler) throws Exception {
        long[] backoffMs = {2000, 4000};
        for (int attempt = 0; ; attempt++) {
            try {
                HttpResponse<T> resp = http.send(req, handler);
                if (attempt < backoffMs.length && (resp.statusCode() == 429 || resp.statusCode() >= 500)) {
                    Thread.sleep(backoffMs[attempt]);
                    continue;
                }
                return resp;
            } catch (java.io.IOException e) {
                if (attempt >= backoffMs.length) throw e;
                Thread.sleep(backoffMs[attempt]);
            }
        }
    }

    /**
     * @param messages array JSON de messages (formato OpenAI)
     * @param tools    array JSON de tool definitions, ou null
     * @return a resposta completa (choices, usage, ...); o message fica em choices[0].message
     */
    public JsonNode chat(String baseUrl, String apiKey, String model, Double temperature,
                         ArrayNode messages, ArrayNode tools) throws Exception {
        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        if (temperature != null) body.put("temperature", temperature);
        body.set("messages", messages);
        if (tools != null && !tools.isEmpty()) body.set("tools", tools);

        String url = (baseUrl == null || baseUrl.isBlank() ? OPENROUTER_URL : baseUrl.replaceAll("/+$", ""))
                + "/chat/completions";

        // ponytail: só o OpenRouter aceita este campo (devolve usage.cost); endpoints estritos rejeitam extras
        if (url.contains("openrouter.ai")) body.set("usage", mapper.createObjectNode().put("include", true));

        HttpRequest.Builder req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMinutes(5))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        if (apiKey != null && !apiKey.isBlank()) req.header("Authorization", "Bearer " + apiKey);

        HttpResponse<String> resp = sendWithRetry(req.build(), HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new RuntimeException("LLM API error " + resp.statusCode() + ": " + resp.body());
        }
        return mapper.readTree(resp.body());
    }

    /**
     * Como {@link #chat}, mas com stream:true — cada delta de texto do assistant é
     * entregue em onDelta conforme chega. Retorna a resposta remontada no MESMO
     * formato do não-streaming (choices[0].message com content/tool_calls, usage),
     * então o chamador processa tool calls e usage sem mudanças.
     * Endpoints que ignoram stream:true e devolvem JSON puro também funcionam.
     */
    public JsonNode chatStream(String baseUrl, String apiKey, String model, Double temperature,
                               ArrayNode messages, ArrayNode tools, Consumer<String> onDelta) throws Exception {
        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        if (temperature != null) body.put("temperature", temperature);
        body.set("messages", messages);
        if (tools != null && !tools.isEmpty()) body.set("tools", tools);
        body.put("stream", true);

        String url = (baseUrl == null || baseUrl.isBlank() ? OPENROUTER_URL : baseUrl.replaceAll("/+$", ""))
                + "/chat/completions";
        if (url.contains("openrouter.ai")) body.set("usage", mapper.createObjectNode().put("include", true));

        HttpRequest.Builder req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMinutes(5))
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        if (apiKey != null && !apiKey.isBlank()) req.header("Authorization", "Bearer " + apiKey);

        HttpResponse<Stream<String>> resp = sendWithRetry(req.build(), HttpResponse.BodyHandlers.ofLines());
        if (resp.statusCode() >= 400) {
            String error = resp.body().reduce("", (a, b) -> a + b);
            throw new RuntimeException("LLM API error " + resp.statusCode() + ": " + error);
        }

        StringBuilder content = new StringBuilder();
        Map<Integer, ObjectNode> toolCalls = new TreeMap<>();       // index -> {id, type, function{name}}
        Map<Integer, StringBuilder> toolArgs = new TreeMap<>();     // arguments chegam fatiados
        StringBuilder nonSse = new StringBuilder();                 // fallback: endpoint respondeu JSON puro
        String[] finishReason = new String[1];
        JsonNode[] usage = new JsonNode[1];
        boolean[] sawData = new boolean[1];

        try (Stream<String> lines = resp.body()) {
            for (String line : (Iterable<String>) lines::iterator) {
                if (!line.startsWith("data:")) {
                    // linhas de keep-alive (": ...") são descartadas; o resto pode ser JSON puro
                    if (!line.isBlank() && !line.startsWith(":")) nonSse.append(line);
                    continue;
                }
                sawData[0] = true;
                String payload = line.substring(5).trim();
                if (payload.isEmpty() || "[DONE]".equals(payload)) continue;
                JsonNode chunk = mapper.readTree(payload);
                if (chunk.hasNonNull("error")) {
                    throw new RuntimeException("LLM API stream error: " + chunk.path("error").toString());
                }
                if (chunk.hasNonNull("usage")) usage[0] = chunk.get("usage");
                JsonNode choice = chunk.path("choices").path(0);
                if (choice.hasNonNull("finish_reason")) finishReason[0] = choice.path("finish_reason").asText();
                JsonNode delta = choice.path("delta");
                String piece = delta.path("content").asText("");
                if (!piece.isEmpty()) {
                    content.append(piece);
                    onDelta.accept(piece);
                }
                for (JsonNode call : delta.path("tool_calls")) {
                    int index = call.path("index").asInt(0);
                    ObjectNode accumulated = toolCalls.computeIfAbsent(index, k -> {
                        ObjectNode fresh = mapper.createObjectNode().put("type", "function");
                        fresh.set("function", mapper.createObjectNode());
                        return fresh;
                    });
                    if (call.hasNonNull("id")) accumulated.put("id", call.path("id").asText());
                    JsonNode function = call.path("function");
                    if (function.hasNonNull("name")) {
                        ((ObjectNode) accumulated.get("function")).put("name", function.path("name").asText());
                    }
                    String argsPiece = function.path("arguments").asText("");
                    if (!argsPiece.isEmpty()) {
                        toolArgs.computeIfAbsent(index, k -> new StringBuilder()).append(argsPiece);
                    }
                }
            }
        }

        // endpoint que ignorou stream:true — o corpo inteiro é a resposta não-streaming
        if (!sawData[0] && !nonSse.isEmpty()) return mapper.readTree(nonSse.toString());

        ObjectNode message = mapper.createObjectNode().put("role", "assistant");
        message.put("content", content.toString());
        if (!toolCalls.isEmpty()) {
            ArrayNode calls = mapper.createArrayNode();
            toolCalls.forEach((index, call) -> {
                ((ObjectNode) call.get("function")).put("arguments",
                        toolArgs.getOrDefault(index, new StringBuilder()).toString());
                calls.add(call);
            });
            message.set("tool_calls", calls);
        }
        ObjectNode choice = mapper.createObjectNode();
        choice.set("message", message);
        choice.put("finish_reason", finishReason[0] == null ? (toolCalls.isEmpty() ? "stop" : "tool_calls") : finishReason[0]);
        ObjectNode response = mapper.createObjectNode();
        response.set("choices", mapper.createArrayNode().add(choice));
        if (usage[0] != null) response.set("usage", usage[0]);
        return response;
    }

    /**
     * POST /embeddings (OpenAI-compatible). Retorna um vetor por input, na mesma ordem.
     */
    public List<float[]> embed(String baseUrl, String apiKey, String model, List<String> inputs) throws Exception {
        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        ArrayNode inputNode = mapper.createArrayNode();
        for (String input : inputs) inputNode.add(input);
        body.set("input", inputNode);

        String url = (baseUrl == null || baseUrl.isBlank() ? OPENROUTER_URL : baseUrl.replaceAll("/+$", ""))
                + "/embeddings";
        HttpRequest.Builder req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMinutes(2))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        if (apiKey != null && !apiKey.isBlank()) req.header("Authorization", "Bearer " + apiKey);

        HttpResponse<String> resp = sendWithRetry(req.build(), HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new RuntimeException("Embeddings API error " + resp.statusCode() + ": " + resp.body());
        }
        JsonNode data = mapper.readTree(resp.body()).path("data");
        List<float[]> vectors = new ArrayList<>();
        for (JsonNode item : data) {
            JsonNode raw = item.path("embedding");
            float[] vector = new float[raw.size()];
            for (int i = 0; i < raw.size(); i++) vector[i] = (float) raw.get(i).asDouble();
            vectors.add(vector);
        }
        if (vectors.size() != inputs.size()) {
            throw new RuntimeException("Embeddings API returned " + vectors.size() + " vectors for " + inputs.size() + " inputs");
        }
        return vectors;
    }
}
