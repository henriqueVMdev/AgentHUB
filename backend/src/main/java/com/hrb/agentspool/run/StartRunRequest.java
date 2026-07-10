package com.hrb.agentspool.run;

public class StartRunRequest {
    public Long agentId;
    public String prompt;
    public String apiKey;   // não persistido — usado apenas para a chamada LLM

    public Long getAgentId() { return agentId; }
    public void setAgentId(Long agentId) { this.agentId = agentId; }
    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
}
