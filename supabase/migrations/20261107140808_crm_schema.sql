-- Mini-CRM: sites, tasks, fixed stages, append-only history.
-- security definer helpers stay in private, which is not exposed by the Data API.

create schema private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to authenticated;

create type public.app_role as enum ('manager', 'executor');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.app_role not null,
  constraint profiles_full_name_not_blank check (char_length(btrim(full_name)) > 0)
);

create table public.sites (
  id bigint generated always as identity primary key,
  title text not null,
  address text not null,
  is_deleted boolean not null default false,
  constraint sites_title_not_blank check (char_length(btrim(title)) > 0),
  constraint sites_address_not_blank check (char_length(btrim(address)) > 0)
);

create table public.stages (
  id bigint generated always as identity primary key,
  code text not null,
  title text not null,
  sort integer not null,
  exits jsonb not null default '[]'::jsonb,
  constraint stages_code_key unique (code),
  constraint stages_sort_key unique (sort),
  constraint stages_code_format check (code ~ '^[a-z_]+$'),
  constraint stages_title_not_blank check (char_length(btrim(title)) > 0),
  constraint stages_exits_is_array check (jsonb_typeof(exits) = 'array')
);

create table public.tasks (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null default '',
  site_id bigint not null references public.sites (id),
  assignee_id uuid not null references public.profiles (id),
  author_id uuid not null references public.profiles (id),
  stage_id bigint not null references public.stages (id),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (char_length(btrim(title)) > 0)
);

create table public.history (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks (id),
  actor_id uuid not null references public.profiles (id),
  from_stage_id bigint references public.stages (id),
  to_stage_id bigint not null references public.stages (id),
  comment text,
  created_at timestamptz not null default clock_timestamp()
);

create index tasks_site_id_idx on public.tasks (site_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_author_id_idx on public.tasks (author_id);
create index tasks_stage_id_idx on public.tasks (stage_id);
create index history_task_id_idx on public.history (task_id);
create index history_actor_id_idx on public.history (actor_id);
create index history_from_stage_id_idx on public.history (from_stage_id);
create index history_to_stage_id_idx on public.history (to_stage_id);

create function private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'manager'
  );
$$;

create function private.prepare_task_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_stage_id bigint;
  actor uuid;
begin
  actor := (select auth.uid());

  if actor is null or not private.is_manager() then
    raise exception 'task_create_forbidden'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = new.assignee_id
      and role = 'executor'
  ) then
    raise exception 'assignee_must_be_executor'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.sites
    where id = new.site_id
      and is_deleted = false
  ) then
    raise exception 'site_not_available'
      using errcode = '23514';
  end if;

  select id
  into new_stage_id
  from public.stages
  where code = 'new';

  if new_stage_id is null then
    raise exception 'stage_new_missing'
      using errcode = '55000';
  end if;

  new.author_id := actor;
  new.stage_id := new_stage_id;
  new.is_deleted := false;
  new.description := coalesce(new.description, '');
  new.created_at := clock_timestamp();

  return new;
end;
$$;

create function private.record_task_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.history (task_id, actor_id, from_stage_id, to_stage_id, comment)
  values (new.id, new.author_id, null, new.stage_id, null);

  return new;
end;
$$;

create function private.guard_task_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('app.transition', true) = 'on' then
    if old.is_deleted then
      raise exception 'task_not_found'
        using errcode = 'P0002';
    end if;

    if new.assignee_id is distinct from old.assignee_id
      or new.author_id is distinct from old.author_id
      or new.created_at is distinct from old.created_at
      or new.site_id is distinct from old.site_id
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.is_deleted is distinct from old.is_deleted
      or new.id is distinct from old.id
      or new.stage_id is not distinct from old.stage_id
    then
      raise exception 'task_field_locked'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if (select auth.uid()) is null or not private.is_manager() then
    raise exception 'task_update_forbidden'
      using errcode = '42501';
  end if;

  if old.is_deleted and not new.is_deleted then
    raise exception 'undelete_forbidden'
      using errcode = '42501';
  end if;

  if old.is_deleted then
    raise exception 'task_hidden'
      using errcode = '42501';
  end if;

  if new.assignee_id is distinct from old.assignee_id
    or new.author_id is distinct from old.author_id
    or new.created_at is distinct from old.created_at
    or new.id is distinct from old.id
  then
    raise exception 'task_field_locked'
      using errcode = '42501';
  end if;

  if new.stage_id is distinct from old.stage_id then
    raise exception 'stage_change_forbidden'
      using errcode = '42501';
  end if;

  if new.site_id is distinct from old.site_id
    and not exists (
      select 1
      from public.sites
      where id = new.site_id
        and is_deleted = false
    )
  then
    raise exception 'site_not_available'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function private.guard_site_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.is_manager() then
    raise exception 'site_create_forbidden'
      using errcode = '42501';
  end if;

  new.is_deleted := false;
  return new;
