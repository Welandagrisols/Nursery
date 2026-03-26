-- Add cost tracking fields to the inventory table
ALTER TABLE IF EXISTS public.inventory 
ADD COLUMN IF NOT EXISTS batch_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_seedling DECIMAL(10, 2) DEFAULT 0;

-- Add comments to explain the new fields
COMMENT ON COLUMN public.inventory.batch_cost IS 'Total cost for the entire batch of seedlings';
COMMENT ON COLUMN public.inventory.cost_per_seedling IS 'Cost per individual seedling (batch_cost / quantity)';

-- Create index for cost tracking queries
CREATE INDEX IF NOT EXISTS idx_inventory_cost_per_seedling ON public.inventory(cost_per_seedling);

-- Update existing records to have default values
UPDATE public.inventory 
SET batch_cost = 0, cost_per_seedling = 0 
WHERE batch_cost IS NULL OR cost_per_seedling IS NULL;
