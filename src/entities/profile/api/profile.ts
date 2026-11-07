import { getSupabase, type Profile } from '@/shared/api/index.ts'

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true })
  if (error) {
    throw error
  }
  return data
}

export function profileName(profiles: readonly Profile[], id: string): string {
  return profiles.find((profile) => profile.id === id)?.full_name ?? '—'
}

export function roleLabel(role: Profile['role']): string {
  return role === 'manager' ? 'Постановщик' : 'Исполнитель'
}
