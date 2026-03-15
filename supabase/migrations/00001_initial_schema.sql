-- ============================================================
-- Chatterbox Database Schema
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  status text not null default 'offline' check (status in ('online', 'away', 'dnd', 'offline')),
  status_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- USER SETTINGS
-- ============================================================
create table public.user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  compact_mode boolean not null default false,
  send_on_enter boolean not null default true,
  show_link_previews boolean not null default true,
  language text not null default 'en',
  timezone text not null default 'UTC'
);

alter table public.user_settings enable row level security;

create policy "Users can view own settings"
  on public.user_settings for select using (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert with check (auth.uid() = user_id);

-- ============================================================
-- BOXES (workspaces)
-- ============================================================
create table public.boxes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  icon_url text,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boxes enable row level security;

-- ============================================================
-- BOX MEMBERS
-- ============================================================
create table public.box_members (
  id uuid primary key default uuid_generate_v4(),
  box_id uuid references public.boxes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'guest')),
  joined_at timestamptz not null default now(),
  unique(box_id, user_id)
);

alter table public.box_members enable row level security;

create policy "Box members can view their box"
  on public.boxes for select
  using (
    exists (
      select 1 from public.box_members
      where box_members.box_id = boxes.id
      and box_members.user_id = auth.uid()
    )
  );

create policy "Box owners can update their box"
  on public.boxes for update
  using (owner_id = auth.uid());

create policy "Authenticated users can create boxes"
  on public.boxes for insert
  with check (auth.uid() = owner_id);

create policy "Members can see other members"
  on public.box_members for select
  using (
    exists (
      select 1 from public.box_members as bm
      where bm.box_id = box_members.box_id
      and bm.user_id = auth.uid()
    )
  );

create policy "Admins and owners can add members"
  on public.box_members for insert
  with check (
    exists (
      select 1 from public.box_members as bm
      where bm.box_id = box_members.box_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
    )
    or box_members.user_id = auth.uid()
  );

create policy "Admins and owners can remove members"
  on public.box_members for delete
  using (
    exists (
      select 1 from public.box_members as bm
      where bm.box_id = box_members.box_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
    )
    or user_id = auth.uid()
  );

-- ============================================================
-- CHANNELS
-- ============================================================
create table public.channels (
  id uuid primary key default uuid_generate_v4(),
  box_id uuid references public.boxes(id) on delete cascade not null,
  name text not null,
  description text,
  is_private boolean not null default false,
  is_archived boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(box_id, name)
);

alter table public.channels enable row level security;

create policy "Box members can view channels"
  on public.channels for select
  using (
    exists (
      select 1 from public.box_members
      where box_members.box_id = channels.box_id
      and box_members.user_id = auth.uid()
    )
  );

create policy "Box admins can create channels"
  on public.channels for insert
  with check (
    exists (
      select 1 from public.box_members
      where box_members.box_id = channels.box_id
      and box_members.user_id = auth.uid()
      and box_members.role in ('owner', 'admin', 'member')
    )
  );

create policy "Box admins can update channels"
  on public.channels for update
  using (
    exists (
      select 1 from public.box_members
      where box_members.box_id = channels.box_id
      and box_members.user_id = auth.uid()
      and box_members.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- JOINT CHANNELS (cross-workspace)
-- ============================================================
create table public.joint_channels (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_by_box_id uuid references public.boxes(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.joint_channel_boxes (
  id uuid primary key default uuid_generate_v4(),
  joint_channel_id uuid references public.joint_channels(id) on delete cascade not null,
  box_id uuid references public.boxes(id) on delete cascade not null,
  joined_at timestamptz not null default now(),
  unique(joint_channel_id, box_id)
);

alter table public.joint_channels enable row level security;
alter table public.joint_channel_boxes enable row level security;

create policy "Joint channel visible to member boxes"
  on public.joint_channels for select
  using (
    exists (
      select 1 from public.joint_channel_boxes jcb
      join public.box_members bm on bm.box_id = jcb.box_id
      where jcb.joint_channel_id = joint_channels.id
      and bm.user_id = auth.uid()
    )
  );

create policy "Joint channel boxes visible to members"
  on public.joint_channel_boxes for select
  using (
    exists (
      select 1 from public.box_members
      where box_members.box_id = joint_channel_boxes.box_id
      and box_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- CONVERSATIONS (DMs & Group DMs)
-- ============================================================
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  is_group boolean not null default false,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz not null default now(),
  unique(conversation_id, user_id)
);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references public.channels(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  joint_channel_id uuid references public.joint_channels(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null not null,
  content text not null,
  edited_at timestamptz,
  parent_message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (channel_id is not null)::int +
    (conversation_id is not null)::int +
    (joint_channel_id is not null)::int = 1
  )
);

create index idx_messages_channel on public.messages(channel_id, created_at desc);
create index idx_messages_conversation on public.messages(conversation_id, created_at desc);
create index idx_messages_joint_channel on public.messages(joint_channel_id, created_at desc);
create index idx_messages_parent on public.messages(parent_message_id);
create index idx_messages_content_search on public.messages using gin(to_tsvector('english', content));

alter table public.messages enable row level security;

create policy "Channel members can view messages"
  on public.messages for select
  using (
    (channel_id is not null and exists (
      select 1 from public.channels c
      join public.box_members bm on bm.box_id = c.box_id
      where c.id = messages.channel_id
      and bm.user_id = auth.uid()
    ))
    or
    (conversation_id is not null and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
    ))
    or
    (joint_channel_id is not null and exists (
      select 1 from public.joint_channel_boxes jcb
      join public.box_members bm on bm.box_id = jcb.box_id
      where jcb.joint_channel_id = messages.joint_channel_id
      and bm.user_id = auth.uid()
    ))
  );

create policy "Authenticated users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Users can edit own messages"
  on public.messages for update
  using (auth.uid() = sender_id);

create policy "Users can delete own messages"
  on public.messages for delete
  using (auth.uid() = sender_id);

-- ============================================================
-- ATTACHMENTS
-- ============================================================
create table public.attachments (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid references public.messages(id) on delete cascade not null,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null
);

alter table public.attachments enable row level security;

create policy "Attachments follow message visibility"
  on public.attachments for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = attachments.message_id
    )
  );

-- ============================================================
-- REACTIONS
-- ============================================================
create table public.reactions (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null,
  unique(message_id, user_id, emoji)
);

alter table public.reactions enable row level security;

create policy "Reactions follow message visibility"
  on public.reactions for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = reactions.message_id
    )
  );

