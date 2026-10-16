-- Avalia a cada cinco minutos as regras com horario_programado; o handler aplica fuso e idempotência diária.
select cron.schedule(
  'crm-scheduled-automations-5m',
  '*/5 * * * *',
  $command$select crm.invoke_automation_cron('/api/cron/scheduled-automations');$command$
);
