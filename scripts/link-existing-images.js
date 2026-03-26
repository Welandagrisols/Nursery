
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function linkExistingImages() {
  console.log('🔗 LINKING EXISTING IMAGES TO INVENTORY ITEMS')
  console.log('=' .repeat(50))
  
  try {
    // Get all files from the plant-images bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('plant-images')
      .list('plants', { limit: 1000 })
    
    if (filesError) {
      console.error('❌ Error fetching files from storage:', filesError.message)
      return
    }

    console.log(`Found ${files.length} images in storage`)
    
    // Get all inventory items without images
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('id, plant_name, scientific_name, image_url')
      .or('image_url.is.null,image_url.eq.')
    
    if (inventoryError) {
      console.error('❌ Error fetching inventory:', inventoryError.message)
      return
    }

    console.log(`Found ${inventory.length} inventory items without images`)
    
    let linked = 0
    let skipped = 0
    
    for (const item of inventory) {
      // Try to find a matching image file
      const matchingFile = files.find(file => {
        const fileName = file.name.toLowerCase()
        const plantName = item.plant_name.toLowerCase()
        const scientificName = (item.scientific_name || '').toLowerCase()
        
        // Check if filename contains plant name or scientific name
        return fileName.includes(plantName.replace(/\s+/g, '')) ||
               fileName.includes(plantName.replace(/\s+/g, '-')) ||
               fileName.includes(plantName.replace(/\s+/g, '_')) ||
               (scientificName && fileName.includes(scientificName.replace(/\s+/g, ''))) ||
               (scientificName && fileName.includes(scientificName.replace(/\s+/g, '-')))
      })
      
      if (matchingFile) {
        // Generate the public URL for the image
        const { data: { publicUrl } } = supabase.storage
          .from('plant-images')
          .getPublicUrl(`plants/${matchingFile.name}`)
        
        // Update the inventory item with the image URL
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ 
            image_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
        
        if (updateError) {
          console.error(`❌ Error updating ${item.plant_name}:`, updateError.message)
        } else {
          console.log(`✅ Linked ${item.plant_name} with ${matchingFile.name}`)
          linked++
        }
      } else {
        console.log(`⚠️  No matching image found for ${item.plant_name}`)
        skipped++
      }
    }
    
    console.log(`\n📊 SUMMARY:`)
    console.log(`✅ Linked: ${linked} items`)
    console.log(`⚠️  No match: ${skipped} items`)
    
    if (linked > 0) {
      console.log(`\n🎉 Success! ${linked} items now have linked images.`)
    }
    
    // List remaining unlinked files
    const linkedFileNames = inventory
      .filter(item => item.image_url)
      .map(item => {
        const url = item.image_url
        return url.split('/').pop()
      })
    
    const unlinkedFiles = files.filter(file => !linkedFileNames.includes(file.name))
    
    if (unlinkedFiles.length > 0) {
      console.log(`\n📁 UNLINKED FILES (${unlinkedFiles.length}):`)
      unlinkedFiles.forEach(file => {
        console.log(`   ${file.name}`)
      })
      console.log('\nYou may want to manually review these files.')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

linkExistingImages()
