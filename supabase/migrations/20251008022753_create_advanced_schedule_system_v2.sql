/*
  # Advanced Study Schedule Management System
  
  This migration creates a comprehensive study schedule system with:
  - Study schedules with Excel/CSV import support
  - Schedule items with recurrence patterns
  - Email reminder system with Arabic support
  - AI analysis tracking
  - Reminder logs and statistics
  
  ## New Tables
  
  ### `study_schedules`
  - Schedule management with import support
  
  ### `schedule_items`
  - Individual schedule entries with recurrence
  
  ### `schedule_reminders`
  - Email reminder configuration
  
  ### `reminder_logs`
  - Tracking of sent reminders
  
  ### `ai_schedule_analysis`
  - AI-powered schedule optimization
  
  ## Security
  - Enable RLS on all tables
  - Comprehensive policies for user data protection
*/

-- Create study_schedules table
CREATE TABLE IF NOT EXISTS study_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  schedule_type text NOT NULL DEFAULT 'manual' CHECK (schedule_type IN ('manual', 'imported_excel', 'imported_csv', 'ai_generated')),
  import_file_url text,
  is_active boolean DEFAULT true,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create schedule_items table
CREATE TABLE IF NOT EXISTS schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES study_schedules(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  topic text,
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes int,
  recurrence_pattern text DEFAULT 'once' CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'once')),
  recurrence_days jsonb DEFAULT '[]',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes text,
  completed boolean DEFAULT false,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create schedule_reminders table
CREATE TABLE IF NOT EXISTS schedule_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_item_id uuid REFERENCES schedule_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reminder_time_minutes int NOT NULL CHECK (reminder_time_minutes > 0),
  reminder_method text DEFAULT 'email' CHECK (reminder_method IN ('email', 'notification')),
  is_enabled boolean DEFAULT true,
  language text DEFAULT 'en' CHECK (language IN ('ar', 'en')),
  created_at timestamptz DEFAULT now()
);

-- Create reminder_logs table
CREATE TABLE IF NOT EXISTS reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid REFERENCES schedule_reminders(id) ON DELETE CASCADE NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'snoozed', 'completed')),
  error_message text,
  action_taken text CHECK (action_taken IN ('snooze', 'complete', 'none')),
  snoozed_until timestamptz
);

-- Create ai_schedule_analysis table
CREATE TABLE IF NOT EXISTS ai_schedule_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  schedule_id uuid REFERENCES study_schedules(id) ON DELETE CASCADE,
  analysis_type text NOT NULL CHECK (analysis_type IN ('optimize', 'suggest', 'summarize', 'generate_questions', 'spaced_repetition')),
  input_data jsonb,
  ai_response jsonb,
  tokens_used int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_study_schedules_user_id ON study_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_study_schedules_is_active ON study_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_items_schedule_id ON schedule_items(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_day_of_week ON schedule_items(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_reminders_user_id ON schedule_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_reminders_item_id ON schedule_reminders(schedule_item_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_id ON reminder_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user_id ON ai_schedule_analysis(user_id);

-- Enable RLS
ALTER TABLE study_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_schedule_analysis ENABLE ROW LEVEL SECURITY;

-- Policies for study_schedules
CREATE POLICY "Users can view own schedules"
  ON study_schedules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules"
  ON study_schedules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON study_schedules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON study_schedules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for schedule_items
CREATE POLICY "Users can view own schedule items"
  ON schedule_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_schedules
      WHERE study_schedules.id = schedule_items.schedule_id
      AND study_schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own schedule items"
  ON schedule_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_schedules
      WHERE study_schedules.id = schedule_items.schedule_id
      AND study_schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own schedule items"
  ON schedule_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_schedules
      WHERE study_schedules.id = schedule_items.schedule_id
      AND study_schedules.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_schedules
      WHERE study_schedules.id = schedule_items.schedule_id
      AND study_schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own schedule items"
  ON schedule_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_schedules
      WHERE study_schedules.id = schedule_items.schedule_id
      AND study_schedules.user_id = auth.uid()
    )
  );

-- Policies for schedule_reminders
CREATE POLICY "Users can view own reminders"
  ON schedule_reminders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminders"
  ON schedule_reminders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON schedule_reminders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON schedule_reminders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for reminder_logs
CREATE POLICY "Users can view own reminder logs"
  ON reminder_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedule_reminders
      WHERE schedule_reminders.id = reminder_logs.reminder_id
      AND schedule_reminders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own reminder logs"
  ON reminder_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedule_reminders
      WHERE schedule_reminders.id = reminder_logs.reminder_id
      AND schedule_reminders.user_id = auth.uid()
    )
  );

-- Policies for ai_schedule_analysis
CREATE POLICY "Users can view own AI analysis"
  ON ai_schedule_analysis FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI analysis"
  ON ai_schedule_analysis FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_study_schedules_updated_at') THEN
    CREATE TRIGGER update_study_schedules_updated_at
      BEFORE UPDATE ON study_schedules
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_schedule_items_updated_at') THEN
    CREATE TRIGGER update_schedule_items_updated_at
      BEFORE UPDATE ON schedule_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
