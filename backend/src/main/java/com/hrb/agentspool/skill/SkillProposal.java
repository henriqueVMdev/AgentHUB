package com.hrb.agentspool.skill;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class SkillProposal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String action = "CREATE";
    private Long targetSkillId;
    private Long sourceAgentId;
    private Long sourceRunId;
    private String name;
    private String description;
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
    private String rationale;
    private String status = "PENDING";
    private LocalDateTime createdAt;
    private LocalDateTime reviewedAt;

    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public Long getTargetSkillId() { return targetSkillId; }
    public void setTargetSkillId(Long targetSkillId) { this.targetSkillId = targetSkillId; }
    public Long getSourceAgentId() { return sourceAgentId; }
    public void setSourceAgentId(Long sourceAgentId) { this.sourceAgentId = sourceAgentId; }
    public Long getSourceRunId() { return sourceRunId; }
    public void setSourceRunId(Long sourceRunId) { this.sourceRunId = sourceRunId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getRationale() { return rationale; }
    public void setRationale(String rationale) { this.rationale = rationale; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
