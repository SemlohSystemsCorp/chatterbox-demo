-- Scheduled messages table
create table public.scheduled_messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references public.channels(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  parent_message_id uuid references public.messages(id) on delete set null,
  attachments jsonb default '[]'::jsonb,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (channel_id is not null)::int +
    (conversation_id is not null)::int = 1
  )
);

create index idx_scheduled_messages_sender on public.scheduled_messages(sender_id);
create index idx_scheduled_messages_status on public.scheduled_messages(status, scheduled_for);
create index idx_scheduled_messages_channel on public.scheduled_messages(channel_id) where channel_id is not null;
create index idx_scheduled_messages_conversation on public.scheduled_messages(conversation_id) where conversation_id is not null;

-- RLS
alter table public.scheduled_messages enable row level security;

-- Users can see their own scheduled messages
create policy "Users can view own scheduled messages"
  on public.scheduled_messages for select
  using (sender_id = auth.uid());

-- Users can create scheduled messages
create policy "Users can create scheduled messages"
  on public.scheduled_messages for insert
  with check (sender_id = auth.uid());

-- Users can update their own scheduled messages (cancel)
create policy "Users can update own scheduled messages"
  on public.scheduled_messages for update
  using (sender_id = auth.uid());

-- Users can delete their own scheduled messages
create policy "Users can delete own scheduled messages"
  on public.scheduled_messages for delete
  using (sender_id = auth.uid());
