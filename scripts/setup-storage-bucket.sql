
-- Create storage bucket for plant images (only if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('plant-images', 'plant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Allow public read access for plant images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload plant images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update plant images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete plant images" ON storage.objects;

-- Create fresh policies
CREATE POLICY "Allow public read access for plant images" ON storage.objects
FOR SELECT USING (bucket_id = 'plant-images');

CREATE POLICY "Allow authenticated users to upload plant images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'plant-images');

CREATE POLICY "Allow authenticated users to update plant images" ON storage.objects
FOR UPDATE USING (bucket_id = 'plant-images');

CREATE POLICY "Allow authenticated users to delete plant images" ON storage.objects
FOR DELETE USING (bucket_id = 'plant-images');
