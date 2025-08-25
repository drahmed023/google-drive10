/*
  # Create saved_flashcards table

  1. New Tables
    - `saved_flashcards`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `front` (text, flashcard front content)
      - `back` (text, flashcard back content)
      - `difficulty` (text, difficulty level)
      - `source_file` (text, source file name)
      - `mastered` (boolean, mastery status)
      - `review_count` (integer, number of reviews)
      - `last_reviewed` (timestamptz, last review date)
      - `created_at` (timestamptz, creation date)

  2. Security
    - Enable RLS on `saved_flashcards` table
    - Add policy for authenticated users to manage their own flashcards

  3. Constraints
    - Add check constraint for difficulty values
    - Add indexes for performance
*/

-- Create the saved_flashcards table
CREATE TABLE IF NOT EXISTS saved_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  source_file text NOT NULL,
  mastered boolean DEFAULT false,
  review_count integer DEFAULT 0,
  last_reviewed timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint to auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'saved_flashcards_user_id_fkey'
  ) THEN
    ALTER TABLE saved_flashcards 
    ADD CONSTRAINT saved_flashcards_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add constraint for difficulty values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'saved_flashcards_difficulty_check'
  ) THEN
    ALTER TABLE saved_flashcards 
    ADD CONSTRAINT saved_flashcards_difficulty_check 
    CHECK (difficulty IN ('easy', 'medium', 'hard'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE saved_flashcards ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own flashcards
CREATE POLICY "Users can manage their own flashcards"
  ON saved_flashcards
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_flashcards_user_id ON saved_flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_flashcards_mastered ON saved_flashcards(mastered);
CREATE INDEX IF NOT EXISTS idx_saved_flashcards_created_at ON saved_flashcards(created_at DESC);