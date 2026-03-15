-- Add username column to profiles
alter table public.profiles
  add column username text;

-- Generate default usernames from email (part before @)
update public.profiles
  set username = split_part(email, '@', 1);

-- Make it not null and unique after populating
alter table public.profiles
  alter column username set not null,
  alter column username set default '';

create unique index profiles_username_unique
  on public.profiles (username)
  where username != '';

-- Update the trigger to set default username from email on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;
