/*
  # Create saved flashcards table

  1. New Tables
    - `saved_flashcards`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `front` (text, flashcard front content)
      - `back` (text, flashcard back content)
      - `difficulty` (text, easy/medium/hard)
      - `source_file` (text, original file name)
      - `mastered` (boolean, default false)
      - `review_count` (integer, default 0)
      - `last_reviewed` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `saved_flashcards` table
    - Add policy for users to manage their own flashcards
*/

CREATE TABLE IF NOT EXISTS saved_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  source_file text NOT NULL,
  mastered boolean DEFAULT false,
  review_count integer DEFAULT 0,
  last_reviewed timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add constraint for difficulty values
ALTER TABLE saved_flashcards 
ADD CONSTRAINT saved_flashcards_difficulty_check 
CHECK (difficulty IN ('easy', 'medium', 'hard'));

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