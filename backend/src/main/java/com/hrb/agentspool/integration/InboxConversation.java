package com.hrb.agentspool.integration;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class InboxConversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long integrationId;
    private Long assignedAgentId;
    private String externalContactId;
    private String contactName;
    private String status = "OPEN";
    private String priority = "NORMAL";
    @Column(columnDefinition = "TEXT") private String summary;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @PrePersist void create() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void update() { updatedAt = LocalDateTime.now(); }
    public Long getId(){return id;} public Long getIntegrationId(){return integrationId;} public void setIntegrationId(Long v){integrationId=v;}
    public Long getAssignedAgentId(){return assignedAgentId;} public void setAssignedAgentId(Long v){assignedAgentId=v;}
    public String getExternalContactId(){return externalContactId;} public void setExternalContactId(String v){externalContactId=v;}
    public String getContactName(){return contactName;} public void setContactName(String v){contactName=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;} public String getPriority(){return priority;} public void setPriority(String v){priority=v;}
    public String getSummary(){return summary;} public void setSummary(String v){summary=v;} public LocalDateTime getCreatedAt(){return createdAt;} public LocalDateTime getUpdatedAt(){return updatedAt;}
}
