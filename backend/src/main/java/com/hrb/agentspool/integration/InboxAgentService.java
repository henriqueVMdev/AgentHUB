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
    private final RunService runService;
    // ponytail: fila serial única basta para single-user; pool se o volume crescer
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public InboxAgentService(InboxConversationRepository conversations, InboxMessageRepository messages,
                             RunService runService) {
        this.conversations = conversations;
        this.messages = messages;
        this.runService = runService;
    }

    public void draftReply(Long conversationId) {
        executor.submit(() -> run(conversationId));
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
            String reply = runService.complete(conversation.getAssignedAgentId(), turns);
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
