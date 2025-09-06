/*
  # Fix All Database Issues

  1. Tables Creation and Updates
    - Ensure all required tables exist with proper structure
    - Fix any missing columns or constraints
    - Add proper indexes for performance

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for all operations
    - Ensure proper user access control

  3. Functions and Triggers
    - Add functions for automatic calculations
    - Set up triggers for data consistency
    - Handle user creation automatically
*/

-- Create users table if not exists (using auth.uid() function)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create policies for users table
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure study_sessions table exists with all required columns
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  duration integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add task_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'task_id'
  ) THEN
    ALTER TABLE study_sessions ADD COLUMN task_id uuid;
  END IF;
END $$;

-- Enable RLS and create policies for study_sessions
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own study sessions" ON study_sessions;
CREATE POLICY "Users can manage their own study sessions"
  ON study_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure tasks table exists
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  subject text,
  due_date timestamptz,
  completed boolean DEFAULT false,
  priority text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraint for priority if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_priority_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
    CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
END $$;

-- Enable RLS and create policies for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tasks" ON tasks;
CREATE POLICY "Users can manage their own tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure notes table exists with all required columns
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text DEFAULT '',
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns to notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'tags'
  ) THEN
    ALTER TABLE notes ADD COLUMN tags text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'word_count'
  ) THEN
    ALTER TABLE notes ADD COLUMN word_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'reading_time'
  ) THEN
    ALTER TABLE notes ADD COLUMN reading_time integer DEFAULT 0;
  END IF;
END $$;

-- Enable RLS and create policies for notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
DROP POLICY IF EXISTS "Anyone can view shared notes" ON notes;
DROP POLICY IF EXISTS "Public can view shared notes" ON notes;

CREATE POLICY "Users can manage their own notes"
  ON notes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared notes"
  ON notes FOR SELECT
  TO authenticated
  USING (is_shared = true);

CREATE POLICY "Public can view shared notes"
  ON notes FOR SELECT
  TO anon
  USING (is_shared = true);

-- Ensure study_files table exists
CREATE TABLE IF NOT EXISTS study_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size integer DEFAULT 0,
  file_type text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Add folder_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_files' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE study_files ADD COLUMN folder_id uuid;
  END IF;
END $$;

-- Enable RLS and create policies for study_files
ALTER TABLE study_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own files" ON study_files;
CREATE POLICY "Users can manage their own files"
  ON study_files FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure file_folders table exists
CREATE TABLE IF NOT EXISTS file_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for parent_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'file_folders_parent_id_fkey'
  ) THEN
    ALTER TABLE file_folders 
    ADD CONSTRAINT file_folders_parent_id_fkey 
    FOREIGN KEY (parent_id) REFERENCES file_folders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for folder_id in study_files if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'study_files_folder_id_fkey'
  ) THEN
    ALTER TABLE study_files 
    ADD CONSTRAINT study_files_folder_id_fkey 
    FOREIGN KEY (folder_id) REFERENCES file_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS and create policies for file_folders
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own folders" ON file_folders;
CREATE POLICY "Users can manage their own folders"
  ON file_folders FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure study_events table exists
CREATE TABLE IF NOT EXISTS study_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text DEFAULT 'study',
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  subject text,
  created_at timestamptz DEFAULT now()
);

-- Add constraint for event_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'study_events_event_type_check'
  ) THEN
    ALTER TABLE study_events ADD CONSTRAINT study_events_event_type_check 
    CHECK (event_type IN ('study', 'exam', 'lecture', 'assignment'));
  END IF;
END $$;

-- Enable RLS and create policies for study_events
ALTER TABLE study_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own events" ON study_events;
CREATE POLICY "Users can manage their own events"
  ON study_events FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure study_groups table exists
CREATE TABLE IF NOT EXISTS study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and create policies for study_groups
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create groups" ON study_groups;
DROP POLICY IF EXISTS "Users can view public groups and their own groups" ON study_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON study_groups;

CREATE POLICY "Users can create groups"
  ON study_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view public groups and their own groups"
  ON study_groups FOR SELECT
  TO authenticated
  USING (
    NOT is_private OR 
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = study_groups.id 
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can update their groups"
  ON study_groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Ensure group_members table exists
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now()
);

