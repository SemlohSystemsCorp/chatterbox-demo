-- ============================================================
-- CHANNEL MEMBERS — enforce private channel access control
-- ============================================================

create table public.channel_members (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid references public.channels(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now(),
  unique(channel_id, user_id)
);

alter table public.channel_members enable row level security;

-- Helper: check if user is an explicit member of a private channel
create or replace function public.is_private_channel_member(p_channel_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.channel_members
    where channel_id = p_channel_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- RLS: channel_members visible to people who are in the same channel
create policy "Channel members can view other members"
  on public.channel_members for select
  using (
    public.is_private_channel_member(channel_id, auth.uid())
    or exists (
      -- admins/owners of the box can always see
      select 1 from public.channels c
      join public.box_members bm on bm.box_id = c.box_id
      where c.id = channel_members.channel_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'admin')
    )
  );

-- RLS: admins + channel members can insert
create policy "Admins and members can add channel members"
  on public.channel_members for insert
  with check (
    exists (
      select 1 from public.channels c
      join public.box_members bm on bm.box_id = c.box_id
      where c.id = channel_members.channel_id
        and bm.user_id = auth.uid()
        and (
          bm.role in ('owner', 'admin')
          or public.is_private_channel_member(c.id, auth.uid())
        )
    )
  );

-- RLS: admins can remove, or user can remove themselves
create policy "Admins can remove channel members"
  on public.channel_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.channels c
      join public.box_members bm on bm.box_id = c.box_id
      where c.id = channel_members.channel_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- Update channels SELECT policy to enforce private access
-- ============================================================

drop policy if exists "Box members can view channels" on public.channels;
create policy "Box members can view channels"
  on public.channels for select
  using (
    exists (
      select 1 from public.box_members
      where box_members.box_id = channels.box_id
      and box_members.user_id = auth.uid()
    )
    and (
      not is_private
      or public.is_private_channel_member(id, auth.uid())
      -- admins/owners always see private channels
      or exists (
        select 1 from public.box_members
        where box_members.box_id = channels.box_id
        and box_members.user_id = auth.uid()
        and box_members.role in ('owner', 'admin')
      )
    )
  );

-- ============================================================
-- Update is_channel_member() to respect private channels
-- ============================================================

create or replace function public.is_channel_member(p_channel_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.channels c
    where c.id = p_channel_id
      and public.is_box_member(c.box_id, p_user_id)
      and (
        not c.is_private
        or public.is_private_channel_member(c.id, p_user_id)
        or exists (
          select 1 from public.box_members bm
          where bm.box_id = c.box_id
          and bm.user_id = p_user_id
          and bm.role in ('owner', 'admin')
        )
      )
  );
$$ language sql security definer stable;

-- ============================================================
-- Backfill: add creator as member for existing private channels
-- ============================================================

insert into public.channel_members (channel_id, user_id, added_by)
select id, created_by, created_by
from public.channels
where is_private = true and created_by is not null
on conflict do nothing;
