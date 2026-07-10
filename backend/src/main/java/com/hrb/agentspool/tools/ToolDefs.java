package com.hrb.agentspool.tools;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

/** Helper para montar tool definitions no formato OpenAI a partir de JSON de parâmetros. */
final class ToolDefs {
    static final ObjectMapper M = new ObjectMapper();

    private ToolDefs() {}

    /** paramsJson é o schema JSON do objeto de parâmetros (properties + required). */
    static ObjectNode fn(String name, String description, String paramsJson) {
        try {
            ObjectNode tool = M.createObjectNode();
            tool.put("type", "function");
            ObjectNode fn = tool.putObject("function");
            fn.put("name", name);
            fn.put("description", description);
            fn.set("parameters", M.readTree(paramsJson));
            return tool;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
