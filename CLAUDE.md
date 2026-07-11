# Agents Pool

Painel de controle para agentes de IA. React 18 + Vite + TypeScript + Tailwind (frontend), Spring Boot 3 + Java 21 (backend).

## Stack
- Backend: porta 8081 (a 8080 é ocupada pelo MTAgentService do Windows), profile `dev` usa H2 em arquivo
- Frontend: porta 5290, proxy `/api` → `localhost:8081`
- LLM: qualquer endpoint OpenAI-compatible (OpenRouter ou local — Ollama, LM Studio, vLLM)

## Rodar em dev
```bash
# Backend
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Frontend
cd frontend && npm run dev
```

## Estrutura chave
- `backend/src/main/java/com/hrb/agentspool/`
  - `agent/` — CRUD de AgentConfig
  - `run/` — execução de runs + SSE streaming (RunService, RunController)
  - `tools/` — ToolExecutor (interface), HttpTool, FileTool, CodeTool, BrowserTool
  - `llm/` — LlmClient (java.net.http, OpenAI-compatible chat/completions)
- `frontend/src/`
  - `pages/` — Dashboard, AgentBuilder, AgentRunner, Settings
  - `components/` — AgentCard, MessageStream, ThinkingAnimation, ToolCallCard
  - `stores/` — Zustand: agentStore, configStore, runStore

## Padrões
- SSE para streaming (`SseEmitter` no backend, `EventSource` no frontend)
- Fluxo de run: `POST /api/runs/start` (body inclui apiKey) → retorna runId → `GET /api/runs/{id}/stream` inicia a execução e emite eventos SSE (`assistant`, `tool_call`, `tool_result`, `done`, `error`)
- Tool calls: `finish_reason === "tool_calls"` → executa tool → adiciona mensagem `tool` → repete loop
- API key fica no localStorage do frontend, enviada no body do start (nunca persistida no DB)
- Sandbox de arquivos: `app.sandbox-dir` em `application.yml`
- Playwright: singleton lazy, 1 browser compartilhado

## Segurança
- Code execution usa `ProcessBuilder` com timeout 30s
- FileTool restrito ao diretório sandbox (rejeita path traversal)
- Sem autenticação própria (single-user local); adicionar se necessário
