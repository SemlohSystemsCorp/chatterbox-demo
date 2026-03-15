-- In-app notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- 'mention', 'dm', 'reply', 'reaction', 'invite', 'pin'
  title text not null,
  body text,
  -- Context links
  box_id uuid references public.boxes(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  -- Who triggered it
  actor_id uuid references public.profiles(id) on delete set null,
  -- State
  read boolean not null default false,
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_notifications_user on public.notifications(user_id, created_at desc);
create index idx_notifications_unread on public.notifications(user_id) where read = false;

-- RLS
alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- Only server (service role) inserts notifications, but allow insert for authenticated users
-- so the API route can create notifications via the user's session
create policy "Service can insert notifications"
  on public.notifications for insert
  with check (true);

-- Enable realtime
alter publication supabase_realtime add table public.notifications;
