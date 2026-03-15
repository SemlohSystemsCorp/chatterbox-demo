-- ============================================================
-- Read receipts: cursor-based read tracking
--
-- One row per user per channel/conversation storing a
-- last_read_at timestamp. Any message with
-- created_at <= last_read_at is considered read.
-- ============================================================

create table public.read_cursors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  channel_id uuid references public.channels(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Exactly one of channel_id or conversation_id must be set
  check (
    (channel_id is not null)::int +
    (conversation_id is not null)::int = 1
  ),

  -- One cursor per user per channel/conversation
  unique(user_id, channel_id),
  unique(user_id, conversation_id)
);

-- Indexes for lookups without user_id in WHERE
create index idx_read_cursors_channel
  on public.read_cursors(channel_id) where channel_id is not null;
create index idx_read_cursors_conversation
  on public.read_cursors(conversation_id) where conversation_id is not null;
create index idx_read_cursors_user
  on public.read_cursors(user_id);

-- ── RLS ──

alter table public.read_cursors enable row level security;

create policy "Users can view read cursors for their channels/conversations"
  on public.read_cursors for select
  using (
    (channel_id is not null and public.is_channel_member(channel_id, auth.uid()))
    or
    (conversation_id is not null and public.is_conversation_participant(conversation_id, auth.uid()))
  );

create policy "Users can create own read cursors"
  on public.read_cursors for insert
  with check (auth.uid() = user_id);

create policy "Users can update own read cursors"
  on public.read_cursors for update
  using (auth.uid() = user_id);

-- ── Realtime ──

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

-- ── updated_at trigger (reuses existing function from 00001) ──

create trigger set_read_cursors_updated_at
  before update on public.read_cursors
  for each row execute procedure public.set_updated_at();
