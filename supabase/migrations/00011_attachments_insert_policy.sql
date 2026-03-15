-- Allow authenticated users to insert attachments for their own messages
create policy "Users can insert attachments for own messages"
  on public.attachments for insert
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.sender_id = auth.uid()
    )
  );
