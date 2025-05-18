-- V2__add_is_reversed_field.sql
-- Add is_reversed field to flashcodes table

-- Add is_reversed column with a default value of false
ALTER TABLE flashcodes ADD COLUMN is_reversed BOOLEAN NOT NULL DEFAULT 0;

-- Create an index on the new column for better query performance
CREATE INDEX IF NOT EXISTS idx_flashcodes_is_reversed ON flashcodes(is_reversed);