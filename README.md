# CRM JD Consultoria e Vendas

CRM full-stack para corretagem de planos de saúde. O único serviço de produção é o Next.js em `frontend/`: interface, autenticação, APIs, IA, WhatsApp, PDF e automações executam como funções serverless na Vercel. O PostgreSQL e o Storage são fornecidos pelo Supabase.

## Módulos

- Dashboard comercial, pipeline ordenado por score, leads e perfil 360°.
- Inbox Uazapi com atendimento BOT/HUMANO, sugestão de resposta e envio manual.
- IA híbrida: resposta rápida, análise profunda, triagem econômica e transcrição.
- Propostas em PDF, armazenamento privado e envio pelo WhatsApp.
- Metas por dias úteis, histórico, projeção e semáforo da equipe.
- Métricas de funil/receita e painel administrativo por corretor.
- Cron jobs para follow-up, reativação programada e atualização de score.

## Pré-requisitos

- Node.js 22 (o projeto também é compatível com Node 20+).
- Projeto Supabase, conta Vercel, chave da OpenAI e instância Uazapi v2.
- Upstash Redis recomendado em produção para rate limiting distribuído.

## Instalação local

```bash
git clone https://github.com/daniellopesneves17/CRM-JD-Consultoria.git
cd CRM-JD-Consultoria/frontend
npm install
```

Copie `frontend/.env.example` para `frontend/.env.local` e preencha as credenciais. Nunca envie `.env.local`, senha, service role ou tokens ao Git.

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Abra `http://localhost:3000`. O seed cria ou atualiza a conta indicada em `ADMIN_EMAIL`, usando `ADMIN_INITIAL_PASSWORD`. Dados demonstrativos só são criados quando `SEED_DEMO_DATA=true`.

## Supabase

1. Crie um projeto e abra **Connect**.
2. Use o Transaction Pooler (porta 6543) em `DATABASE_URL` com `pgbouncer=true`.
3. Use a conexão direta ou Session Pooler (porta 5432) em `DIRECT_URL`.
4. Preserve `schema=crm`: as tabelas operacionais ficam fora do schema `public` exposto pela Data API.
5. Execute `npx prisma migrate deploy` dentro de `frontend/`.
6. No Storage, crie os buckets privados `proposals` e `audios`. O servidor usa `SUPABASE_SERVICE_ROLE_KEY` e entrega links assinados; a chave nunca chega ao navegador.

## OpenAI

Configure `OPENAI_API_KEY`. Os modelos são selecionáveis por ambiente:

| Função | Variável | Padrão |
|---|---|---|
| Atendimento rápido | `OPENAI_FAST_MODEL` | `gpt-4o` |
| Score e análise | `OPENAI_DEEP_MODEL` | `gpt-5.6-luna` |
| Fallback profundo | `OPENAI_DEEP_FALLBACK_MODEL` | `o3` |
| Sentimento/intenção | `OPENAI_CHEAP_MODEL` | `gpt-4o-mini` |
| Transcrição | `OPENAI_TRANSCRIPTION_MODEL` | `whisper-1` |

As chamadas usam a Responses API para texto e Audio Transcriptions para mídia. Sem chave, o restante do CRM continua funcionando, mas recursos de IA retornam erro de configuração.

## Uazapi

Preencha `UAZAPI_BASE_URL`, `UAZAPI_TOKEN` e `UAZAPI_WEBHOOK_SECRET`. No painel da instância, configure:

```text
URL: https://crm-jd-consultoria.vercel.app/api/webhook/uazapi
Header: x-webhook-secret: VALOR_DE_UAZAPI_WEBHOOK_SECRET
Eventos: messages, messages_update
```

O webhook ignora mensagens enviadas pela própria instância e grupos, normaliza o DDI 55, evita duplicidade pelo ID externo e responde imediatamente antes do processamento de IA.

## Vercel

1. Importe este repositório e mantenha o framework do projeto como **Services**, pois `vercel.json` aponta o único serviço para `frontend/`.
2. Cadastre todas as variáveis de `frontend/.env.example` nos ambientes Production e Preview apropriados.
3. Gere `AUTH_SECRET`, `CRON_SECRET` e `UAZAPI_WEBHOOK_SECRET` com valores aleatórios independentes.
4. Aplique as migrations no Supabase antes do primeiro acesso.
5. Faça o deploy. Pushes na branch `main` publicam automaticamente.

Os cron jobs são declarados na raiz em `vercel.json`. A Vercel envia `Authorization: Bearer $CRON_SECRET`, validado por todos os handlers.

## Verificação

```bash
cd frontend
npm run lint
npm run build
npm run test:e2e
```

Após o deploy:

```text
GET /api/health
GET /login
```

O health check deve responder `database: connected`. Para uso real, configure backups do Supabase, retenção de logs sem conteúdo sensível e procedimentos LGPD para CPF, mensagens, áudios e propostas.

## Estrutura principal

```text
frontend/
├── prisma/                 schema, seed e migrations
├── public/                 identidade visual
└── src/
    ├── app/api/            Route Handlers e cron jobs
    ├── components/         interface por domínio
    ├── hooks/              SWR e revalidação
    ├── lib/                Prisma, autenticação, datas e segurança
    ├── services/           OpenAI, Uazapi, PDF, Whisper e Storage
    └── types/              tipos do domínio
```

O diretório `backend/` permanece apenas como histórico da versão Fastify e não é mais construído nem roteado na Vercel.
