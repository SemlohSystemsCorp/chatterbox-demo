-- ============================================================
-- Enable realtime for poll_votes, channels, channel_members
-- ============================================================

-- Poll votes — so all viewers see vote counts update live
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'poll_votes'
  ) then
    alter publication supabase_realtime add table public.poll_votes;
  end if;
end;
$$;

alter table public.poll_votes replica identity full;

-- Channels — so sidebar updates when channels are created/deleted/renamed
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'channels'
  ) then
    alter publication supabase_realtime add table public.channels;
  end if;
end;
$$;

alter table public.channels replica identity full;

-- Channel members — so member lists update on join/leave
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'channel_members'
  ) then
    alter publication supabase_realtime add table public.channel_members;
  end if;
end;
$$;

alter table public.channel_members replica identity full;
