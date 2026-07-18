package com.hrb.agentspool.operation;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Operation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;

    // briefing entra no system prompt de todo run vinculado à operação
    @Column(columnDefinition = "TEXT")
    private String briefing;

    private String status = "ACTIVE"; // ACTIVE | ARCHIVED
    private String emoji = "🎯";
    private String color = "#f59e0b";

    @ElementCollection(fetch = FetchType.EAGER)
    private List<Long> memberAgentIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    private List<Long> skillIds = new ArrayList<>();

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
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getBriefing() { return briefing; }
    public void setBriefing(String briefing) { this.briefing = briefing; }
    public String getStatus() { return status == null || status.isBlank() ? "ACTIVE" : status; }
    public void setStatus(String status) { this.status = status; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public List<Long> getMemberAgentIds() { return memberAgentIds; }
    public void setMemberAgentIds(List<Long> memberAgentIds) { this.memberAgentIds = memberAgentIds; }
    public List<Long> getSkillIds() { return skillIds; }
    public void setSkillIds(List<Long> skillIds) { this.skillIds = skillIds; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
