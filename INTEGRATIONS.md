# Integrações e caixa de entrada

## O que já está implementado

- Cadastro persistente de conexões para Telegram, e-mail, WhatsApp Business, Slack, Discord, Teams, webhook e APIs personalizadas.
- Vínculo de um ou vários agentes por conexão; o primeiro agente é usado como atribuição inicial.
- Segredos aceitos somente na escrita e omitidos das respostas da API.
- Teste de disponibilidade de endpoints HTTP/HTTPS pela página de integrações.
- Caixa de entrada unificada com filtro por estado, prioridade, agente responsável e histórico por contato.
- Entrada genérica por webhook, com reaproveitamento da conversa aberta do mesmo contato.
- Respostas de operador salvas como `PENDING_APPROVAL`, com aprovação e rejeição explícitas.
- Registro persistente do estado das mensagens (`RECEIVED`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SENT`, `SEND_ERROR`, `ERROR`).
- Execução automática do agente atribuído a cada mensagem inbound, gerando rascunho `PENDING_APPROVAL` (falhas ficam registradas como mensagem `ERROR`).
- Adaptador Telegram completo: webhook de entrada com validação de secret token, registro do webhook (`setWebhook`) pela página de integrações e worker que entrega mensagens `APPROVED` via `sendMessage`.

## Webhook genérico disponível

Envie `POST /api/inbox/webhook/{integrationId}` com JSON:

```json
{
  "contactId": "cliente-123",
  "contactName": "Maria",
  "text": "Preciso de ajuda com meu pedido"
}
```

Também são aceitos `from` no lugar de `contactId` e `message` no lugar de `text`. A resposta contém `conversationId` e `messageId`.

## O que ainda falta para produção

O núcleo não envia automaticamente mensagens aprovadas para provedores externos. Cada adaptador precisa transformar eventos e respostas no formato específico do provedor, validar assinaturas e atualizar o status de entrega.

### Telegram (implementado)

1. Criar o bot no BotFather e obter o token.
2. Criar a integração com provider Telegram e colar o token no campo de credencial secreta.
3. Expor o AgentHUB em uma URL HTTPS pública (ex.: ngrok) e clicar em "webhook" no card da integração informando essa URL — o AgentHUB chama `setWebhook` com secret token derivado do bot token.
4. Pronto: mensagens do bot entram no inbox, o agente gera rascunho e mensagens aprovadas são enviadas pelo worker (status `SENT`/`SEND_ERROR`). Somente mensagens de texto por enquanto.

### E-mail

1. Informar host, porta e TLS separados para IMAP e SMTP.
2. Usar app password ou OAuth 2.0 do provedor.
3. Implementar worker IMAP com deduplicação por `Message-ID` e envio SMTP.
4. Definir regras para anexos, remetentes permitidos e aprovação obrigatória.

### WhatsApp Business

1. Criar aplicativo na Meta, configurar WABA e phone number ID.
2. Obter access token permanente e verify token.
3. Configurar webhook HTTPS e validação `hub.challenge`/assinatura.
4. Implementar envio pela Graph API, templates e controle da janela de 24 horas.

### Slack

1. Criar Slack App com bot token e signing secret.
2. Configurar Event Subscriptions e scopes mínimos.
3. Validar assinatura e timestamp; responder ao challenge.
4. Mapear threads e canais para contatos/conversas e enviar por `chat.postMessage`.

### Discord

1. Criar aplicação/bot e habilitar intents necessários.
2. Escolher gateway WebSocket ou interactions/webhook.
3. Validar assinaturas e mapear guild/channel/thread.
4. Implementar envio de mensagens e anexos.

### Microsoft Teams

1. Registrar aplicativo no Microsoft Entra ID ou criar bot no Azure Bot Service.
2. Configurar tenant, client ID, client secret e redirect/webhook HTTPS.
3. Validar tokens Microsoft e mapear conversation references.
4. Enviar mensagens pelo Bot Framework/Graph conforme o tipo escolhido.

## Segurança antes de exposição pública

- Criptografar segredos em repouso com uma chave externa ao banco (KMS/Vault ou `INTEGRATION_ENCRYPTION_KEY`).
- Adicionar autenticação e autorização à interface e API.
- Validar assinatura de cada provedor e aplicar rate limiting aos webhooks.
- Restringir o teste de endpoints para impedir SSRF contra redes locais/metadados de nuvem.
- Criar política de retenção, exportação e exclusão de dados pessoais.
- Implementar fila durável, idempotência, retentativas com backoff e dead-letter queue.

## Próximas etapas recomendadas

1. Adaptador Telegram completo como referência.
2. Worker de saída que envia somente mensagens `APPROVED` e registra entrega/erro.
3. Execução automática do agente atribuído e geração de rascunho para aprovação.
4. Criptografia de credenciais e autenticação do painel.
5. Anexos, transcrição de áudio, métricas de custo e automações agendadas.
