package com.hrb.agentspool.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component
public class HttpTool implements ToolExecutor {
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15)).build();

    @Override public String group() { return "http"; }

    @Override public JsonNode definitions() {
        ArrayNode arr = ToolDefs.M.createArrayNode();
        arr.add(ToolDefs.fn("http_request",
                "Faz uma requisição HTTP e retorna o corpo da resposta.",
                """
                {"type":"object","properties":{
                  "method":{"type":"string","enum":["GET","POST","PUT","DELETE"]},
                  "url":{"type":"string"},
                  "body":{"type":"string","description":"corpo da requisição (opcional)"}
                },"required":["method","url"]}
                """));
        return arr;
    }

    @Override public boolean handles(String fn) { return "http_request".equals(fn); }

    @Override public String execute(String fn, JsonNode args) throws Exception {
        String method = args.path("method").asText("GET").toUpperCase();
        String url = args.path("url").asText();
        String body = args.path("body").asText("");

        HttpRequest.BodyPublisher pub = body.isEmpty()
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .method(method, pub)
                .build();

        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        String out = resp.body();
        if (out.length() > 8000) out = out.substring(0, 8000) + "\n...[truncado]";
        return "HTTP " + resp.statusCode() + "\n" + out;
    }
}
