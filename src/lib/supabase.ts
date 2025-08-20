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
  folder_id?: string
  created_at: string
}

export type Task = {
  id: string
  user_id: string
  title: string
  description?: string
  subject?: string
  due_date?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
}

export type StudyGroup = {
  id: string
  name: string
  description?: string
  created_by: string
  is_private: boolean
  created_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export type GroupMessage = {
  id: string
  group_id: string
  user_id: string
  message: string
  created_at: string
}

export type StudyEvent = {
  id: string
  user_id: string
  title: string
  description?: string
  event_type: 'study' | 'exam' | 'lecture' | 'assignment'
  start_date: string
  end_date?: string
  subject?: string
  created_at: string
}

export type FileFolder = {
  id: string
  user_id: string
  name: string
  parent_id?: string
  created_at: string
}

export type UserPreferences = {
  id: string
  user_id: string
  theme: 'light' | 'dark'
  primary_color: string
  notifications_enabled: boolean
  sound_enabled: boolean
  created_at: string
  updated_at: string
}