-- Add constraint for role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_members_role_check'
  ) THEN
    ALTER TABLE group_members ADD CONSTRAINT group_members_role_check 
    CHECK (role IN ('admin', 'member'));
  END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_members_group_id_user_id_key'
  ) THEN
    ALTER TABLE group_members ADD CONSTRAINT group_members_group_id_user_id_key 
    UNIQUE(group_id, user_id);
  END IF;
END $$;

-- Enable RLS and create policies for group_members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can view group members of their groups" ON group_members;

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view group members of their groups"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid()
    )
  );

-- Ensure group_messages table exists
CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and create policies for group_messages
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can send messages" ON group_messages;
DROP POLICY IF EXISTS "Group members can view messages" ON group_messages;

CREATE POLICY "Group members can send messages"
  ON group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = group_messages.group_id 
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can view messages"
  ON group_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_members.group_id = group_messages.group_id 
      AND group_members.user_id = auth.uid()
    )
  );

-- Ensure saved_flashcards table exists
CREATE TABLE IF NOT EXISTS saved_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  difficulty text DEFAULT 'medium',
  source_file text NOT NULL,
  mastered boolean DEFAULT false,
  review_count integer DEFAULT 0,
  last_reviewed timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add constraint for difficulty if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'saved_flashcards_difficulty_check'
  ) THEN
    ALTER TABLE saved_flashcards ADD CONSTRAINT saved_flashcards_difficulty_check 
    CHECK (difficulty IN ('easy', 'medium', 'hard'));
  END IF;
END $$;

-- Enable RLS and create policies for saved_flashcards
ALTER TABLE saved_flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own flashcards" ON saved_flashcards;
CREATE POLICY "Users can manage their own flashcards"
  ON saved_flashcards FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure user_preferences table exists
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light',
  primary_color text DEFAULT 'purple',
  notifications_enabled boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraint for theme if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_preferences_theme_check'
  ) THEN
    ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_theme_check 
    CHECK (theme IN ('light', 'dark'));
  END IF;
END $$;

-- Enable RLS and create policies for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to calculate note statistics
CREATE OR REPLACE FUNCTION update_note_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate word count (remove HTML tags first)
  NEW.word_count = COALESCE(
    array_length(
      string_to_array(
        trim(regexp_replace(NEW.content, '<[^>]*>', '', 'g')), 
        ' '
      ), 
      1
    ), 
    0
  );
  
  -- Calculate reading time (assuming 200 words per minute, minimum 1 minute)
  NEW.reading_time = GREATEST(1, CEIL(NEW.word_count::float / 200));
  
  -- Update timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notes statistics
DROP TRIGGER IF EXISTS trigger_update_note_stats ON notes;
CREATE TRIGGER trigger_update_note_stats
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_note_stats();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table
  INSERT INTO users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  
  -- Insert default preferences
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_shared ON notes(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING gin(tags) WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;
CREATE INDEX IF NOT EXISTS idx_notes_word_count ON notes(word_count) WHERE word_count > 0;
CREATE INDEX IF NOT EXISTS idx_notes_shared_updated ON notes(is_shared, updated_at DESC) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_study_files_user_id ON study_files(user_id);
CREATE INDEX IF NOT EXISTS idx_study_files_created_at ON study_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_folders_user_id ON file_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_file_folders_parent_id ON file_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_study_events_user_id ON study_events(user_id);
CREATE INDEX IF NOT EXISTS idx_study_events_start_date ON study_events(start_date);
CREATE INDEX IF NOT EXISTS idx_study_groups_created_by ON study_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_study_groups_is_private ON study_groups(is_private);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_flashcards_user_id ON saved_flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_flashcards_created_at ON saved_flashcards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_flashcards_mastered ON saved_flashcards(mastered);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create storage bucket for study files if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('study-files', 'study-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
  
  -- Create new storage policies
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
EXCEPTION
  WHEN others THEN
    -- If storage policies fail, continue with the migration
    NULL;
END $$;