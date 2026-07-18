package com.hrb.agentspool.integration;

import com.hrb.agentspool.run.RunService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Gera um rascunho de resposta (PENDING_APPROVAL) via agente atribuído
 * quando chega mensagem inbound. Executa fora da thread do webhook.
 */
@Service
public class InboxAgentService {
    private final InboxConversationRepository conversations;
    private final InboxMessageRepository messages;
    private final IntegrationRepository integrations;
    private final RunService runService;
    // ponytail: fila serial única basta para single-user; pool se o volume crescer
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public InboxAgentService(InboxConversationRepository conversations, InboxMessageRepository messages,
                             IntegrationRepository integrations, RunService runService) {
        this.conversations = conversations;
        this.messages = messages;
        this.integrations = integrations;
        this.runService = runService;
    }

    public void draftReply(Long conversationId) {
        executor.submit(() -> run(conversationId));
    }

    /** Registra mensagem inbound, reaproveitando a conversa aberta do contato, e agenda o rascunho do agente. */
    public InboxMessage ingest(IntegrationConfig integration, String contactId, String contactName, String text) {
        var conversation = conversations
                .findFirstByIntegrationIdAndExternalContactIdAndStatusNotOrderByUpdatedAtDesc(integration.getId(), contactId, "CLOSED")
                .orElseGet(() -> {
                    var created = new InboxConversation();
                    created.setIntegrationId(integration.getId());
                    created.setExternalContactId(contactId);
                    created.setContactName(contactName);
                    if (!integration.getAgentIds().isEmpty()) created.setAssignedAgentId(integration.getAgentIds().get(0));
                    return conversations.save(created);
                });
        var message = new InboxMessage();
        message.setConversationId(conversation.getId());
        message.setDirection("INBOUND");
        message.setSenderType("CONTACT");
        message.setContent(text);
        message = messages.save(message);
        conversation.setSummary(text.length() > 120 ? text.substring(0, 120) : text);
        conversations.save(conversation);
        draftReply(conversation.getId());
        return message;
    }

    private void run(Long conversationId) {
        var conversation = conversations.findById(conversationId).orElse(null);
        if (conversation == null || conversation.getAssignedAgentId() == null) return;
        var draft = new InboxMessage();
        draft.setConversationId(conversationId);
        draft.setDirection("OUTBOUND");
        draft.setSenderType("AGENT");
        draft.setAgentId(conversation.getAssignedAgentId());
        try {
            List<String[]> turns = new ArrayList<>();
            for (var m : messages.findByConversationIdOrderByCreatedAtAsc(conversationId)) {
                if ("INBOUND".equals(m.getDirection())) turns.add(new String[]{"user", m.getContent()});
                else if ("APPROVED".equals(m.getStatus())) turns.add(new String[]{"assistant", m.getContent()});
            }
            // atendimento roda com o contexto da operação da integração; mensagens de
            // contato são conteúdo externo → memórias gravadas exigem aprovação humana
            Long operationId = integrations.findById(conversation.getIntegrationId())
                    .map(IntegrationConfig::getOperationId).orElse(null);
            String reply = runService.complete(conversation.getAssignedAgentId(), operationId, true, turns);
            if (reply.isBlank()) throw new IllegalStateException("Agente não produziu resposta em texto.");
            draft.setContent(reply);
            draft.setStatus("PENDING_APPROVAL");
        } catch (Exception e) {
            draft.setContent("");
            draft.setStatus("ERROR");
            draft.setErrorMessage(e.getMessage() == null ? e.toString() : e.getMessage());
        }
        messages.save(draft);
    }
}
