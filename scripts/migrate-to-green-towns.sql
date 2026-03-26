
-- Migration script: Move data from impact_stories to Green Towns Initiative tables
-- Run this in your Supabase SQL Editor AFTER creating the tables

-- First, clear any existing data in the new tables
DELETE FROM water_source_gallery;
DELETE FROM green_champions_gallery;

-- 1. Migrate ALL Water Source stories (category = 'water')
INSERT INTO water_source_gallery (
  spring_name,
  media_url,
  media_type,
  story,
  display_order,
  is_active,
  created_at,
  updated_at
)
SELECT 
  title as spring_name,
  CASE 
    WHEN media_urls IS NOT NULL AND array_length(media_urls, 1) > 0 
    THEN media_urls[1]
    ELSE ''
  END as media_url,
  'image' as media_type,
  text as story,
  display_order,
  is_published as is_active,
  created_at,
  updated_at
FROM impact_stories
WHERE category = 'water'
ORDER BY display_order;

-- 2. Migrate ALL other stories to Green Champions (schools, beautification, etc.)
INSERT INTO green_champions_gallery (
  school_name,
  media_url,
  story,
  display_order,
  is_active,
  created_at,
  updated_at
)
SELECT 
  title as school_name,
  CASE 
    WHEN media_urls IS NOT NULL AND array_length(media_urls, 1) > 0 
    THEN media_urls[1]
    ELSE ''
  END as media_url,
  text as story,
  display_order,
  is_published as is_active,
  created_at,
  updated_at
FROM impact_stories
WHERE category != 'water' OR category IS NULL
ORDER BY display_order;

-- 3. Verify the migration
SELECT 
  'Water Sources Migrated' as table_name,
  COUNT(*) as count
FROM water_source_gallery
UNION ALL
SELECT 
  'Green Champions Migrated' as table_name,
  COUNT(*) as count
FROM green_champions_gallery;

-- 4. Show what was migrated
SELECT 
  category,
  COUNT(*) as story_count
FROM impact_stories
GROUP BY category
ORDER BY category;
