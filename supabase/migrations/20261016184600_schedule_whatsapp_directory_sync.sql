-- Atualiza todos os contatos e chats, inclusive os que ainda não têm mensagens recentes.
select cron.schedule(
  'crm-whatsapp-directory-sync-6h',
  '23 */6 * * *',
  $command$select crm.invoke_automation_cron('/api/cron/whatsapp-directory-sync');$command$
);
