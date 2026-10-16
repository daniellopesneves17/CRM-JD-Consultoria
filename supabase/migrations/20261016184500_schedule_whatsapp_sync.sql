-- Reconcilia mensagens que não chegaram pelo webhook sem depender de um usuário abrir o Inbox.
select cron.schedule(
  'crm-whatsapp-sync-5m',
  '*/5 * * * *',
  $command$select crm.invoke_automation_cron('/api/cron/whatsapp-sync');$command$
);
