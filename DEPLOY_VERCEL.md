# Deploy do CRM JD na Vercel

O CRM usa **Vercel Services** para publicar o frontend Next.js e a API Fastify juntos, no mesmo projeto, domínio e deployment.

## 1. Criar o projeto

1. Importe `daniellopesneves17/CRM-JD-Consultoria` na Vercel.
2. Mantenha a raiz do projeto como a raiz do repositório.
3. Em **Framework Preset**, selecione **Services**.
4. A Vercel lerá o `vercel.json` da raiz e criará os serviços `frontend` e `backend`.

O roteamento público fica assim:

- `/api/backend/*` → API Fastify
- todos os demais caminhos → frontend Next.js

O prefixo `/api/backend` é removido pelo Fastify antes do roteamento interno. Assim, `/api/backend/health` executa a rota `/health` da API.

## 2. Variáveis do projeto

Configure as variáveis em **Production** e **Preview**. Como os serviços pertencem ao mesmo projeto, elas são compartilhadas.

### Banco e autenticação da API

- `DATABASE_URL`: Transaction Pooler do Supabase, porta 6543, com `pgbouncer=true`, `connection_limit=1` e `schema=crm`.
- `DIRECT_URL`: conexão direta ou Session Pooler, porta 5432, para Prisma Migrate.
- `JWT_SECRET`: segredo aleatório com pelo menos 32 caracteres.
- `ADMIN_EMAIL`: e-mail proprietário do CRM.
- `ADMIN_INITIAL_PASSWORD`: senha usada somente no primeiro seed.
- `COMPANY_NAME`: `CRM JD`.
- `ENABLE_QUEUE_WORKERS`: `false`.

`BACKEND_SERVICE_URL` é criado automaticamente pelo binding entre os serviços. Não o configure manualmente.

### Sessão do frontend

- `NEXTAUTH_SECRET`: segredo aleatório com pelo menos 32 caracteres.
- `NEXTAUTH_URL`: domínio final do deployment, incluindo `https://`.
- `ADMIN_EMAIL`: o mesmo e-mail configurado na API.

`NEXT_PUBLIC_API_URL` não é obrigatório na Vercel. O frontend usa `/api/backend` no mesmo domínio automaticamente.

### Opcionais

- `FRONTEND_URL`: domínio customizado adicional permitido pelo CORS. O domínio atual da Vercel é autorizado automaticamente.
- `ALLOW_VERCEL_PREVIEWS`: `true` permite outras origens `*.vercel.app`; mantenha `false` se não precisar.
- `REDIS_URL`: necessário apenas quando houver Redis externo.

Workers BullMQ permanentes não são iniciados dentro da Vercel Function. Hospede-os futuramente em um serviço de execução contínua.

## 3. Banco Supabase

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

## 4. Validação

Depois do deploy, verifique:

1. `https://SEU-DOMINIO.vercel.app/api/backend/health`
2. `https://SEU-DOMINIO.vercel.app/login`
3. Login administrativo
4. Criação, bloqueio e exclusão de corretores
5. Persistência das alterações no Supabase

Para executar os dois serviços localmente pelo runtime da Vercel, use `vercel dev -L` na raiz do repositório.
