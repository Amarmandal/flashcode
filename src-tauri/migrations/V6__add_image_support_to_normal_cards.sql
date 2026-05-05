-- Add image_data column to normal_cards table to support storing images as base64
ALTER TABLE normal_cards ADD COLUMN image_data TEXT;
