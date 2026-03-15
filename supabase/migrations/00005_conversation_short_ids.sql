-- ============================================================
-- Add short_id (8 digits) to conversations for /dm/[id] URLs
-- ============================================================

alter table public.conversations
  add column if not exists short_id text unique;

-- Backfill existing rows
do $$
declare
  r record;
  new_id text;
  retries int;
begin
  for r in select id from public.conversations where short_id is null loop
    retries := 0;
    loop
      new_id := public.generate_short_id(8);
      begin
        update public.conversations set short_id = new_id where id = r.id;
        exit;
      exception when unique_violation then
        retries := retries + 1;
        if retries > 10 then
          raise exception 'Could not generate unique short_id for conversation %', r.id;
        end if;
      end;
    end loop;
  end loop;
end;
$$;

alter table public.conversations
  alter column short_id set not null;

-- Auto-generate on insert
create or replace function public.generate_conversation_short_id()
returns trigger as $$
declare
  new_id text;
  retries int := 0;
begin
  if new.short_id is null or new.short_id = '' then
    loop
      new_id := public.generate_short_id(8);
      if not exists (select 1 from public.conversations where short_id = new_id) then
        new.short_id := new_id;
        exit;
      end if;
      retries := retries + 1;
      if retries > 20 then
        raise exception 'Could not generate unique conversation short_id after 20 attempts';
      end if;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_conversation_short_id
  before insert on public.conversations
  for each row execute procedure public.generate_conversation_short_id();

create index idx_conversations_short_id on public.conversations(short_id);