create policy "Authenticated users can react"
  on public.reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own reactions"
  on public.reactions for delete
  using (auth.uid() = user_id);

create policy "Participants can view conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id
      and cp.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.role() = 'authenticated');

create policy "Participants can see other participants"
  on public.conversation_participants for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
      and cp.user_id = auth.uid()
    )
  );

create policy "Authenticated users can add participants"
  on public.conversation_participants for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- INVITES
-- ============================================================
create table public.invites (
  id uuid primary key default uuid_generate_v4(),
  box_id uuid references public.boxes(id) on delete cascade not null,
  code text not null unique,
  created_by uuid references public.profiles(id) on delete set null not null,
  email text,
  role text not null default 'member' check (role in ('admin', 'member', 'guest')),
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

create policy "Anyone can view valid invite by code"
  on public.invites for select
  using (true);

create policy "Box admins can create invites"
  on public.invites for insert
  with check (
    exists (
      select 1 from public.box_members
      where box_members.box_id = invites.box_id
      and box_members.user_id = auth.uid()
      and box_members.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- CALLS
-- ============================================================
create table public.calls (
  id uuid primary key default uuid_generate_v4(),
  room_name text not null,
  room_url text not null,
  channel_id uuid references public.channels(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  started_by uuid references public.profiles(id) on delete set null not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.call_participants (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid references public.calls(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

alter table public.calls enable row level security;
alter table public.call_participants enable row level security;

create policy "Call visible to authenticated users"
  on public.calls for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can start calls"
  on public.calls for insert
  with check (auth.uid() = started_by);

create policy "Call participants visible to authenticated users"
  on public.call_participants for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
create table public.notification_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  box_id uuid references public.boxes(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  mute_all boolean not null default false,
  mute_at_mentions boolean not null default false,
  mute_dms boolean not null default false,
  mute_threads boolean not null default false,
  schedule_enabled boolean not null default false,
  schedule_start time,
  schedule_end time,
  schedule_timezone text
);

alter table public.notification_preferences enable row level security;

create policy "Users can view own notification prefs"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

create policy "Users can manage own notification prefs"
  on public.notification_preferences for all
  using (auth.uid() = user_id);

-- ============================================================
-- VERIFICATION CODES
-- ============================================================
create table public.verification_codes (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  code text not null,
  type text not null default 'email_verification' check (type in ('email_verification', 'password_reset', 'login')),
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  created_at timestamptz not null default now()
);

create index idx_verification_codes_email on public.verification_codes(email, type, created_at desc);
create index idx_verification_codes_lookup on public.verification_codes(email, code, type) where used_at is null;

-- No RLS — accessed exclusively via service role key in API routes
alter table public.verification_codes enable row level security;

-- Cleanup function to delete expired/used codes older than 24h
create or replace function public.cleanup_expired_verification_codes()
returns void as $$
begin
  delete from public.verification_codes
  where expires_at < now() - interval '24 hours'
     or used_at is not null;
end;
$$ language plpgsql security definer;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_boxes_updated_at
  before update on public.boxes
  for each row execute procedure public.set_updated_at();

create trigger set_channels_updated_at
  before update on public.channels
  for each row execute procedure public.set_updated_at();

create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.set_updated_at();

create trigger set_joint_channels_updated_at
  before update on public.joint_channels
  for each row execute procedure public.set_updated_at();
