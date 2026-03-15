-- ============================================================
-- Fix: Allow users to delete their own attachments
-- ============================================================
create policy "Users can delete own attachments"
  on public.attachments for delete
  using (
    exists (
      select 1 from public.messages m
      where m.id = attachments.message_id
      and m.sender_id = auth.uid()
    )
  );

-- ============================================================
-- Fix: Tighten channel_events INSERT — must be a box member
-- ============================================================
drop policy if exists "Authenticated users can insert channel events" on public.channel_events;

create policy "Box members can insert channel events"
  on public.channel_events for insert
  with check (
    exists (
      select 1 from public.channels c
      join public.box_members bm on bm.box_id = c.box_id
      where c.id = channel_events.channel_id
      and bm.user_id = auth.uid()
    )
  );

-- ============================================================
-- Fix: Tighten calls UPDATE — must be a participant
-- ============================================================
drop policy if exists "Authenticated users can update calls" on public.calls;

create policy "Call participants can update calls"
  on public.calls for update
  using (
    exists (
      select 1 from public.call_participants cp
      where cp.call_id = calls.id
      and cp.user_id = auth.uid()
    )
  );
