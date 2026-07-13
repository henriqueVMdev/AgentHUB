package com.hrb.agentspool.run;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class AgentRun {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long agentId;
    private String status; // RUNNING | DONE | ERROR

    @Column(columnDefinition = "TEXT")
    private String inputPrompt;

    @Column(columnDefinition = "TEXT")
    private String messagesJson;

    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    // usage acumulado de todas as chamadas LLM do run; costUsd só quando o provider informa (OpenRouter)
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private Double costUsd;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getAgentId() { return agentId; }
    public void setAgentId(Long agentId) { this.agentId = agentId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getInputPrompt() { return inputPrompt; }
    public void setInputPrompt(String inputPrompt) { this.inputPrompt = inputPrompt; }
    public String getMessagesJson() { return messagesJson; }
    public void setMessagesJson(String messagesJson) { this.messagesJson = messagesJson; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public LocalDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(LocalDateTime endedAt) { this.endedAt = endedAt; }
    public Integer getPromptTokens() { return promptTokens; }
    public void setPromptTokens(Integer promptTokens) { this.promptTokens = promptTokens; }
    public Integer getCompletionTokens() { return completionTokens; }
    public void setCompletionTokens(Integer completionTokens) { this.completionTokens = completionTokens; }
    public Integer getTotalTokens() { return totalTokens; }
    public void setTotalTokens(Integer totalTokens) { this.totalTokens = totalTokens; }
    public Double getCostUsd() { return costUsd; }
    public void setCostUsd(Double costUsd) { this.costUsd = costUsd; }
}
