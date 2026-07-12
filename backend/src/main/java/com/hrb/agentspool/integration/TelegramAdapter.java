package com.hrb.agentspool.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Adaptador Telegram: webhook de entrada, registro do webhook (setWebhook)
 * e worker que entrega mensagens APPROVED via sendMessage.
 * O bot token fica no campo secret da integração (provider "telegram").
 */
@RestController
public class TelegramAdapter {
    private final IntegrationRepository integrations;
    private final InboxConversationRepository conversations;
    private final InboxMessageRepository messages;
    private final InboxAgentService inbox;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper mapper = new ObjectMapper();

    public TelegramAdapter(IntegrationRepository integrations, InboxConversationRepository conversations,
                           InboxMessageRepository messages, InboxAgentService inbox) {
        this.integrations = integrations;
        this.conversations = conversations;
        this.messages = messages;
        this.inbox = inbox;
    }

    /** Recebe updates do Telegram. Valida o secret token derivado do bot token. */
    @PostMapping("/api/inbox/telegram/{integrationId}")
    public ResponseEntity<?> webhook(@PathVariable Long integrationId,
                                     @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secretHeader,
                                     @RequestBody JsonNode update) {
        var integration = integrations.findById(integrationId).orElse(null);
        if (integration == null) return ResponseEntity.notFound().build();
        String token = integration.getSecret();
        if (token == null || token.isBlank() || !secretToken(token).equals(secretHeader)) {
            return ResponseEntity.status(403).body(Map.of("ok", false));
        }
        // 200 mesmo quando ignorado, senão o Telegram reenvia o update para sempre
        if (!integration.getEnabled()) return ResponseEntity.ok(Map.of("ok", true));
        JsonNode message = update.path("message");
        String text = message.path("text").asText("");
        if (text.isBlank() || message.path("chat").path("id").isMissingNode()) {
            return ResponseEntity.ok(Map.of("ok", true)); // ponytail: só texto; anexos/edições quando precisar
        }
        String chatId = message.path("chat").path("id").asText();
        String name = (message.path("from").path("first_name").asText("") + " "
                + message.path("from").path("last_name").asText("")).trim();
        inbox.ingest(integration, chatId, name.isBlank() ? chatId : name, text);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    /** Registra o webhook no Telegram apontando para {url}/api/inbox/telegram/{id}. */
    @PostMapping("/api/integrations/{id}/telegram/register")
    public ResponseEntity<?> register(@PathVariable Long id, @RequestBody Map<String, String> body) {
        var integration = integrations.findById(id).orElseThrow();
        String token = integration.getSecret();
        String publicUrl = body.getOrDefault("url", "").trim();
        if (token == null || token.isBlank() || publicUrl.isBlank() || !publicUrl.startsWith("https://")) {
            return ResponseEntity.badRequest().body(Map.of("ok", false,
                    "message", "Configure o bot token na integração e informe a URL pública HTTPS."));
        }
        String hookUrl = publicUrl.replaceAll("/+$", "") + "/api/inbox/telegram/" + id;
        JsonNode result = api(token, "setWebhook",
                mapper.createObjectNode().put("url", hookUrl).put("secret_token", secretToken(token)));
        return ResponseEntity.ok(result);
    }

    /** Entrega mensagens aprovadas de integrações Telegram. */
    @Scheduled(fixedDelay = 5000)
    public void deliverApproved() {
        for (var message : messages.findByDirectionAndStatus("OUTBOUND", "APPROVED")) {
            var conversation = conversations.findById(message.getConversationId()).orElse(null);
            var integration = conversation == null ? null
                    : integrations.findById(conversation.getIntegrationId()).orElse(null);
            if (integration == null || !"telegram".equals(integration.getProvider())) continue;
            try {
                JsonNode result = api(integration.getSecret(), "sendMessage", mapper.createObjectNode()
                        .put("chat_id", conversation.getExternalContactId())
                        .put("text", message.getContent()));
                if (!result.path("ok").asBoolean()) {
                    throw new IllegalStateException(result.path("description").asText("Telegram recusou a mensagem"));
                }
                message.setStatus("SENT");
            } catch (Exception e) {
                // ponytail: SEND_ERROR é terminal; retry com backoff quando houver volume
                message.setStatus("SEND_ERROR");
                message.setErrorMessage(e.getMessage() == null ? e.toString() : e.getMessage());
            }
            messages.save(message);
        }
    }

    private JsonNode api(String token, String method, ObjectNode payload) {
        try {
            var request = HttpRequest.newBuilder(URI.create("https://api.telegram.org/bot" + token + "/" + method))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                    .build();
            return mapper.readTree(http.send(request, HttpResponse.BodyHandlers.ofString()).body());
        } catch (Exception e) {
            throw new RuntimeException("Falha ao chamar a API do Telegram: " + e.getMessage(), e);
        }
    }

    /**
     * secret_token do webhook derivado do bot token (parte após os dois-pontos),
     * já que o token completo contém ':' — caractere proibido pelo Telegram.
     */
    static String secretToken(String botToken) {
        int colon = botToken.indexOf(':');
        return colon < 0 ? botToken : botToken.substring(colon + 1);
    }
}
