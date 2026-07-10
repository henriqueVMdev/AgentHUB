# AgentHUB — Agents Pool

Painel local para criar, configurar e executar agentes de inteligência artificial em uma interface única. O projeto permite gerenciar agentes, modelos e skills, acompanhar execuções em tempo real e habilitar ferramentas como acesso HTTP, arquivos, execução de código e automação de navegador.

O AgentHUB aceita APIs compatíveis com o padrão OpenAI, incluindo OpenRouter e servidores locais, e também oferece integração opcional com os runtimes Hermes Agent e OpenClaw.

## Principais recursos

- Criação e edição de agentes com prompt de sistema, modelo e temperatura próprios;
- seleção de provedores e modelos compatíveis com a API OpenAI;
- execução com respostas transmitidas em tempo real via SSE;
- histórico de execuções;
- gerenciamento de skills reutilizáveis;
- colaboração entre agentes;
- ferramentas de HTTP, arquivos, código e navegador;
- sandbox persistente para manipulação segura de arquivos;
- suporte opcional aos gateways Hermes Agent e OpenClaw;
- persistência dos dados em PostgreSQL.
- gerenciamento de credenciais pela tela de configurações, com aplicação imediata em novas execuções.

## Arquitetura

| Serviço | Tecnologia | Função | Porta padrão |
| --- | --- | --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS e Nginx | Interface web e proxy para a API | `15173` |
| Backend | Java 21 e Spring Boot 3 | API, execução dos agentes, SSE e ferramentas | `18080` |
| Banco de dados | PostgreSQL 16 | Persistência de agentes, skills e execuções | somente rede interna |
| Hermes | Hermes Agent | Runtime opcional de agentes | `8642` |
| OpenClaw | OpenClaw | Runtime opcional de agentes | `18789` |

As portas publicadas pelo Docker são vinculadas a `127.0.0.1`, portanto os serviços ficam acessíveis apenas no computador local por padrão.

## Pré-requisitos

Para executar a aplicação em containers, instale:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) no Windows ou macOS; ou Docker Engine com o plugin Docker Compose no Linux;
- Git, caso o projeto ainda precise ser clonado;
- pelo menos 4 GB de memória disponíveis para o Docker. Para usar Hermes e OpenClaw simultaneamente, recomenda-se disponibilizar mais recursos.

Verifique a instalação:

```bash
docker --version
docker compose version
```

## Executando com Docker

### 1. Obtenha o projeto

Se estiver usando Git:

```bash
git clone <URL_DO_REPOSITORIO>
cd AgentHUB
```

Se o projeto já estiver no computador, abra um terminal na pasta que contém o arquivo `docker-compose.yml`.

### 2. Crie o arquivo de ambiente

No PowerShell (Windows):

```powershell
Copy-Item .env.docker.example .env
```

No macOS ou Linux:

```bash
cp .env.docker.example .env
```

Abra o arquivo `.env` e substitua as senhas e os tokens de exemplo. A configuração disponível é:

```dotenv
POSTGRES_DB=agentspool
POSTGRES_USER=agentspool
POSTGRES_PASSWORD=troque-esta-senha
FRONTEND_PORT=15173
BACKEND_PORT=18080

OPENROUTER_API_KEY=
HERMES_API_SERVER_KEY=troque-esta-chave-hermes
OPENCLAW_GATEWAY_TOKEN=troque-este-token-openclaw
```

`OPENROUTER_API_KEY` pode permanecer vazia quando Hermes e OpenClaw não forem utilizados ou quando outro provedor for configurado posteriormente.

### 3. Construa e inicie a aplicação

```bash
docker compose up -d --build
```

Esse comando constrói o frontend e o backend, baixa o PostgreSQL e inicia os três serviços em segundo plano. Na primeira execução, o processo pode levar alguns minutos.

### 4. Acesse a aplicação

Abra no navegador:

- aplicação: [http://localhost:15173](http://localhost:15173);
- API do backend: [http://localhost:18080](http://localhost:18080).

Se `FRONTEND_PORT` ou `BACKEND_PORT` forem alteradas no `.env`, use as novas portas.

### 5. Confira o estado dos containers

```bash
docker compose ps
```

Para acompanhar os logs:

```bash
docker compose logs -f
```

Para visualizar apenas o backend:

```bash
docker compose logs -f backend
```

## Hermes e OpenClaw (opcionais)

Os runtimes adicionais pertencem ao profile `agents` e não são iniciados pelo comando padrão.

Baixe as imagens:

```bash
docker compose --profile agents pull hermes openclaw-init openclaw
```

Configure o Hermes uma vez:

```bash
docker compose --profile agents run --rm hermes setup
```

Configure o provedor e o modelo do OpenClaw uma vez:

```bash
docker compose --profile cli run --rm openclaw-cli onboard --mode local --no-install-daemon
```

Depois, inicie a aplicação com os runtimes:

```bash
docker compose --profile agents up -d --build
```

O backend se comunica com eles pela rede interna do Docker. Para utilização com OpenRouter, preencha `OPENROUTER_API_KEY` no `.env` antes de iniciar os serviços.

## Parando e reiniciando

Para parar e remover os containers, preservando os dados:

```bash
docker compose --profile agents down
```

Para iniciar novamente:

```bash
docker compose up -d
```

Para remover também todos os volumes e dados persistidos:

```bash
docker compose --profile agents down -v
```

> Atenção: a opção `-v` apaga definitivamente o banco de dados, o sandbox e as configurações persistidas dos runtimes.

## Atualizando a aplicação

Após obter uma nova versão do código, reconstrua as imagens:

```bash
docker compose --profile agents down
docker compose --profile agents up -d --build
```

Os dados permanecem nos volumes nomeados enquanto o comando `down -v` não for utilizado.

## Solução de problemas

### Uma porta já está em uso

Altere `FRONTEND_PORT` ou `BACKEND_PORT` no `.env` e execute novamente:

```bash
docker compose up -d --build
```

### O backend ainda não está disponível

O backend aguarda o health check do PostgreSQL. Confira o estado e os logs:

```bash
docker compose ps
docker compose logs -f postgres backend
```

### Recriar os containers após uma mudança no código

```bash
docker compose up -d --build --force-recreate
```

### Conferir os logs dos runtimes opcionais

```bash
docker compose --profile agents logs -f hermes openclaw
```

## Estrutura do repositório

```text
AgentHUB/
├── backend/              # API Spring Boot e mecanismo de agentes
├── frontend/             # Interface React servida pelo Nginx
├── docker-compose.yml    # Orquestração dos serviços
├── .env.docker.example   # Modelo de variáveis de ambiente
└── DOCKER.md             # Referência resumida de execução via Docker
```

## Segurança

O projeto foi pensado para uso local e não possui autenticação própria. Não publique as portas diretamente na internet sem adicionar autenticação, HTTPS, controle de acesso e uma estratégia adequada para gerenciamento de segredos.

Não versione o arquivo `.env` nem compartilhe chaves de API, senhas ou tokens. As ferramentas de código, arquivos e navegador devem ser habilitadas apenas para agentes e tarefas confiáveis.

## Persistência

O Docker Compose utiliza volumes nomeados para manter os dados entre reinicializações:

- `postgres_data`: banco PostgreSQL;
- `agent_sandbox`: arquivos manipulados pelos agentes;
- `hermes_data`: dados do Hermes;
- `openclaw_data`: configuração do OpenClaw;
- `openclaw_workspace`: workspace do OpenClaw.

## Licença e dependências

Consulte o arquivo [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) para informações sobre componentes e licenças de terceiros.
