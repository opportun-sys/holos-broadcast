-- Add schedule_active column to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS schedule_active boolean DEFAULT false;