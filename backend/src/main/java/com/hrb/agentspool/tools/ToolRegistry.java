package com.hrb.agentspool.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ToolRegistry {
    private final List<ToolExecutor> executors;
    private final ObjectMapper mapper = new ObjectMapper();

    public ToolRegistry(List<ToolExecutor> executors) {
        this.executors = executors;
    }

    /** Junta as definitions dos grupos habilitados num único array (formato OpenAI). */
    public ArrayNode definitionsFor(List<String> enabledGroups) {
        ArrayNode all = mapper.createArrayNode();
        for (ToolExecutor ex : executors) {
            if (enabledGroups.contains(ex.group())) {
                ex.definitions().forEach(all::add);
            }
        }
        return all;
    }

    /** Executa a function chamada pelo LLM. Nunca lança — erros viram string. */
    public String execute(String functionName, JsonNode args) {
        for (ToolExecutor ex : executors) {
            if (ex.handles(functionName)) {
                try {
                    return ex.execute(functionName, args);
                } catch (Exception e) {
                    return "ERRO ao executar " + functionName + ": " + e.getMessage();
                }
            }
        }
        return "ERRO: nenhuma tool trata a função '" + functionName + "'";
    }
}
