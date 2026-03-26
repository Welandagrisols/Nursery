
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// High-quality plant images from reliable sources
const plantImages = {
  // Indigenous Trees
  'Mukwa': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500',
  'Mubvumira': 'https://images.unsplash.com/photo-1574263867128-a2e8ceef3e1e?w=500',
  'Mukadzi': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500',
  
  // Fruit Trees
  'Avocado': 'https://images.unsplash.com/photo-1554557086-57c4c7ad74f0?w=500',
  'Mango': 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=500',
  'Orange': 'https://images.unsplash.com/photo-1557800636-894a64c1696f?w=500',
  'Lemon': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500',
  'Papaya': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500',
  
  // Ornamentals
  'Jacaranda': 'https://images.unsplash.com/photo-1574263867128-a2e8ceef3e1e?w=500',
  'Bougainvillea': 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=500',
  'Flame Tree': 'https://images.unsplash.com/photo-1574263867128-a2e8ceef3e1e?w=500',
  
  // Herbs
  'Rosemary': 'https://images.unsplash.com/photo-1584119594544-57d6d4f6e3d1?w=500',
  'Basil': 'https://images.unsplash.com/photo-1586492932759-e1e6e8d34a76?w=500',
  'Mint': 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=500',
  
  // Vegetables
  'Tomato': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500',
  'Spinach': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500',
  'Lettuce': 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?w=500',
  
  // Flowers
  'Marigold': 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500',
  'Sunflower': 'https://images.unsplash.com/photo-1470509222361-79cd7b4e7277?w=500',
  'Rose': 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=500'
}

async function addRealImages() {
  console.log('🖼️  ADDING REAL IMAGES TO INVENTORY')
  console.log('=' .repeat(50))
  
  try {
    // Get all inventory items ready for sale without images
    const { data: items, error } = await supabase
      .from('inventory')
      .select('id, plant_name, image_url, ready_for_sale')
      .eq('ready_for_sale', true)
    
    if (error) {
      console.error('❌ Error fetching inventory:', error.message)
      return
    }

    console.log(`Found ${items.length} items ready for sale`)
    
    let updated = 0
    let skipped = 0
    
    for (const item of items) {
      // Skip if already has a working image
      if (item.image_url && item.image_url.trim() !== '') {
        console.log(`⏭️  Skipping ${item.plant_name} - already has image`)
        skipped++
        continue
      }
      
      // Find matching image
      const matchingImage = Object.keys(plantImages).find(key => 
        item.plant_name.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(item.plant_name.toLowerCase())
      )
      
      if (matchingImage) {
        const imageUrl = plantImages[matchingImage]
        
        // Update the item with the image
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ 
            image_url: imageUrl,
            description: item.description || `High quality ${item.plant_name} seedlings perfect for your garden`
          })
          .eq('id', item.id)
        
        if (updateError) {
          console.error(`❌ Error updating ${item.plant_name}:`, updateError.message)
        } else {
          console.log(`✅ Updated ${item.plant_name} with ${matchingImage} image`)
          updated++
        }
      } else {
        console.log(`⚠️  No matching image found for ${item.plant_name}`)
      }
    }
    
    console.log(`\n📊 SUMMARY:`)
    console.log(`✅ Updated: ${updated} items`)
    console.log(`⏭️  Skipped: ${skipped} items`)
    console.log(`⚠️  No match: ${items.length - updated - skipped} items`)
    
    if (updated > 0) {
      console.log(`\n🎉 Success! ${updated} items now have real images.`)
      console.log(`Visit your website to see the changes.`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

addRealImages()
