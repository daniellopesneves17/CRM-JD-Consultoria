-- Executor principal das automações, independente de navegador e do agendador da Vercel.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function crm.invoke_automation_cron(endpoint_path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  cron_secret text;
  request_id bigint;
begin
  if endpoint_path !~ '^/api/cron/[a-z0-9-]+$' then
    raise exception 'Invalid automation endpoint';
  end if;

  select decrypted_secret
    into cron_secret
    from vault.decrypted_secrets
   where name = 'crm_automation_cron_secret'
   limit 1;

  if cron_secret is null or length(cron_secret) < 32 then
    raise exception 'CRM automation cron secret is not configured';
  end if;

  select net.http_post(
    url := 'https://crm-jd-consultoria.vercel.app' || endpoint_path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret,
      'User-Agent', 'Supabase-Cron/CRM-JD'
    ),
    body := jsonb_build_object('source', 'supabase-cron', 'scheduledAt', now()),
    timeout_milliseconds := 300000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function crm.invoke_automation_cron(text) from public, anon, authenticated;

select cron.schedule(
  'crm-follow-up-5m',
  '*/5 * * * *',
  $command$select crm.invoke_automation_cron('/api/cron/follow-up');$command$
);

select cron.schedule(
  'crm-reactivation-hourly',
  '7 * * * *',
  $command$select crm.invoke_automation_cron('/api/cron/reactivation');$command$
);

select cron.schedule(
  'crm-score-hourly',
  '17 * * * *',
  $command$select crm.invoke_automation_cron('/api/cron/score-update');$command$
);

select cron.schedule(
  'crm-jd-ai-daily',
  '5 12 * * *',
  $command$select crm.invoke_automation_cron('/api/cron/jd-ai-update');$command$
);

select cron.schedule(
  'crm-cron-history-cleanup',
  '35 3 * * *',
  $command$delete from cron.job_run_details where end_time < now() - interval '30 days';$command$
);
