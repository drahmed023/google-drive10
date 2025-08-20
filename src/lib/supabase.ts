import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export type StudySession = {
  id: string
  user_id: string
  subject: string
  duration: number
  created_at: string
  notes?: string
}

export type StudyFile = {
  id: string
  user_id: string
  name: string
  file_path: string
  file_size: number
  file_type: string
  created_at: string
}