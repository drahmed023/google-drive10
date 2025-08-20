/*
  # Create Study Dashboard Schema

  1. New Tables
    - `study_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `subject` (text)
      - `duration` (integer, minutes)
      - `notes` (text, optional)
      - `created_at` (timestamp)
    
    - `study_files`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `file_path` (text)
      - `file_size` (integer)
      - `file_type` (text)
      - `created_at` (timestamp)

  2. Storage
    - Create `study-files` bucket for file storage

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Set up storage policies for file access
*/

-- Create study_sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create study_files table
CREATE TABLE IF NOT EXISTS study_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  file_type text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_files ENABLE ROW LEVEL SECURITY;

-- Create policies for study_sessions
CREATE POLICY "Users can manage their own study sessions"
  ON study_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for study_files
CREATE POLICY "Users can manage their own files"
  ON study_files
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for study files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('study-files', 'study-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'study-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_files_user_id ON study_files(user_id);
CREATE INDEX IF NOT EXISTS idx_study_files_created_at ON study_files(created_at DESC);