# Deploy do CRM JD na Vercel

O deploy usa somente o serviço `frontend`, que contém Next.js e todos os Route Handlers. O backend Fastify legado não participa do build.

1. Conecte `daniellopesneves17/CRM-JD-Consultoria` ao projeto Vercel.
2. Selecione o preset **Services**; o `vercel.json` define `frontend/` como único serviço.
3. Cadastre as variáveis de `frontend/.env.example`, sem copiar valores de exemplo.
4. No Supabase, aplique `frontend/prisma/migrations` com `npx prisma migrate deploy`.
5. Crie os buckets privados `proposals` e `audios`.
6. Faça o deploy e valide `/api/health`, `/login` e os logs das funções.

Variáveis indispensáveis para login: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL` e a conta criada pelo seed.

Integrações opcionais entram em operação somente após configurar as respectivas chaves: OpenAI, Uazapi, Supabase Storage e Upstash.
