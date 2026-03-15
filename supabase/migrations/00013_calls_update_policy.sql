-- Allow any authenticated user to update calls (set ended_at)
-- Previously only the call starter could end calls, which caused issues
-- when the last participant to leave wasn't the one who started the call.
drop policy if exists "Call starter can end call" on public.calls;

create policy "Authenticated users can update calls"
  on public.calls for update
  using (auth.role() = 'authenticated');

-- Also allow system messages to be deleted by any authenticated user
-- (needed for cleaning up call_started messages when call ends)
create policy "Authenticated users can delete system messages"
  on public.messages for delete
  using (
    auth.role() = 'authenticated'
    and content like '__system:%'
  );
