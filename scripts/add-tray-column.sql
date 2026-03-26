-- Run this in your Supabase SQL Editor
-- Adds the 'tray' column to the inventory table for Nursery Layout tracking

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tray TEXT;
