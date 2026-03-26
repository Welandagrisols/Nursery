-- Script to identify and update plant batch statuses
-- This will find the 9-plant batch and 54-plant batch and set their appropriate statuses

-- First, let's see what batches we have by source
SELECT 
    source,
    COUNT(*) as plant_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM inventory 
WHERE item_type = 'Plant' OR item_type IS NULL
GROUP BY source
ORDER BY plant_count DESC;

-- Update the 9-plant batch to be "Currently in Nursery"
-- Assuming they are from "Current Nursery Stock" source
UPDATE inventory 
SET 
    ready_for_sale = true,
    age = '6 months',
    source = 'Current Nursery Stock',
    updated_at = NOW()
WHERE 
    (item_type = 'Plant' OR item_type IS NULL)
    AND (
        source = 'Current Nursery Stock' 
        OR plant_name IN (
            'Nile Tulip', 'Waterberry', 'Wild Plum', 'African Cherry', 
            'Pepper Bark Tree', 'African Olive', 'Meru Oak', 'Yellowwood', 'Giant Bamboo'
        )
    );

-- Update the 54-plant batch to be "Future Plans"
-- Find the largest batch that isn't the 9-plant batch
UPDATE inventory 
SET 
    ready_for_sale = false,
    age = NULL,
    source = 'Future Plants List',
    updated_at = NOW()
WHERE 
    (item_type = 'Plant' OR item_type IS NULL)
    AND id IN (
        SELECT id FROM (
            SELECT 
                id,
                ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
            FROM inventory 
            WHERE 
                (item_type = 'Plant' OR item_type IS NULL)
                AND plant_name NOT IN (
                    'Nile Tulip', 'Waterberry', 'Wild Plum', 'African Cherry', 
                    'Pepper Bark Tree', 'African Olive', 'Meru Oak', 'Yellowwood', 'Giant Bamboo'
                )
        ) ranked
        WHERE rn <= 54
    );

-- Verify the results
SELECT 
    CASE 
        WHEN ready_for_sale = true THEN 'Currently in Nursery'
        WHEN ready_for_sale = false THEN 'Future Plans'
        ELSE 'Unknown'
    END as status,
    COUNT(*) as plant_count,
    source
FROM inventory 
WHERE item_type = 'Plant' OR item_type IS NULL
GROUP BY ready_for_sale, source
ORDER BY ready_for_sale DESC;
