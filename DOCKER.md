# Agents Pool com Docker

Todos os requisitos rodam em containers. Nada do Hermes ou OpenClaw precisa ser instalado no Windows.

## 1. Configuração

No PowerShell, a partir da raiz do projeto:

```powershell
Copy-Item .env.docker.example .env
```

Edite `.env` e troque as senhas/tokens. Se os runtimes forem usar o OpenRouter, informe também `OPENROUTER_API_KEY`.

## 2. Aplicação principal

```powershell
docker compose up -d --build
```

Abra `http://localhost:15173`. O backend fica em `http://localhost:18080` e o PostgreSQL permanece somente na rede interna. As portas podem ser alteradas no `.env`.

## 3. Hermes e OpenClaw (opcionais)

Baixe as imagens oficiais:

```powershell
docker compose --profile agents pull hermes openclaw-init openclaw
```

Configure o Hermes uma vez no volume persistente:

```powershell
docker compose --profile agents run --rm hermes setup
```

Configure o provedor/modelo do OpenClaw uma vez:

```powershell
docker compose --profile cli run --rm openclaw-cli onboard --mode local --no-install-daemon
```

Inicie os gateways:

```powershell
docker compose --profile agents up -d
```

O backend acessa os serviços pela rede interna em `hermes:8642` e `openclaw:18789`. As portas publicadas no host são vinculadas somente a `127.0.0.1`.

## Diagnóstico

```powershell
docker compose ps
docker compose logs -f backend
docker compose --profile agents logs -f hermes openclaw
```

## Parar

```powershell
docker compose --profile agents down
```

Os dados continuam nos volumes nomeados. Para apagá-los explicitamente, use `docker compose down -v`.
