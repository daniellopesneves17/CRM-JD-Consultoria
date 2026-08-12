-- A role serverless da aplicação precisa de DML nas tabelas criadas pela role de migrations.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "crm"."Notification" TO "crm_app";

-- Garante o mesmo acesso mínimo nas próximas tabelas criadas por crm_prisma.
ALTER DEFAULT PRIVILEGES FOR ROLE "crm_prisma" IN SCHEMA "crm"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "crm_app";
