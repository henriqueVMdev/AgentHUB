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

/**
 * Cliente para qualquer endpoint OpenAI-compatible (/v1/chat/completions).
 * ponytail: non-streaming; trocar para stream:true + parse de deltas se
 * streaming token-a-token for necessário.
 */
@Component
public class LlmClient {
    private static final String OPENROUTER_URL = "https://openrouter.ai/api/v1";

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

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

        HttpResponse<String> resp = http.send(req.build(), HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new RuntimeException("LLM API error " + resp.statusCode() + ": " + resp.body());
        }
        return mapper.readTree(resp.body());
    }
}
