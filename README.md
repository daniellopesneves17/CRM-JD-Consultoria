# CRM JD — Corretagem de Planos de Saúde

CRM para gestão comercial de corretoras, com pipeline, leads, propostas, metas, métricas e automações. O sistema inicia vazio e não simula dados ou conexões externas.

## Tecnologias

- Node.js 20, Fastify 4 e TypeScript
- Next.js 14, Tailwind CSS e NextAuth
- PostgreSQL 15 com Prisma
- Redis 7 e BullMQ
- Puppeteer para propostas em PDF
- Vitest e Playwright

## Iniciar com Docker

1. Copie `.env.example` para `.env`.
2. Troque `JWT_SECRET` e `NEXTAUTH_SECRET` por segredos com pelo menos 32 caracteres.
3. Execute:

```bash
docker compose up --build
```

Acesse `http://localhost:3000`.

Conta administrativa inicial:

```text
danilopesedu11@gmail.com
Definida em `ADMIN_INITIAL_PASSWORD`
```

O seed cria somente essa conta proprietária. Nenhum lead, conversa, proposta, meta, automação ou métrica fictícia é inserido.

## Variáveis de ambiente

| Variável | Finalidade |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL do Supabase usada pelo Prisma em execução |
| `DIRECT_URL` | Conexão usada pelo Prisma para migrações |
| `REDIS_URL` | Conexão Redis usada pelas filas internas |
| `JWT_SECRET` | Assinatura dos tokens do backend |
| `NEXTAUTH_SECRET` | Proteção da sessão do frontend |
| `NEXTAUTH_URL` | URL pública do frontend |
| `COMPANY_NAME` | Nome exibido pelo CRM |
| `ADMIN_EMAIL` | Único e-mail autorizado no painel administrativo |
| `ADMIN_INITIAL_PASSWORD` | Senha inicial do administrador |
| `BACKEND_URL` | Backend acessado pelo servidor Next.js |
| `NEXT_PUBLIC_API_URL` | Backend acessado pelo navegador |

## Conectar ao Supabase

O CRM acessa o PostgreSQL do Supabase somente pelo backend Fastify, usando Prisma. As credenciais do banco não devem ser colocadas no frontend nem em variáveis `NEXT_PUBLIC_*`.

1. Crie um projeto Supabase exclusivo para o CRM, de preferência na região de São Paulo.
2. No painel do Supabase, abra **Connect** e copie a URL do **Session Pooler** (porta 5432).
3. Configure `DATABASE_URL` e `DIRECT_URL` conforme o modelo em `.env.example`. Use `schema=crm` para manter as tabelas da aplicação fora da API pública do Supabase.
4. Crie o schema privado e aplique as tabelas:

```sql
create schema if not exists crm;
```

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Enquanto a conexão remota não estiver validada, o frontend preserva o armazenamento local de contingência do painel administrativo. Ele deve ser removido somente depois que backend, autenticação e banco estiverem funcionando juntos.

## Desenvolvimento local

Backend:

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Testes

```bash
cd backend
npm run build
npm test

cd ../frontend
npm run build
npm run test:e2e
```

Antes do uso com dados reais, troque a senha administrativa, configure HTTPS, backups e as políticas de LGPD aplicáveis.
