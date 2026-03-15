-- ============================================================
-- Short IDs for boxes (8 digits) and channels (6 digits)
-- Human-friendly IDs used in URLs: /box/12345678/c/123456
-- ============================================================

-- Helper: generate a random numeric string of N digits
create or replace function public.generate_short_id(digits int)
returns text as $$
declare
  result text := '';
  i int;
begin
  for i in 1..digits loop
    if i = 1 then
      -- First digit is 1-9 (no leading zero)
      result := result || floor(random() * 9 + 1)::int::text;
    else
      result := result || floor(random() * 10)::int::text;
    end if;
  end loop;
  return result;
end;
$$ language plpgsql;

-- ============================================================
-- Add short_id to BOXES (8 digits)
-- ============================================================
alter table public.boxes
  add column if not exists short_id text unique;

-- Backfill any existing rows
do $$
declare
  r record;
  new_id text;
  retries int;
begin
  for r in select id from public.boxes where short_id is null loop
    retries := 0;
    loop
      new_id := public.generate_short_id(8);
      begin
        update public.boxes set short_id = new_id where id = r.id;
        exit;
      exception when unique_violation then
        retries := retries + 1;
        if retries > 10 then
          raise exception 'Could not generate unique short_id for box %', r.id;
        end if;
      end;
    end loop;
  end loop;
end;
$$;

alter table public.boxes
  alter column short_id set not null;

-- Auto-generate short_id on insert
create or replace function public.generate_box_short_id()
returns trigger as $$
declare
  new_id text;
  retries int := 0;
begin
  if new.short_id is null or new.short_id = '' then
    loop
      new_id := public.generate_short_id(8);
      -- Check uniqueness
      if not exists (select 1 from public.boxes where short_id = new_id) then
        new.short_id := new_id;
        exit;
      end if;
      retries := retries + 1;
      if retries > 20 then
        raise exception 'Could not generate unique box short_id after 20 attempts';
      end if;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_box_short_id
  before insert on public.boxes
  for each row execute procedure public.generate_box_short_id();

create index idx_boxes_short_id on public.boxes(short_id);

-- ============================================================
-- Add short_id to CHANNELS (6 digits)
-- ============================================================
alter table public.channels
  add column if not exists short_id text;

-- Unique per box (different boxes can reuse channel short_ids)
alter table public.channels
  add constraint channels_box_short_id_unique unique(box_id, short_id);

-- Backfill any existing rows
do $$
declare
  r record;
  new_id text;
  retries int;
begin
  for r in select id, box_id from public.channels where short_id is null loop
    retries := 0;
    loop
      new_id := public.generate_short_id(6);
      begin
        update public.channels set short_id = new_id where id = r.id;
        exit;
      exception when unique_violation then
        retries := retries + 1;
        if retries > 10 then
          raise exception 'Could not generate unique short_id for channel %', r.id;
        end if;
      end;
    end loop;
  end loop;
end;
$$;

alter table public.channels
  alter column short_id set not null;

-- Auto-generate short_id on insert
create or replace function public.generate_channel_short_id()
returns trigger as $$
declare
  new_id text;
  retries int := 0;
begin
  if new.short_id is null or new.short_id = '' then
    loop
      new_id := public.generate_short_id(6);
      -- Check uniqueness within the same box
      if not exists (select 1 from public.channels where box_id = new.box_id and short_id = new_id) then
        new.short_id := new_id;
        exit;
      end if;
      retries := retries + 1;
      if retries > 20 then
        raise exception 'Could not generate unique channel short_id after 20 attempts';
      end if;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_channel_short_id
  before insert on public.channels
  for each row execute procedure public.generate_channel_short_id();

create index idx_channels_short_id on public.channels(box_id, short_id);
