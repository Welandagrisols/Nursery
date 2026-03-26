-- Add plant_status column to inventory table
-- This allows distinguishing between current nursery plants and potential plants

DO $$ 
BEGIN 
  -- Check if the column doesn't exist before adding it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'plant_status'
  ) THEN
    -- Add the plant_status column with default value and constraint
    ALTER TABLE inventory 
    ADD COLUMN plant_status TEXT DEFAULT 'Current' 
    CHECK (plant_status IN ('Current', 'Potential'));
    
    -- Create an index for better query performance
    CREATE INDEX idx_inventory_plant_status ON inventory(plant_status);
    
    -- Update existing records to have 'Current' status
    UPDATE inventory SET plant_status = 'Current' WHERE plant_status IS NULL;
    
    RAISE NOTICE 'Successfully added plant_status column to inventory table';
  ELSE
    RAISE NOTICE 'plant_status column already exists in inventory table';
  END IF;
END $$;

-- Add a comment to document the column
COMMENT ON COLUMN inventory.plant_status IS 'Status of plant: Current (in nursery) or Potential (planned)';
