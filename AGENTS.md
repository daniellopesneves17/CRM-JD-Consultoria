# Contexto do workspace — CRM JD Consultoria

Atualizado em 2026-08-07. Este arquivo é o contexto operacional do projeto para o Codex e demais agentes usados no VS Code. Leia-o antes de editar o repositório.

## Objetivo do produto

CRM para corretagem de planos de saúde da JD Consultoria. Reúne dashboard comercial, pipeline, leads, WhatsApp/Uazapi, propostas em PDF, metas, automações, IA e administração de corretores.

## Arquitetura vigente

- A aplicação de produção está integralmente em `frontend/`.
- Stack principal: Next.js 16, React 19, TypeScript, Prisma 6, NextAuth 5 beta, SWR e Tailwind CSS.
- Interface, autenticação e APIs são Route Handlers do mesmo serviço Next.js.
- `backend/` é legado da antiga aplicação Fastify. Não o reative nem o inclua no deploy sem uma decisão explícita.
- Node.js 22 é a versão declarada pelo projeto.
- A Vercel usa `vercel.json` na raiz e publica somente o serviço `frontend`.

## Repositório e trabalho em andamento

- Repositório: `daniellopesneves17/CRM-JD-Consultoria`.
- Branch de trabalho atual: `codex/admin-user-management`.
- Base atual: commit `e5aedb5`, também presente em `main` e `origin/main` no momento desta atualização.
- Existem alterações locais ainda não commitadas referentes à gestão completa de usuários/corretores. Preserve-as; não use reset, checkout destrutivo ou reescrita ampla.
- Arquivos e áreas em andamento incluem:
  - `frontend/prisma/schema.prisma` e a migration `20260804190000_add_user_access_logs`;
  - `frontend/src/app/(dashboard)/admin/users/`;
  - `frontend/src/app/api/admin/users/`;
  - `frontend/src/components/admin/users/`;
  - autenticação, controle de acesso e tipos de sessão;
  - testes de regras administrativas em `frontend/src/lib/admin-users.test.ts`.

## Supabase e dados

- Organização: `Pessoal`.
- Projeto: `CRM JD Consultoria`.
- Project ref: `pjrhjkwkrmuvyuvrwnev`.
- URL pública: `https://pjrhjkwkrmuvyuvrwnev.supabase.co`.
- Região atual do banco: `ca-central-1`.
- As tabelas do CRM ficam no schema privado `crm`, não no schema `public` exposto pela Data API.
- Prisma é a camada principal de acesso ao PostgreSQL.
- Localmente, `frontend/.env.local` usa uma role técnica dedicada do Prisma pelo Session Pooler. A senha fica apenas no arquivo ignorado pelo Git.
- Em serverless/Vercel, prefira Transaction Pooler na porta 6543 com `pgbouncer=true` e limite conservador de conexões; migrations usam `DIRECT_URL` por conexão direta ou Session Pooler na porta 5432.
- Migrations remotas já aplicadas até `20260804190000_add_user_access_logs`.
- Buckets configurados:
  - `assets`: público, imagens, limite de 5 MB;
  - `proposals`: privado, PDFs, limite de 20 MB;
  - `audios`: privado, áudios, limite de 20 MB.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, senha do banco, hashes de senha ou strings completas de conexão.

## Autenticação e autorização

- Login por credenciais via NextAuth e sessão JWT.
- A conta é validada no banco por status ativo, CRM habilitado, role e `sessionVersion`.
- `getAccountAccess` mantém cache curto de 15 segundos para reduzir viagens repetidas ao Supabase.
- Rotas administrativas exigem role `ADMIN` tanto na navegação quanto nos Route Handlers.
- O e-mail do administrador vem de variável de ambiente/seed. Não grave e-mail ou senha diretamente no código.
- Redefinição de senha incrementa `sessionVersion` para invalidar sessões anteriores.

## Painel administrativo em andamento

A implementação local inclui:

- listagem, busca e filtros de usuários;
- criação e edição de corretores;
- ativação/desativação de conta e CRM;
- redefinição de senha;
- perfil detalhado, métricas e histórico de acesso;
- avatar;
- transferência de carteira antes da exclusão;
- proteção contra desativar ou excluir a própria conta administrativa.

Use dados reais do banco. Não reintroduza cards, usuários, métricas ou integrações genéricas/fictícias.

## Execução local

```powershell
cd frontend
npm install
npm run dev
```

- URL: `http://localhost:3000`.
- Health check: `http://localhost:3000/api/health` deve retornar `database: connected`.
- O script atual usa `next dev --webpack`.
- A primeira abertura de uma rota em desenvolvimento pode gastar vários segundos compilando. Rotas já compiladas normalmente carregam em cerca de 0,3–0,5 s no ambiente medido.
- Uma consulta simples ao Supabase a partir da máquina local teve aproximadamente 142 ms de latência de rede, enquanto a execução SQL ficou abaixo de 2 ms. Não confunda compilação/latência de rede com consulta lenta no Postgres.
- O hot reload do Next.js mantém as atualizações automáticas no navegador.

## Produção e Vercel

- URL principal: `https://crm-jd-consultoria.vercel.app`.
- O deploy usa o modo Services definido na raiz.
- O cron diário chama `/api/cron/daily` às 12:00 UTC.
- Variáveis sensíveis da Vercel podem aparecer vazias ao serem puxadas localmente. Não substitua valores de produção por strings vazias.
- Antes de publicar, valide `/api/health`, login, dashboard e painel administrativo.
- Alterações em variáveis de ambiente só entram em deployments novos.

## Integrações

- OpenAI: opcional e configurada por `OPENAI_API_KEY` e variáveis de modelo.
- Uazapi: opcional e configurada por URL, token, instância e segredo do webhook.
- Upstash Redis: recomendado em produção para rate limiting distribuído.
- Sem credenciais das integrações, o restante do CRM deve continuar funcionando e mostrar erro de configuração claro apenas no recurso afetado.

## Verificações obrigatórias

Execute dentro de `frontend/`:

```powershell
npm run lint
npm run test:unit
npm run build
```

Quando a mudança envolver fluxo visual ou autenticação, valide também no navegador local. Para alterações no banco, confira migrations, advisors do Supabase e uma consulta real após aplicar.

## Regras de manutenção

- Não commite `.env`, `.env.local`, tokens, senhas ou arquivos de log.
- Preserve a identidade visual JD, modo escuro e estados vazios reais.
- Prefira mudanças pequenas e verificáveis.
- Não remova índices apenas porque ainda aparecem como não utilizados; o banco possui pouco tráfego e as estatísticas ainda são jovens.
- Não altere schema, roles ou políticas do Supabase sem verificar o estado remoto e registrar a mudança em migration quando aplicável.
- Não publique, faça push ou deploy sem que a solicitação do usuário inclua essa ação.
