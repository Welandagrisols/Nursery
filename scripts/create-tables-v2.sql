-- Update the script to ensure it works correctly with existing tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update inventory table to support both plants and consumables
ALTER TABLE IF EXISTS public.inventory 
ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'Plant',
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Pieces';

-- Create index on item_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_inventory_item_type ON public.inventory(item_type);

-- Update existing records to have item_type = 'Plant'
UPDATE public.inventory SET item_type = 'Plant' WHERE item_type IS NULL;

-- Add comments to explain dual-purpose fields
COMMENT ON COLUMN public.inventory.plant_name IS 'Plant name or consumable item name';
COMMENT ON COLUMN public.inventory.scientific_name IS 'Scientific name for plants, unused for consumables';
COMMENT ON COLUMN public.inventory.date_planted IS 'Date planted for plants, purchase date for consumables';
COMMENT ON COLUMN public.inventory.section IS 'Section for plants, storage location for consumables';
COMMENT ON COLUMN public.inventory.source IS 'Source for plants, supplier for consumables';