end;
$$;

create function private.guard_site_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.is_manager() then
    raise exception 'site_update_forbidden'
      using errcode = '42501';
  end if;

  if old.is_deleted and not new.is_deleted then
    raise exception 'undelete_forbidden'
      using errcode = '42501';
  end if;

  if old.is_deleted then
    raise exception 'site_hidden'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'site_field_locked'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create function private.hide_site_tasks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_deleted and not old.is_deleted then
    update public.tasks
    set is_deleted = true
    where site_id = new.id
      and is_deleted = false;
  end if;

  return new;
end;
$$;

create function private.transition_task(
  p_task_id bigint,
  p_expected_stage_id bigint,
  p_to_stage_id bigint,
  p_comment text
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_row public.tasks;
  exit_row jsonb;
  actor_kind text;
  comment_required boolean;
  target_code text;
  cleaned_comment text;
  uid uuid;
begin
  uid := (select auth.uid());

  if uid is null then
    raise exception 'transition_forbidden'
      using errcode = '42501';
  end if;

  select *
  into task_row
  from public.tasks
  where id = p_task_id
  for update;

  if not found or task_row.is_deleted then
    raise exception 'task_not_found'
      using errcode = 'P0002';
  end if;

  if not private.is_manager() and task_row.assignee_id is distinct from uid then
    raise exception 'task_not_found'
      using errcode = 'P0002';
  end if;

  if task_row.stage_id is distinct from p_expected_stage_id then
    raise exception 'stage_conflict'
      using errcode = '40001';
  end if;

  select code
  into target_code
  from public.stages
  where id = p_to_stage_id;

  if target_code is null then
    raise exception 'transition_forbidden'
      using errcode = '42501';
  end if;

  select exit_item
  into exit_row
  from public.stages as stage_row
  cross join lateral jsonb_array_elements(stage_row.exits) as exit_item
  where stage_row.id = task_row.stage_id
    and exit_item->>'to' = target_code
  limit 1;

  if exit_row is null then
    raise exception 'transition_forbidden'
      using errcode = '42501';
  end if;

  actor_kind := exit_row->>'actor';
  comment_required := coalesce((exit_row->>'comment_required')::boolean, false);
  cleaned_comment := nullif(btrim(coalesce(p_comment, '')), '');

  if actor_kind = 'assignee' then
    if task_row.assignee_id is distinct from uid then
      raise exception 'transition_forbidden'
        using errcode = '42501';
    end if;
  elsif actor_kind = 'author' then
    if task_row.author_id is distinct from uid then
      raise exception 'transition_forbidden'
        using errcode = '42501';
    end if;
  else
    raise exception 'transition_forbidden'
      using errcode = '42501';
  end if;

  if comment_required and cleaned_comment is null then
    raise exception 'comment_required'
      using errcode = '23514';
  end if;

  perform set_config('app.transition', 'on', true);

  update public.tasks
  set stage_id = p_to_stage_id
  where id = task_row.id
  returning * into task_row;

  insert into public.history (task_id, actor_id, from_stage_id, to_stage_id, comment)
  values (task_row.id, uid, p_expected_stage_id, p_to_stage_id, cleaned_comment);

  return task_row;
end;
$$;

create function public.transition_task(
  p_task_id bigint,
  p_expected_stage_id bigint,
  p_to_stage_id bigint,
  p_comment text default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.transition_task(p_task_id, p_expected_stage_id, p_to_stage_id, p_comment);
end;
$$;

create trigger tasks_prepare_insert
before insert on public.tasks
for each row
execute function private.prepare_task_insert();

create trigger tasks_record_created
after insert on public.tasks
for each row
execute function private.record_task_created();

create trigger tasks_guard_update
before update on public.tasks
for each row
execute function private.guard_task_update();

create trigger sites_guard_insert
before insert on public.sites
for each row
execute function private.guard_site_insert();

create trigger sites_guard_update
before update on public.sites
for each row
execute function private.guard_site_update();

create trigger sites_hide_tasks
after update on public.sites
for each row
execute function private.hide_site_tasks();

alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.stages enable row level security;
alter table public.tasks enable row level security;
alter table public.history enable row level security;

alter table public.profiles force row level security;
alter table public.sites force row level security;
alter table public.stages force row level security;
alter table public.tasks force row level security;
alter table public.history force row level security;

create policy profiles_select
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_manager())
  or exists (
    select 1
    from public.tasks as task_row
    where task_row.author_id = profiles.id
      and task_row.assignee_id = (select auth.uid())
      and not task_row.is_deleted
  )
);

