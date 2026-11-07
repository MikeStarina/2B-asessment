import { getSupabase, type HistoryEntry } from '@/shared/api/index.ts'

export async function listTaskHistory(taskId: number): Promise<HistoryEntry[]> {
  const { data, error } = await getSupabase()
    .from('history')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) {
    throw error
  }
  return data
}
