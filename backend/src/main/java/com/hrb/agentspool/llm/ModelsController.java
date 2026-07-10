package com.hrb.agentspool.llm;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Proxy do catálogo público de modelos do OpenRouter.
 * Cache simples em memória por 10 min (a lista muda pouco e o JSON é grande).
 */
@RestController
@RequestMapping("/api/models")
public class ModelsController {
    private static final String URL = "https://openrouter.ai/api/v1/models";
    private static final long TTL_MS = 10 * 60 * 1000;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15)).build();

    private volatile String cached;
    private volatile long fetchedAt;

    @GetMapping
    public ResponseEntity<String> models() throws Exception {
        long now = System.currentTimeMillis();
        if (cached != null && now - fetchedAt < TTL_MS) {
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(cached);
        }
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(URL))
                .timeout(Duration.ofSeconds(20))
                .GET().build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() == 200) {
            cached = resp.body();
            fetchedAt = now;
        }
        return ResponseEntity.status(resp.statusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body(resp.body());
    }
}
