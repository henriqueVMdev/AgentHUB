package com.hrb.agentspool.operation;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class OperationMemory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long operationId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private String category = "FACT"; // FACT | DECISION | LEARNING
    private String status = "ACTIVE"; // ACTIVE | PENDING (aguardando aprovação humana)
    private Boolean pinned = false;   // pinned entra sempre no prompt, mesmo além do limite
    private Long createdByAgentId;    // null = criada manualmente na UI
    private Long createdByRunId;

    // vetor de embedding serializado como JSON; null = ainda não indexada ou endpoint indisponível
    @Column(columnDefinition = "TEXT")
    private String embeddingJson;
    private String embeddingModel; // trocar de modelo invalida o vetor → reindexa no próximo uso

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

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOperationId() { return operationId; }
    public void setOperationId(Long operationId) { this.operationId = operationId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getCategory() { return category == null || category.isBlank() ? "FACT" : category; }
    public void setCategory(String category) { this.category = category; }
    public String getStatus() { return status == null || status.isBlank() ? "ACTIVE" : status; }
    public void setStatus(String status) { this.status = status; }
    @JsonIgnore
    public String getEmbeddingJson() { return embeddingJson; }
    public void setEmbeddingJson(String embeddingJson) { this.embeddingJson = embeddingJson; }
    @JsonIgnore
    public String getEmbeddingModel() { return embeddingModel; }
    public void setEmbeddingModel(String embeddingModel) { this.embeddingModel = embeddingModel; }
    public Boolean getPinned() { return Boolean.TRUE.equals(pinned); }
    public void setPinned(Boolean pinned) { this.pinned = pinned; }
    public Long getCreatedByAgentId() { return createdByAgentId; }
    public void setCreatedByAgentId(Long createdByAgentId) { this.createdByAgentId = createdByAgentId; }
    public Long getCreatedByRunId() { return createdByRunId; }
    public void setCreatedByRunId(Long createdByRunId) { this.createdByRunId = createdByRunId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
