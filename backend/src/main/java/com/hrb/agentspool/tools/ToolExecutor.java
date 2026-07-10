package com.hrb.agentspool.tools;

import com.fasterxml.jackson.databind.JsonNode;

public interface ToolExecutor {
    /** Nome do grupo (deve casar com enabledTools do AgentConfig): http, file, code, browser */
    String group();

    /** Tool definitions no formato OpenAI (uma tool pode expor várias functions) */
    JsonNode definitions();

    /** true se este executor trata a function com esse nome */
    boolean handles(String functionName);

    String execute(String functionName, JsonNode args) throws Exception;
}
