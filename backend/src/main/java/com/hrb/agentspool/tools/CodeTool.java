package com.hrb.agentspool.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/** Executa código Python/shell via ProcessBuilder, com timeout de 30s. */
@Component
public class CodeTool implements ToolExecutor {
    private final Path sandbox;
    private final boolean windows = System.getProperty("os.name").toLowerCase().contains("win");

    public CodeTool(@Value("${app.sandbox-dir}") String sandboxDir) throws IOException {
        this.sandbox = Path.of(sandboxDir).toAbsolutePath().normalize();
        Files.createDirectories(this.sandbox);
    }

    @Override public String group() { return "code"; }

    @Override public JsonNode definitions() {
        ArrayNode arr = ToolDefs.M.createArrayNode();
        arr.add(ToolDefs.fn("run_code",
                "Executa um script e retorna stdout+stderr. Timeout de 30s.",
                """
                {"type":"object","properties":{
                  "language":{"type":"string","enum":["python","shell"]},
                  "code":{"type":"string"}
                },"required":["language","code"]}
                """));
        return arr;
    }

    @Override public boolean handles(String fn) { return "run_code".equals(fn); }

    @Override public String execute(String fn, JsonNode args) throws Exception {
        String lang = args.path("language").asText("python");
        String code = args.path("code").asText();

        ProcessBuilder pb;
        if ("python".equals(lang)) {
            Path script = Files.createTempFile(sandbox, "run", ".py");
            Files.writeString(script, code);
            pb = new ProcessBuilder(windows ? "python" : "python3", script.toString());
        } else {
            pb = windows
                    ? new ProcessBuilder("powershell", "-NoProfile", "-Command", code)
                    : new ProcessBuilder("bash", "-c", code);
        }
        pb.directory(sandbox.toFile());
        pb.redirectErrorStream(true);

        Process proc = pb.start();
        String output = new String(proc.getInputStream().readAllBytes());
        boolean done = proc.waitFor(30, TimeUnit.SECONDS);
        if (!done) {
            proc.destroyForcibly();
            return output + "\n[timeout de 30s excedido — processo encerrado]";
        }
        if (output.length() > 8000) output = output.substring(0, 8000) + "\n...[truncado]";
        return "exit=" + proc.exitValue() + "\n" + output;
    }
}
