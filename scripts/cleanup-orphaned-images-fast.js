
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fastCleanup() {
  console.log('🗑️  FAST CLEANUP - DELETING ALL ORPHANED IMAGES')
  console.log('=' .repeat(50))
  
  try {
    // Get all files from storage
    const { data: files, error: filesError } = await supabase.storage
      .from('plant-images')
      .list('plants', { limit: 1000 })
    
    if (filesError) {
      console.error('❌ Error fetching files:', filesError.message)
      return
    }

    // Get linked filenames
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('image_url')
      .not('image_url', 'is', null)
      .neq('image_url', '')
    
    if (inventoryError) {
      console.error('❌ Error fetching inventory:', inventoryError.message)
      return
    }

    const linkedFilenames = new Set()
    inventory.forEach(item => {
      if (item.image_url) {
        const filename = item.image_url.split('/').pop()
        if (filename) linkedFilenames.add(filename)
      }
    })

    const orphanedFiles = files.filter(file => !linkedFilenames.has(file.name))
    
    console.log(`📊 Found ${orphanedFiles.length} orphaned files to delete`)
    
    if (orphanedFiles.length === 0) {
      console.log('✅ No orphaned files found!')
      return
    }

    // Delete all orphaned files immediately
    let deleted = 0
    for (const file of orphanedFiles) {
      const { error } = await supabase.storage
        .from('plant-images')
        .remove([`plants/${file.name}`])

      if (!error) {
        console.log(`✅ Deleted: ${file.name}`)
        deleted++
      } else {
        console.error(`❌ Failed: ${file.name}`)
      }
    }

    console.log(`\n🎉 CLEANUP COMPLETE: Deleted ${deleted}/${orphanedFiles.length} files`)

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
  }
}

fastCleanup()
