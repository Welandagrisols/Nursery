
-- Create impact_stories table for website management
CREATE TABLE IF NOT EXISTS public.impact_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    media_urls TEXT[],
    category TEXT NOT NULL CHECK (category IN ('water', 'food_security', 'beautification')),
    display_order INTEGER NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_impact_stories_category_order ON public.impact_stories(category, display_order);

-- Enable RLS
ALTER TABLE public.impact_stories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON public.impact_stories
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert initial data based on website structure
INSERT INTO public.impact_stories (title, text, category, display_order, is_published) VALUES
(
  'Mumetet Spring', 
  'Mumetet Spring had lost much of its surrounding vegetation due to deforestation and nearby farming. As a result, water flow reduced and contamination from both animals and people was common. Together with the community, we planted indigenous trees to restore the catchment and constructed a protected water point to reduce direct contact with the spring.

Today, community members can collect water more easily and safely. The protected structure ensures that water remains clean, reliable, and available for households throughout the year, while the restored vegetation helps secure the source for future generations.

Testimonial: "Fetching water has become much easier. The water point is clean and safe, and we no longer worry about contamination when collecting it for our families," shared Ann, a resident.',
  'water', 
  1, 
  true
),
('Masese Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 2, true),
('Choronok Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 3, true),
('Chebululu Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 4, true),
('Korabi Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 5, true),
('Tabet Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 6, true),
('Milimani Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 7, true),
('Bondet Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 8, true),
('Anabomoi Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 9, true),
('Chemeres Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 10, true),
('Kibochi Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 11, true),
('Food Security Initiatives', 'Coming soon - food security impact stories and community projects will be added here.', 'food_security', 1, true),
('Community Beautification Projects', 'Coming soon - beautification impact stories and community projects will be added here.', 'beautification', 1, true);
