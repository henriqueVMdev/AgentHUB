package com.hrb.agentspool.integration;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class InboxMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Long conversationId;
    private String direction;
    private String senderType;
    private Long agentId;
    private String status = "RECEIVED";
    @Column(columnDefinition = "TEXT") private String content;
    @Column(columnDefinition = "TEXT") private String errorMessage;
    private LocalDateTime createdAt;
    @PrePersist void create(){createdAt=LocalDateTime.now();}
    public Long getId(){return id;} public Long getConversationId(){return conversationId;} public void setConversationId(Long v){conversationId=v;}
    public String getDirection(){return direction;} public void setDirection(String v){direction=v;} public String getSenderType(){return senderType;} public void setSenderType(String v){senderType=v;}
    public Long getAgentId(){return agentId;} public void setAgentId(Long v){agentId=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getContent(){return content;} public void setContent(String v){content=v;} public String getErrorMessage(){return errorMessage;} public void setErrorMessage(String v){errorMessage=v;} public LocalDateTime getCreatedAt(){return createdAt;}
}