create policy sites_select
on public.sites
for select
to authenticated
using (
  not is_deleted
  and (
    (select private.is_manager())
    or exists (
      select 1
      from public.tasks as task_row
      where task_row.site_id = sites.id
        and task_row.assignee_id = (select auth.uid())
        and not task_row.is_deleted
    )
  )
);

create policy sites_insert
on public.sites
for insert
to authenticated
with check ((select private.is_manager()) and not is_deleted);

create policy sites_update
on public.sites
for update
to authenticated
using (not is_deleted and (select private.is_manager()))
with check ((select private.is_manager()));

create policy stages_select
on public.stages
for select
to authenticated
using ((select auth.uid()) is not null);

create policy tasks_select
on public.tasks
for select
to authenticated
using (
  not is_deleted
  and (
    (select private.is_manager())
    or assignee_id = (select auth.uid())
  )
);

create policy tasks_insert
on public.tasks
for insert
to authenticated
with check (
  (select private.is_manager())
  and author_id = (select auth.uid())
  and not is_deleted
);

create policy tasks_update_manager
on public.tasks
for update
to authenticated
using (not is_deleted and (select private.is_manager()))
with check ((select private.is_manager()));

create policy tasks_update_executor
on public.tasks
for update
to authenticated
using (
  not is_deleted
  and assignee_id = (select auth.uid())
)
with check (assignee_id = (select auth.uid()));

create policy history_select
on public.history
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks as task_row
    where task_row.id = history.task_id
  )
);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.sites from anon, authenticated;
revoke all on table public.stages from anon, authenticated;
revoke all on table public.tasks from anon, authenticated;
revoke all on table public.history from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select, insert on table public.sites to authenticated;
grant update (title, address, is_deleted) on table public.sites to authenticated;
grant select on table public.stages to authenticated;
grant select, insert on table public.tasks to authenticated;
grant update (title, description, site_id, is_deleted) on table public.tasks to authenticated;
grant select on table public.history to authenticated;

revoke all on sequence public.sites_id_seq from anon, authenticated;
revoke all on sequence public.stages_id_seq from anon, authenticated;
revoke all on sequence public.tasks_id_seq from anon, authenticated;
revoke all on sequence public.history_id_seq from anon, authenticated;
grant usage, select on sequence public.sites_id_seq to authenticated;
grant usage, select on sequence public.tasks_id_seq to authenticated;

revoke all on function private.is_manager() from public, anon, authenticated;
revoke all on function private.prepare_task_insert() from public, anon, authenticated;
revoke all on function private.record_task_created() from public, anon, authenticated;
revoke all on function private.guard_task_update() from public, anon, authenticated;
revoke all on function private.guard_site_insert() from public, anon, authenticated;
revoke all on function private.guard_site_update() from public, anon, authenticated;
revoke all on function private.hide_site_tasks() from public, anon, authenticated;
revoke all on function private.transition_task(bigint, bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.transition_task(bigint, bigint, bigint, text) from public, anon, authenticated;

grant execute on function private.is_manager() to authenticated;
grant execute on function private.transition_task(bigint, bigint, bigint, text) to authenticated;
grant execute on function public.transition_task(bigint, bigint, bigint, text) to authenticated;

grant usage on type public.app_role to authenticated;

insert into public.stages (code, title, sort, exits)
values
  (
    'new',
    'Новая',
    1,
    '[{"to":"in_progress","actor":"assignee","comment_required":false}]'::jsonb
  ),
  (
    'in_progress',
    'В работе',
    2,
    '[{"to":"in_review","actor":"assignee","comment_required":false}]'::jsonb
  ),
  (
    'in_review',
    'На проверке',
    3,
    '[
      {"to":"accepted","actor":"author","comment_required":false},
      {"to":"rework","actor":"author","comment_required":true}
    ]'::jsonb
  ),
  ('accepted', 'Принята', 4, '[]'::jsonb),
  (
    'rework',
    'На доработке',
    5,
    '[{"to":"in_progress","actor":"assignee","comment_required":false}]'::jsonb
  );

do $$
declare
  invalid_exit_count integer;
begin
  select count(*)
  into invalid_exit_count
  from public.stages as stage_row
  cross join lateral jsonb_array_elements(stage_row.exits) as exit_item
  where jsonb_typeof(exit_item) <> 'object'
    or coalesce(exit_item->>'actor', '') not in ('assignee', 'author')
    or not exists (
      select 1
      from public.stages as target_stage
      where target_stage.code = exit_item->>'to'
    );

  if invalid_exit_count > 0 then
    raise exception 'invalid stage exits';
  end if;
end;
$$;

notify pgrst, 'reload schema';
