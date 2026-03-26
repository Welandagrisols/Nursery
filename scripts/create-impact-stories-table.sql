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

-- Insert sample data for the 11 springs (Water category)
INSERT INTO public.impact_stories (title, text, category, display_order) VALUES
('Kinyanjui Spring', 'We rehabilitated Kinyanjui Spring, providing clean water access to over 200 families in the community. The project included installing proper drainage systems and protecting the water source from contamination.', 'water', 1),
('Mukuyu Spring', 'Mukuyu Spring rehabilitation brought clean water to the heart of the village. Community members now have safe drinking water just minutes from their homes, improving health outcomes for all.', 'water', 2),
('Kiambere Spring', 'The Kiambere Spring project transformed water access for local schools and health centers. Children no longer miss school to fetch water from distant sources.', 'water', 3),
('Githunguri Spring', 'Githunguri Spring rehabilitation included community training on water conservation and maintenance. The community now actively protects and maintains their water source.', 'water', 4),
('Kagumo Spring', 'Kagumo Spring project brought relief to farmers who previously struggled with water scarcity. Agricultural productivity has increased significantly in the area.', 'water', 5),
('Ndundu Spring', 'Ndundu Spring rehabilitation provided clean water access to over 150 households. The project included building protective barriers and proper water collection points.', 'water', 6),
('Karura Spring', 'Karura Spring project focused on environmental conservation alongside water access. We planted trees around the spring to protect the watershed.', 'water', 7),
('Kirichwa Spring', 'Kirichwa Spring rehabilitation reduced water-related diseases in the community by 70%. Families now have access to clean, safe drinking water year-round.', 'water', 8),
('Nyabira Spring', 'Nyabira Spring project included building a community center near the water source. The space is now used for health education and community meetings.', 'water', 9),
('Muthurwa Spring', 'Muthurwa Spring rehabilitation brought clean water to a previously underserved area. Women in the community report saving hours each day on water collection.', 'water', 10),
('Kibiko Spring', 'Kibiko Spring project was completed with full community participation. Local residents contributed labor and materials, ensuring long-term sustainability of the water source.', 'water', 11);

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";