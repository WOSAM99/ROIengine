-- Keep public."Profile" in sync with auth.users.
-- Fires on user creation and deletion in Supabase Auth.

create or replace function public.handle_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public."Profile" (id, email, "createdAt")
  values (new.id::text, new.email, now())
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_insert();

create or replace function public.handle_auth_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public."Profile" where id = old.id::text;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
after delete on auth.users
for each row execute function public.handle_auth_user_delete();
