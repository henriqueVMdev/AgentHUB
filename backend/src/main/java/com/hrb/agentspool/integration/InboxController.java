package com.hrb.agentspool.integration;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

@RestController
@RequestMapping("/api/inbox")
public class InboxController {
 private final InboxConversationRepository conversations; private final InboxMessageRepository messages; private final IntegrationRepository integrations; private final InboxAgentService agentService;
 private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
 public InboxController(InboxConversationRepository c,InboxMessageRepository m,IntegrationRepository i,InboxAgentService a){conversations=c;messages=m;integrations=i;agentService=a;}
 @GetMapping public List<InboxConversation> list(){return conversations.findAllByOrderByUpdatedAtDesc();}
 @GetMapping("/{id}/messages") public List<InboxMessage> messages(@PathVariable Long id){return messages.findByConversationIdOrderByCreatedAtAsc(id);}
 @PatchMapping("/{id}") public InboxConversation patch(@PathVariable Long id,@RequestBody Map<String,Object> body){var c=conversations.findById(id).orElseThrow(); if(body.containsKey("status"))c.setStatus(String.valueOf(body.get("status")));if(body.containsKey("priority"))c.setPriority(String.valueOf(body.get("priority")));if(body.containsKey("assignedAgentId"))c.setAssignedAgentId(Long.valueOf(String.valueOf(body.get("assignedAgentId"))));return conversations.save(c);}
 @PostMapping("/{id}/messages") public InboxMessage reply(@PathVariable Long id,@RequestBody Map<String,String> body){var c=conversations.findById(id).orElseThrow();var m=new InboxMessage();m.setConversationId(id);m.setDirection("OUTBOUND");m.setSenderType(body.getOrDefault("senderType","HUMAN"));m.setAgentId(c.getAssignedAgentId());m.setContent(body.getOrDefault("content",""));m.setStatus("PENDING_APPROVAL");return messages.save(m);}
 @PostMapping("/messages/{id}/approve") public InboxMessage approve(@PathVariable Long id){var m=messages.findById(id).orElseThrow();m.setStatus("APPROVED");return messages.save(m);}
 @PostMapping("/messages/{id}/reject") public InboxMessage reject(@PathVariable Long id){var m=messages.findById(id).orElseThrow();m.setStatus("REJECTED");return messages.save(m);}
 @PostMapping("/webhook/{integrationId}") public ResponseEntity<?> webhook(@PathVariable Long integrationId,@RequestBody Map<String,Object> body){var i=integrations.findById(integrationId).orElseThrow();if(!i.getEnabled())return ResponseEntity.status(409).body(Map.of("error","integration disabled"));String external=String.valueOf(body.getOrDefault("contactId",body.getOrDefault("from","anonymous")));var c=conversations.findFirstByIntegrationIdAndExternalContactIdAndStatusNotOrderByUpdatedAtDesc(integrationId,external,"CLOSED").orElseGet(()->{var n=new InboxConversation();n.setIntegrationId(integrationId);n.setExternalContactId(external);n.setContactName(String.valueOf(body.getOrDefault("contactName",external)));if(!i.getAgentIds().isEmpty())n.setAssignedAgentId(i.getAgentIds().get(0));return conversations.save(n);});var m=new InboxMessage();m.setConversationId(c.getId());m.setDirection("INBOUND");m.setSenderType("CONTACT");m.setContent(String.valueOf(body.getOrDefault("text",body.getOrDefault("message",""))));messages.save(m);c.setSummary(m.getContent().length()>120?m.getContent().substring(0,120):m.getContent());conversations.save(c);agentService.draftReply(c.getId());return ResponseEntity.accepted().body(Map.of("conversationId",c.getId(),"messageId",m.getId()));}
 @PostMapping("/integrations/{id}/test") public ResponseEntity<?> test(@PathVariable Long id){var i=integrations.findById(id).orElseThrow();if(i.getEndpointUrl()==null||i.getEndpointUrl().isBlank())return ResponseEntity.badRequest().body(Map.of("ok",false,"message","Endpoint não configurado"));try{var uri=URI.create(i.getEndpointUrl());if(!List.of("http","https").contains(uri.getScheme()))return ResponseEntity.badRequest().body(Map.of("ok",false,"message","Somente endpoints HTTP/HTTPS podem ser testados"));var r=http.send(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(8)).method("HEAD",HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.discarding());return ResponseEntity.ok(Map.of("ok",r.statusCode()<500,"status",r.statusCode()));}catch(Exception e){return ResponseEntity.ok(Map.of("ok",false,"message",e.getMessage()==null?e.toString():e.getMessage()));}}
}
