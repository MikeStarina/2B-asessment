import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.ts'

function readEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'): string {
  const value = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

export const supabaseUrl = readEnv('VITE_SUPABASE_URL')
export const supabaseKey = readEnv('VITE_SUPABASE_PUBLISHABLE_KEY')
export const hasSupabaseEnv = supabaseUrl.length > 0 && supabaseKey.length > 0

const client: SupabaseClient<Database> | null = hasSupabaseEnv
  ? createClient<Database>(supabaseUrl, supabaseKey)
  : null

export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    throw new Error('В .env.local нужны VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY.')
  }
  return client
}
