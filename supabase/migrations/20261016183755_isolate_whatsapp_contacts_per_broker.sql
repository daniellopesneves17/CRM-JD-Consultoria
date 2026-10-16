-- O mesmo número pode existir nas carteiras de corretores diferentes, sem misturar conversas.
drop index if exists crm."Lead_phone_key";

create unique index "Lead_userId_phone_key"
  on crm."Lead" ("userId", "phone");

create index "Lead_phone_idx"
  on crm."Lead" ("phone");
