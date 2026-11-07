export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Table<Row extends Record<string, unknown>, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string
          full_name: string
          role: 'manager' | 'executor'
        },
        {
          id: string
          full_name: string
          role: 'manager' | 'executor'
        },
        {
          full_name?: string
          role?: 'manager' | 'executor'
        }
      >
      sites: Table<
        {
          id: number
          title: string
          address: string
          is_deleted: boolean
        },
        {
          id?: number
          title: string
          address: string
          is_deleted?: boolean
        },
        {
          title?: string
          address?: string
          is_deleted?: boolean
        }
      >
      stages: Table<
        {
          id: number
          code: string
          title: string
          sort: number
          exits: Json
        },
        {
          id?: number
          code: string
          title: string
          sort: number
          exits?: Json
        },
        {
          code?: string
          title?: string
          sort?: number
          exits?: Json
        }
      >
      tasks: Table<
        {
          id: number
          title: string
          description: string
          site_id: number
          assignee_id: string
          author_id: string
          stage_id: number
          is_deleted: boolean
          created_at: string
        },
        {
          id?: number
          title: string
          description?: string
          site_id: number
          assignee_id: string
          author_id?: string
          stage_id?: number
          is_deleted?: boolean
          created_at?: string
        },
        {
          title?: string
          description?: string
          site_id?: number
          is_deleted?: boolean
        }
      >
      history: Table<
        {
          id: number
          task_id: number
          actor_id: string
          from_stage_id: number | null
          to_stage_id: number
          comment: string | null
          created_at: string
        },
        {
          id?: number
          task_id: number
          actor_id: string
          from_stage_id?: number | null
          to_stage_id: number
          comment?: string | null
          created_at?: string
        },
        {
          comment?: string | null
        }
      >
    }
    Views: Record<string, never>
    Functions: {
      transition_task: {
        Args: {
          p_task_id: number
          p_expected_stage_id: number
          p_to_stage_id: number
          p_comment: string | null
        }
        Returns: Database['public']['Tables']['tasks']['Row']
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Site = Database['public']['Tables']['sites']['Row']
export type Stage = Database['public']['Tables']['stages']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type HistoryEntry = Database['public']['Tables']['history']['Row']
