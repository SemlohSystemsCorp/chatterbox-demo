-- ============================================================
-- Enable Supabase Realtime on messages + read_cursors
--
-- Idempotent: safe to re-run even if messages was already added
-- by a previous migration (the old 00006 that was replaced).
-- ============================================================

-- Add messages to realtime publication (ignore if already present)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- FULL replica identity ensures DELETE events include all columns
-- (needed so channel_id / conversation_id filters work on delete)
alter table public.messages replica identity full;

-- read_cursors was added in 00007 with its own realtime enable,
-- but guard it here too for safety
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'read_cursors'
  ) then
    alter publication supabase_realtime add table public.read_cursors;
  end if;
end;
$$;

alter table public.read_cursors replica identity full;
