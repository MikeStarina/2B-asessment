import { getSupabase, type Site } from '@/shared/api/index.ts'

export async function listSites(): Promise<Site[]> {
  const { data, error } = await getSupabase().from('sites').select('*')
  if (error) {
    throw error
  }
  return data.toSorted((left, right) => left.title.localeCompare(right.title, 'ru'))
}

export async function getSite(id: number): Promise<Site | null> {
  const { data, error } = await getSupabase().from('sites').select('*').eq('id', id).maybeSingle()
  if (error) {
    throw error
  }
  return data
}

export async function createSite(input: { title: string; address: string }): Promise<number> {
  const { data, error } = await getSupabase()
    .from('sites')
    .insert({ title: input.title, address: input.address })
    .select('id')
    .single()
  if (error) {
    throw error
  }
  return data.id
}

export async function updateSite(
  id: number,
  input: { title: string; address: string },
): Promise<void> {
  const { error } = await getSupabase()
    .from('sites')
    .update({ title: input.title, address: input.address })
    .eq('id', id)
  if (error) {
    throw error
  }
}
