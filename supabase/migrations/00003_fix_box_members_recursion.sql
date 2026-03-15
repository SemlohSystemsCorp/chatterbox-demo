-- ============================================================
-- Fix infinite recursion in box_members RLS policies
--
-- The box_members SELECT policy queries box_members itself,
-- which triggers the same policy again → infinite loop.
-- Fix: use SECURITY DEFINER functions that bypass RLS.
-- ============================================================

-- Helper: check if a user belongs to a box (bypasses RLS)
create or replace function public.is_box_member(p_box_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.box_members
    where box_id = p_box_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- Helper: check if a user is an admin/owner of a box (bypasses RLS)
create or replace function public.is_box_admin(p_box_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.box_members
    where box_id = p_box_id
      and user_id = p_user_id
      and role in ('owner', 'admin')
  );
$$ language sql security definer stable;

-- ============================================================
-- Drop and recreate box_members policies
-- ============================================================

drop policy if exists "Members can see other members" on public.box_members;
create policy "Members can see other members"
  on public.box_members for select
  using (public.is_box_member(box_id, auth.uid()));

drop policy if exists "Admins and owners can add members" on public.box_members;
create policy "Admins and owners can add members"
  on public.box_members for insert
  with check (
    public.is_box_admin(box_id, auth.uid())
    or user_id = auth.uid()
  );

drop policy if exists "Admins and owners can remove members" on public.box_members;
create policy "Admins and owners can remove members"
  on public.box_members for delete
  using (
    public.is_box_admin(box_id, auth.uid())
    or user_id = auth.uid()
  );

-- ============================================================
-- Also fix boxes SELECT policy (it queries box_members too)
-- ============================================================

drop policy if exists "Box members can view their box" on public.boxes;
create policy "Box members can view their box"
  on public.boxes for select
  using (
    owner_id = auth.uid()
    or public.is_box_member(id, auth.uid())
  );

-- ============================================================
-- Fix channel policies that reference box_members
-- ============================================================

drop policy if exists "Box members can view channels" on public.channels;
create policy "Box members can view channels"
  on public.channels for select
  using (public.is_box_member(box_id, auth.uid()));

drop policy if exists "Box admins can create channels" on public.channels;
create policy "Box admins can create channels"
  on public.channels for insert
  with check (public.is_box_member(box_id, auth.uid()));

drop policy if exists "Box admins can update channels" on public.channels;
create policy "Box admins can update channels"
  on public.channels for update
  using (public.is_box_admin(box_id, auth.uid()));

-- ============================================================
-- Fix invite policy that references box_members
-- ============================================================

drop policy if exists "Box admins can create invites" on public.invites;
create policy "Box admins can create invites"
  on public.invites for insert
  with check (public.is_box_admin(box_id, auth.uid()));

-- ============================================================
-- Fix joint_channel_boxes policy that references box_members
-- ============================================================

drop policy if exists "Joint channel boxes visible to members" on public.joint_channel_boxes;
create policy "Joint channel boxes visible to members"
  on public.joint_channel_boxes for select
  using (public.is_box_member(box_id, auth.uid()));
