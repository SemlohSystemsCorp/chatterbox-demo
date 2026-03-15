-- ============================================================
-- CHANNEL EVENTS — activity log rendered inline in chat
-- e.g. "Alice joined the channel", "Bob started a call"
-- ============================================================

create table public.channel_events (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references public.channels(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_channel_events_channel
  on public.channel_events(channel_id, created_at desc);

alter table public.channel_events enable row level security;

-- Visible to box members (same logic as channel messages)
create policy "Channel events visible to box members"
  on public.channel_events for select
  using (
    exists (
      select 1 from public.channels c
      join public.box_members bm on bm.box_id = c.box_id
      where c.id = channel_events.channel_id
      and bm.user_id = auth.uid()
    )
  );

-- Any authenticated user can insert events
create policy "Authenticated users can insert channel events"
  on public.channel_events for insert
  with check (auth.role() = 'authenticated');

-- Enable realtime so events appear live in chat
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'channel_events'
  ) then
    alter publication supabase_realtime add table public.channel_events;
  end if;
end;
$$;

alter table public.channel_events replica identity full;
