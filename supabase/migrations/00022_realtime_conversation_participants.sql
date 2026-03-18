-- Enable realtime for conversation_participants so sidebar DMs update live
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'conversation_participants'
  ) then
    alter publication supabase_realtime add table public.conversation_participants;
  end if;
end;
$$;

alter table public.conversation_participants replica identity full;

-- Enable realtime for box_members so the app knows when members join/leave
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'box_members'
  ) then
    alter publication supabase_realtime add table public.box_members;
  end if;
end;
$$;

alter table public.box_members replica identity full;
