
-- Clear existing stories and update with website structure
DELETE FROM public.impact_stories;

-- Insert Water section stories (11 springs as per website structure)
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
('Kibochi Spring', 'Coming soon - rehabilitation story and community impact details will be added here.', 'water', 11, true);

-- Insert Food Security section placeholder
INSERT INTO public.impact_stories (title, text, category, display_order, is_published) VALUES
('Food Security Initiatives', 'Coming soon - food security impact stories and community projects will be added here.', 'food_security', 1, true);

-- Insert Beautification section placeholder  
INSERT INTO public.impact_stories (title, text, category, display_order, is_published) VALUES
('Community Beautification Projects', 'Coming soon - beautification impact stories and community projects will be added here.', 'beautification', 1, true);
