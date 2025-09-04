/*
  # Fix Notes System and Sharing

  1. Tables Updates
    - Update `notes` table structure
    - Add proper indexes for performance
    - Fix RLS policies for sharing

  2. Security
    - Enable RLS on `notes` table
    - Add policies for authenticated users to manage their notes
    - Add policies for viewing shared notes
    - Add policies for public access to shared notes

  3. Performance
    - Add indexes for better query performance
    - Optimize for shared notes queries
*/

-- Update notes table structure
DO $$
BEGIN
  -- Add missing columns if they don't exist
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

-- Create users table if it doesn't exist (for proper foreign key relationships)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can read own data'
  ) THEN
    CREATE POLICY "Users can read own data"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Create policy for users to insert their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can insert own data'
  ) THEN
    CREATE POLICY "Users can insert own data"
      ON users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Create policy for users to update their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can update own data'
  ) THEN
    CREATE POLICY "Users can update own data"
      ON users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Drop existing policies on notes table to recreate them properly
DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;
DROP POLICY IF EXISTS "Anyone can view shared notes" ON notes;

-- Create comprehensive policies for notes
CREATE POLICY "Users can manage their own notes"
  ON notes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared notes"
  ON notes
  FOR SELECT
  TO authenticated
  USING (is_shared = true);

CREATE POLICY "Public can view shared notes"
  ON notes
  FOR SELECT
  TO anon
  USING (is_shared = true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_shared_updated 
  ON notes (is_shared, updated_at DESC) 
  WHERE is_shared = true;

CREATE INDEX IF NOT EXISTS idx_notes_tags 
  ON notes USING gin(tags) 
  WHERE tags IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notes_word_count 
  ON notes (word_count) 
  WHERE word_count > 0;

-- Create function to automatically update word count and reading time
CREATE OR REPLACE FUNCTION update_note_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate word count (approximate)
  NEW.word_count = array_length(string_to_array(regexp_replace(NEW.content, '<[^>]*>', '', 'g'), ' '), 1);
  
  -- Calculate reading time (average 200 words per minute)
  NEW.reading_time = GREATEST(1, ROUND(NEW.word_count / 200.0));
  
  -- Update timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stats update
DROP TRIGGER IF EXISTS trigger_update_note_stats ON notes;
CREATE TRIGGER trigger_update_note_stats
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_note_stats();

-- Function to automatically create user record on first login
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();