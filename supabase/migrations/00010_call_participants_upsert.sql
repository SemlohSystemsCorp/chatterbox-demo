-- ============================================================
-- Add unique constraint for call_participants upsert
-- and insert/update policies
-- ============================================================

alter table public.call_participants
  add constraint call_participants_call_user_unique unique(call_id, user_id);

create policy "Authenticated users can join calls"
  on public.call_participants for insert
  with check (auth.uid() = user_id);

create policy "Users can update own call participation"
  on public.call_participants for update
  using (auth.uid() = user_id);

-- Allow calls to be updated (ended_at)
create policy "Call starter can end call"
  on public.calls for update
  using (auth.uid() = started_by);
