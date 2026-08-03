# Deploy do CRM JD na Vercel

Este repositório contém dois aplicativos. Na Vercel, importe o mesmo repositório duas vezes e configure uma pasta raiz diferente em cada projeto.

## 1. Projeto da API

- Repositório: `daniellopesneves17/CRM-JD-Consultoria`
- Root Directory: `backend`
- Framework Preset: `Fastify`
- Node.js: `22.x`
- Região: São Paulo (`gru1`), já definida em `backend/vercel.json`

Configure as variáveis abaixo em Production e Preview usando `backend/.env.example` como referência:

- `DATABASE_URL`: Transaction Pooler do Supabase, porta 6543, com `pgbouncer=true`, `connection_limit=1` e `schema=crm`.
- `DIRECT_URL`: conexão direta ou Session Pooler, porta 5432, para Prisma Migrate.
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_INITIAL_PASSWORD`
- `COMPANY_NAME`
- `FRONTEND_URL`: domínio do projeto frontend. Aceita múltiplas URLs separadas por vírgula.
- `ALLOW_VERCEL_PREVIEWS`: use `true` somente se quiser liberar origens `*.vercel.app` para previews.
- `ENABLE_QUEUE_WORKERS`: mantenha `false` na Vercel.

`REDIS_URL` é opcional. Workers BullMQ permanentes não são iniciados dentro da Vercel Function; se forem necessários futuramente, hospede o worker em um serviço de execução contínua.

## 2. Banco Supabase

Depois de configurar as URLs do banco, aplique a migração e crie a conta administrativa uma única vez, em um terminal seguro:

```powershell
cd backend
$env:DATABASE_URL="SUA_DATABASE_URL"
$env:DIRECT_URL="SUA_DIRECT_URL"
$env:JWT_SECRET="SEU_JWT_SECRET"
$env:ADMIN_EMAIL="SEU_EMAIL_ADMIN"
$env:ADMIN_INITIAL_PASSWORD="SUA_SENHA_INICIAL"
npm run prisma:deploy
npm run prisma:seed
```

Nunca execute o seed automaticamente em cada deploy.

## 3. Projeto do frontend

- Repositório: `daniellopesneves17/CRM-JD-Consultoria`
- Root Directory: `frontend`
- Framework Preset: `Next.js`
- Node.js: `22.x`
- Região: São Paulo (`gru1`), já definida em `frontend/vercel.json`

Configure em Production e Preview:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`: domínio público do frontend, incluindo `https://`.
- `BACKEND_URL`: domínio público da API Fastify, incluindo `https://`.
- `NEXT_PUBLIC_API_URL`: o mesmo domínio público da API.
- `ADMIN_EMAIL`: o mesmo e-mail definido no backend.

Não configure `ADMIN_PASSWORD` em produção. O armazenamento local é usado somente como contingência no desenvolvimento.

## 4. Ordem recomendada

1. Crie os dois projetos sem publicar dados reais.
2. Configure o Supabase e todas as variáveis da API.
3. Faça o primeiro deploy da API e teste `https://SUA-API.vercel.app/health`.
4. Configure as variáveis do frontend com a URL da API.
5. Atualize `FRONTEND_URL` na API com o domínio final do frontend e faça um redeploy da API.
6. Aplique a migração e o seed uma única vez.
7. Faça o deploy do frontend e teste login, painel administrativo e operações do CRM.

Depois que os dois projetos estiverem conectados ao GitHub, novos commits na `main` gerarão deployments automaticamente.
