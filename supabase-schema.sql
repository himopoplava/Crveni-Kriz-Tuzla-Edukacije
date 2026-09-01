do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('educator', 'volunteer', 'admin');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'volunteer',
  phone text,
  specialty text,
  created_at timestamptz not null default now()
);

create table if not exists public.education_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  capacity integer not null check (capacity > 0),
  location text,
  notes text,
  educator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.education_events enable row level security;

drop policy if exists "Signed in users can view profiles" on public.profiles;
drop policy if exists "Users can update their own basic profile" on public.profiles;
drop policy if exists "Everyone signed in can view education events" on public.education_events;
drop policy if exists "Educators can create their own education events" on public.education_events;
drop policy if exists "Educators can update their own education events" on public.education_events;
drop policy if exists "Educators can delete their own education events" on public.education_events;
drop policy if exists "Public can view profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Admins can delete profiles" on public.profiles;
drop policy if exists "Public can view education events" on public.education_events;
drop policy if exists "Educators and admins can create education events" on public.education_events;
drop policy if exists "Educators can update own events and admins can update all events" on public.education_events;
drop policy if exists "Educators can delete own events and admins can delete all events" on public.education_events;

revoke all on public.profiles from anon, authenticated;
revoke all on public.education_events from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select (id, full_name, role, specialty) on public.profiles to anon;
grant select on public.profiles to authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant select on public.education_events to anon, authenticated;
grant insert, update, delete on public.education_events to authenticated;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

create policy "Public can view profiles"
on public.profiles for select
to anon, authenticated
using (true);

create policy "Admins can insert profiles"
on public.profiles for insert
to authenticated
with check (public.current_user_is_admin());

create policy "Admins can update profiles"
on public.profiles for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy "Admins can delete profiles"
on public.profiles for delete
to authenticated
using (public.current_user_is_admin());

create policy "Public can view education events"
on public.education_events for select
to anon, authenticated
using (true);

create policy "Educators and admins can create education events"
on public.education_events for insert
to authenticated
with check (
  educator_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('educator', 'admin')
  )
);

create policy "Educators can update own events and admins can update all events"
on public.education_events for update
to authenticated
using (
  public.current_user_is_admin()
  or (
    educator_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'educator'
    )
  )
)
with check (
  public.current_user_is_admin()
  or educator_id = auth.uid()
);

create policy "Educators can delete own events and admins can delete all events"
on public.education_events for delete
to authenticated
using (
  public.current_user_is_admin()
  or (
    educator_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'educator'
    )
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists education_events_set_updated_at on public.education_events;

create trigger education_events_set_updated_at
before update on public.education_events
for each row execute function public.set_updated_at();
