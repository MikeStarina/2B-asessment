import { getSupabase, type Task } from '@/shared/api/index.ts'

export async function listTasksBySite(siteId: number): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: true })
  if (error) {
    throw error
  }
  return data
}

export async function listTasksByAssignee(assigneeId: string): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .select('*')
    .eq('assignee_id', assigneeId)
    .order('created_at', { ascending: false })
  if (error) {
    throw error
  }
  return data
}

export async function getTask(id: number): Promise<Task | null> {
  const { data, error } = await getSupabase().from('tasks').select('*').eq('id', id).maybeSingle()
  if (error) {
    throw error
  }
  return data
}

export async function createTask(input: {
  title: string
  description: string
  siteId: number
  assigneeId: string
}): Promise<number> {
  const { data, error } = await getSupabase()
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description,
      site_id: input.siteId,
      assignee_id: input.assigneeId,
    })
    .select('id')
    .single()
  if (error) {
    throw error
  }
  return data.id
}

export async function updateTask(
  id: number,
  input: { title: string; description: string; siteId: number },
): Promise<void> {
  const { error } = await getSupabase()
    .from('tasks')
    .update({
      title: input.title,
      description: input.description,
      site_id: input.siteId,
    })
    .eq('id', id)
  if (error) {
    throw error
  }
}

export async function transitionTask(input: {
  taskId: number
  expectedStageId: number
  toStageId: number
  comment: string | null
}): Promise<void> {
  const { error } = await getSupabase().rpc('transition_task', {
    p_task_id: input.taskId,
    p_expected_stage_id: input.expectedStageId,
    p_to_stage_id: input.toStageId,
    p_comment: input.comment,
  })
  if (error) {
    throw error
  }
}
