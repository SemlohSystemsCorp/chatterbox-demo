-- Pinned messages table
create table public.pinned_messages (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  pinned_by uuid not null references public.profiles(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  -- A message can only be pinned once per channel/conversation
  unique (message_id)
);

-- Index for fast lookups
create index idx_pinned_messages_channel on public.pinned_messages(channel_id) where channel_id is not null;
create index idx_pinned_messages_conversation on public.pinned_messages(conversation_id) where conversation_id is not null;

-- RLS
alter table public.pinned_messages enable row level security;

-- Anyone in the box can view pinned messages (through channel access)
create policy "Users can view pinned messages"
  on public.pinned_messages for select
  using (
    channel_id in (
      select c.id from public.channels c
      join public.box_members bm on bm.box_id = c.box_id
      where bm.user_id = auth.uid()
    )
    or conversation_id in (
      select cp.conversation_id from public.conversation_participants cp
      where cp.user_id = auth.uid()
    )
  );

-- Authenticated users can pin messages
create policy "Users can pin messages"
  on public.pinned_messages for insert
  with check (pinned_by = auth.uid());

-- Users can unpin messages they pinned, or admins can unpin any
create policy "Users can unpin messages"
  on public.pinned_messages for delete
  using (
    pinned_by = auth.uid()
    or exists (
      select 1 from public.channels c
      join public.box_members bm on bm.box_id = c.box_id
      where c.id = channel_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'admin')
    )
  );

-- Enable realtime for pinned messages
alter publication supabase_realtime add table public.pinned_messages;
