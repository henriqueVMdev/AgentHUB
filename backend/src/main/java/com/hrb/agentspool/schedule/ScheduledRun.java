package com.hrb.agentspool.schedule;

import jakarta.persistence.*;
import org.springframework.scheduling.support.CronExpression;

import java.time.LocalDateTime;

@Entity
public class ScheduledRun {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Long agentId;
    private Long operationId; // opcional: run roda com briefing/skills/memórias da operação

    @Column(columnDefinition = "TEXT")
    private String prompt;

    // cron de 6 campos do Spring (seg min hora dia mês dia-da-semana)
    private String cronExpression;
    private Boolean enabled = true;

    private LocalDateTime lastRunAt;
    private Long lastRunId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /** Próximo disparo calculado do cron (não persistido); null se o cron for inválido ou a rotina estiver desligada. */
    @Transient
    public LocalDateTime getNextRunAt() {
        if (!getEnabled() || cronExpression == null || cronExpression.isBlank()) return null;
        try {
            return CronExpression.parse(cronExpression).next(lastRunAt == null ? LocalDateTime.now() : lastRunAt);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getAgentId() { return agentId; }
    public void setAgentId(Long agentId) { this.agentId = agentId; }
    public Long getOperationId() { return operationId; }
    public void setOperationId(Long operationId) { this.operationId = operationId; }
    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }
    public String getCronExpression() { return cronExpression; }
    public void setCronExpression(String cronExpression) { this.cronExpression = cronExpression; }
    public Boolean getEnabled() { return !Boolean.FALSE.equals(enabled); }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public LocalDateTime getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(LocalDateTime lastRunAt) { this.lastRunAt = lastRunAt; }
    public Long getLastRunId() { return lastRunId; }
    public void setLastRunId(Long lastRunId) { this.lastRunId = lastRunId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
