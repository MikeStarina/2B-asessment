import { getSupabase, type Stage } from '@/shared/api/index.ts'

export async function listStages(): Promise<Stage[]> {
  const { data, error } = await getSupabase()
    .from('stages')
    .select('*')
    .order('sort', { ascending: true })
  if (error) {
    throw error
  }
  return data
}

export function stageTitle(stages: readonly Stage[], stageId: number | null): string {
  if (stageId == null) {
    return ''
  }
  return stages.find((stage) => stage.id === stageId)?.title ?? '—'
}

export function stageByCode(stages: readonly Stage[], code: string): Stage | undefined {
  return stages.find((stage) => stage.code === code)
}
