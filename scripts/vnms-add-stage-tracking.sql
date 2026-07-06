-- Adds stage-duration tracking to seedling batches for lifecycle automation/alerts.
-- Run this once in the Supabase SQL Editor.

ALTER TABLE vnms_batches
  ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN vnms_batches.stage_updated_at IS
  'Timestamp of the last lifecycle_status change. Used to flag batches stuck too long in one stage.';

-- Backfill existing rows so "days in stage" starts counting from today, not from batch creation.
UPDATE vnms_batches SET stage_updated_at = COALESCE(updated_at, created_at, NOW())
  WHERE stage_updated_at IS NULL;
