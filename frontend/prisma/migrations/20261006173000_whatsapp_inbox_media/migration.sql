-- Suporte a fotos dos contatos e mensagens de vídeo no Inbox.
SET search_path TO "crm";

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'VIDEO';
