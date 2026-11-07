-- One update policy for tasks: a manager or the assignee.
-- The column guard still rejects an executor's edit and a direct stage change.
-- The platform event trigger stays, but anonymous clients cannot call it.

drop policy tasks_update_executor on public.tasks;
drop policy tasks_update_manager on public.tasks;

create policy tasks_update
on public.tasks
for update
to authenticated
using (
  not is_deleted
  and (
    (select private.is_manager())
    or assignee_id = (select auth.uid())
  )
)
with check (
  (select private.is_manager())
  or assignee_id = (select auth.uid())
);

revoke all on function public.rls_auto_enable() from public, anon, authenticated;
