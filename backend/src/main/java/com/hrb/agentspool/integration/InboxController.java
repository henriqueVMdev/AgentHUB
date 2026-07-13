package com.hrb.agentspool.integration;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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
 // secret da integração obrigatório: sem ele o endpoint seria uma porta aberta ao expor publicamente
 @PostMapping("/webhook/{integrationId}") public ResponseEntity<?> webhook(@PathVariable Long integrationId,@RequestHeader(value="X-Webhook-Secret",required=false) String secret,@RequestBody Map<String,Object> body){var i=integrations.findById(integrationId).orElseThrow();if(i.getSecret()==null||i.getSecret().isBlank())return ResponseEntity.status(401).body(Map.of("error","configure um secret na integração antes de usar o webhook"));if(secret==null||!MessageDigest.isEqual(i.getSecret().getBytes(StandardCharsets.UTF_8),secret.getBytes(StandardCharsets.UTF_8)))return ResponseEntity.status(403).body(Map.of("error","secret inválido"));if(!i.getEnabled())return ResponseEntity.status(409).body(Map.of("error","integration disabled"));String external=String.valueOf(body.getOrDefault("contactId",body.getOrDefault("from","anonymous")));String text=String.valueOf(body.getOrDefault("text",body.getOrDefault("message","")));var m=agentService.ingest(i,external,String.valueOf(body.getOrDefault("contactName",external)),text);return ResponseEntity.accepted().body(Map.of("conversationId",m.getConversationId(),"messageId",m.getId()));}
 @PostMapping("/integrations/{id}/test") public ResponseEntity<?> test(@PathVariable Long id){var i=integrations.findById(id).orElseThrow();if(i.getEndpointUrl()==null||i.getEndpointUrl().isBlank())return ResponseEntity.badRequest().body(Map.of("ok",false,"message","Endpoint não configurado"));try{var uri=URI.create(i.getEndpointUrl());if(!List.of("http","https").contains(uri.getScheme()))return ResponseEntity.badRequest().body(Map.of("ok",false,"message","Somente endpoints HTTP/HTTPS podem ser testados"));if(uri.getHost()==null||isPrivateAddress(uri.getHost()))return ResponseEntity.badRequest().body(Map.of("ok",false,"message","Endereços privados, locais ou não resolvíveis não podem ser testados"));var r=http.send(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(8)).method("HEAD",HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.discarding());return ResponseEntity.ok(Map.of("ok",r.statusCode()<500,"status",r.statusCode()));}catch(Exception e){return ResponseEntity.ok(Map.of("ok",false,"message",e.getMessage()==null?e.toString():e.getMessage()));}}

 /**
  * Bloqueia SSRF: loopback, link-local (inclui metadados de nuvem 169.254.169.254),
  * site-local (RFC 1918), multicast e IPv6 ULA. Host não resolvível também é bloqueado.
  * ponytail: resolve DNS uma vez (TOCTOU/rebinding fora do escopo single-user local);
  * o HttpClient não segue redirects (política padrão NEVER), então não há bypass por 302.
  */
 private static boolean isPrivateAddress(String host){
  try{
   for(InetAddress a:InetAddress.getAllByName(host)){
    byte[] raw=a.getAddress();
    if(a.isAnyLocalAddress()||a.isLoopbackAddress()||a.isLinkLocalAddress()||a.isSiteLocalAddress()||a.isMulticastAddress()||(raw.length==16&&(raw[0]&0xfe)==0xfc))return true;
   }
   return false;
  }catch(Exception e){return true;}
 }
}
