package com.hrb.agentspool.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Read/write restrito ao diretório sandbox. Rejeita path traversal para fora dele. */
@Component
public class FileTool implements ToolExecutor {
    private final Path sandbox;

    public FileTool(@Value("${app.sandbox-dir}") String sandboxDir) throws IOException {
        this.sandbox = Path.of(sandboxDir).toAbsolutePath().normalize();
        Files.createDirectories(this.sandbox);
    }

    @Override public String group() { return "file"; }

    @Override public JsonNode definitions() {
        ArrayNode arr = ToolDefs.M.createArrayNode();
        arr.add(ToolDefs.fn("file_read",
                "Lê um arquivo do diretório de trabalho (sandbox).",
                """
                {"type":"object","properties":{
                  "path":{"type":"string","description":"caminho relativo ao sandbox"}
                },"required":["path"]}
                """));
        arr.add(ToolDefs.fn("file_write",
                "Escreve conteúdo em um arquivo no diretório de trabalho (sandbox).",
                """
                {"type":"object","properties":{
                  "path":{"type":"string"},
                  "content":{"type":"string"}
                },"required":["path","content"]}
                """));
        arr.add(ToolDefs.fn("file_list",
                "Lista arquivos no diretório de trabalho (sandbox).",
                """
                {"type":"object","properties":{}}
                """));
        return arr;
    }

    @Override public boolean handles(String fn) {
        return "file_read".equals(fn) || "file_write".equals(fn) || "file_list".equals(fn);
    }

    @Override public String execute(String fn, JsonNode args) throws Exception {
        switch (fn) {
            case "file_read" -> {
                Path p = resolve(args.path("path").asText());
                return Files.readString(p);
            }
            case "file_write" -> {
                Path p = resolve(args.path("path").asText());
                Files.createDirectories(p.getParent() == null ? sandbox : p.getParent());
                Files.writeString(p, args.path("content").asText());
                return "Escrito: " + sandbox.relativize(p);
            }
            case "file_list" -> {
                StringBuilder sb = new StringBuilder();
                try (var stream = Files.walk(sandbox, 3)) {
                    stream.filter(Files::isRegularFile)
                          .forEach(f -> sb.append(sandbox.relativize(f)).append("\n"));
                }
                return sb.isEmpty() ? "(vazio)" : sb.toString();
            }
            default -> throw new IllegalArgumentException("função desconhecida: " + fn);
        }
    }

    private Path resolve(String rel) {
        Path p = sandbox.resolve(rel).toAbsolutePath().normalize();
        if (!p.startsWith(sandbox)) throw new SecurityException("path fora do sandbox: " + rel);
        return p;
    }
}
