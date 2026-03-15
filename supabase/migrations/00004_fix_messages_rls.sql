-- ============================================================
-- Fix messages, joint_channels & conversation_participants RLS
--
-- messages SELECT policy joins box_members/channels directly,
-- and conversation_participants has the same self-referencing
-- recursion as box_members. Fix with SECURITY DEFINER helpers.
-- ============================================================

-- Helper: check if user can view a channel's messages
create or replace function public.is_channel_member(p_channel_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.channels c
    where c.id = p_channel_id
      and public.is_box_member(c.box_id, p_user_id)
  );
$$ language sql security definer stable;

-- Helper: check if user is a conversation participant
create or replace function public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- Helper: check if user is in a joint channel
create or replace function public.is_joint_channel_member(p_joint_channel_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.joint_channel_boxes jcb
    where jcb.joint_channel_id = p_joint_channel_id
      and public.is_box_member(jcb.box_id, p_user_id)
  );
$$ language sql security definer stable;

-- ============================================================
-- Fix messages SELECT policy
-- ============================================================

drop policy if exists "Channel members can view messages" on public.messages;
create policy "Channel members can view messages"
  on public.messages for select
  using (
    (channel_id is not null and public.is_channel_member(channel_id, auth.uid()))
    or
    (conversation_id is not null and public.is_conversation_participant(conversation_id, auth.uid()))
    or
    (joint_channel_id is not null and public.is_joint_channel_member(joint_channel_id, auth.uid()))
  );

-- ============================================================
-- Fix conversation_participants self-referencing recursion
-- ============================================================

drop policy if exists "Participants can see other participants" on public.conversation_participants;
create policy "Participants can see other participants"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id, auth.uid()));

-- ============================================================
-- Fix conversations SELECT policy (references conversation_participants)
-- ============================================================

drop policy if exists "Participants can view conversations" on public.conversations;
create policy "Participants can view conversations"
  on public.conversations for select
  using (public.is_conversation_participant(id, auth.uid()));

-- ============================================================
-- Fix joint_channels SELECT policy
-- ============================================================

drop policy if exists "Joint channel visible to member boxes" on public.joint_channels;
create policy "Joint channel visible to member boxes"
  on public.joint_channels for select
  using (public.is_joint_channel_member(id, auth.uid()));
