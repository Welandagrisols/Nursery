
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function cleanupOrphanedImages() {
  console.log('🗑️  CLEANUP ORPHANED IMAGES')
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
    
    // Get all inventory items with images
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('image_url')
      .not('image_url', 'is', null)
      .neq('image_url', '')
    
    if (inventoryError) {
      console.error('❌ Error fetching inventory:', inventoryError.message)
      return
    }

    console.log(`Found ${inventory.length} inventory items with images`)
    
    // Extract filenames from inventory image URLs
    const linkedFilenames = new Set()
    inventory.forEach(item => {
      if (item.image_url) {
        // Extract filename from URL: https://...supabase.co/storage/v1/object/public/plant-images/plants/filename.jpg
        const urlParts = item.image_url.split('/')
        const filename = urlParts[urlParts.length - 1]
        if (filename) {
          linkedFilenames.add(filename)
        }
      }
    })

    console.log(`Found ${linkedFilenames.size} linked image files`)
    
    // Find orphaned files (files not linked to any inventory item)
    const orphanedFiles = files.filter(file => !linkedFilenames.has(file.name))
    
    console.log(`\n📊 ANALYSIS:`)
    console.log(`   Total files in storage: ${files.length}`)
    console.log(`   Files linked to inventory: ${linkedFilenames.size}`)
    console.log(`   Orphaned files: ${orphanedFiles.length}`)
    
    if (orphanedFiles.length === 0) {
      console.log('\n✅ No orphaned files found. All images are properly linked!')
      return
    }

    console.log(`\n🗑️  ORPHANED FILES TO DELETE (${orphanedFiles.length}):`)
    orphanedFiles.forEach((file, index) => {
      const sizeKB = file.metadata?.size ? (file.metadata.size / 1024).toFixed(1) : 'Unknown'
      console.log(`   ${index + 1}. ${file.name} (${sizeKB}KB)`)
    })

    // Prompt for confirmation
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      rl.question('\n⚠️  Are you sure you want to delete these orphaned files? (yes/no): ', resolve)
    })
    rl.close()

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Cleanup cancelled by user')
      return
    }

    // Delete orphaned files
    console.log('\n🗑️  DELETING ORPHANED FILES...')
    let deletedCount = 0
    let failedCount = 0

    for (const file of orphanedFiles) {
      try {
        const filePath = `plants/${file.name}`
        const { error } = await supabase.storage
          .from('plant-images')
          .remove([filePath])

        if (error) {
          console.error(`❌ Failed to delete ${file.name}:`, error.message)
          failedCount++
        } else {
          console.log(`✅ Deleted: ${file.name}`)
          deletedCount++
        }
      } catch (error) {
        console.error(`❌ Error deleting ${file.name}:`, error.message)
        failedCount++
      }
    }

    console.log('\n📊 CLEANUP SUMMARY:')
    console.log(`✅ Successfully deleted: ${deletedCount} files`)
    if (failedCount > 0) {
      console.log(`❌ Failed to delete: ${failedCount} files`)
    }
    console.log(`💾 Storage space freed up!`)

    // Final verification
    const { data: remainingFiles } = await supabase.storage
      .from('plant-images')
      .list('plants', { limit: 1000 })
    
    console.log(`\n🔍 VERIFICATION:`)
    console.log(`   Files remaining in storage: ${remainingFiles?.length || 0}`)
    console.log(`   All remaining files should be linked to inventory items`)

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
  }
}

// Run the cleanup
cleanupOrphanedImages()
