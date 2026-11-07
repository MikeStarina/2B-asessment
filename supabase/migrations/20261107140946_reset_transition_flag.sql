-- Drop the transition flag after the stage update so a later update in the
-- same transaction is still treated as an ordinary edit.

create or replace function private.transition_task(
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

  perform set_config('app.transition', 'off', true);

  insert into public.history (task_id, actor_id, from_stage_id, to_stage_id, comment)
  values (task_row.id, uid, p_expected_stage_id, p_to_stage_id, cleaned_comment);

  return task_row;
end;
$$;

revoke all on function private.transition_task(bigint, bigint, bigint, text) from public, anon, authenticated;
grant execute on function private.transition_task(bigint, bigint, bigint, text) to authenticated;
