
const { createClient } = require('@supabase/supabase-js')

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function examineDatabase() {
  console.log('🔍 Examining database data integrity...\n')
  
  try {
    // 1. Check inventory table structure and data
    console.log('1. INVENTORY TABLE ANALYSIS')
    console.log('=' .repeat(50))
    
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (inventoryError) {
      console.error('❌ Error fetching inventory:', inventoryError.message)
      return
    }
    
    console.log(`✅ Total inventory items: ${inventory.length}`)
    
    if (inventory.length > 0) {
      // Analyze data completeness
      const fieldsAnalysis = {
        plant_name: inventory.filter(i => i.plant_name && i.plant_name.trim() !== '').length,
        scientific_name: inventory.filter(i => i.scientific_name && i.scientific_name.trim() !== '').length,
        category: inventory.filter(i => i.category && i.category.trim() !== '').length,
        price: inventory.filter(i => i.price !== null && i.price !== undefined && i.price > 0).length,
        quantity: inventory.filter(i => i.quantity !== null && i.quantity !== undefined).length,
        description: inventory.filter(i => i.description && i.description.trim() !== '').length,
        image_url: inventory.filter(i => i.image_url && i.image_url.trim() !== '').length,
        sku: inventory.filter(i => i.sku && i.sku.trim() !== '').length,
        ready_for_sale: inventory.filter(i => i.ready_for_sale === true).length,
        status: inventory.filter(i => i.status && i.status.trim() !== '').length,
        age: inventory.filter(i => i.age && i.age.trim() !== '').length
      }
      
      console.log('\nField Completeness Analysis:')
      Object.entries(fieldsAnalysis).forEach(([field, count]) => {
        const percentage = ((count / inventory.length) * 100).toFixed(1)
        const icon = percentage >= 80 ? '✅' : percentage >= 50 ? '⚠️' : '❌'
        console.log(`  ${icon} ${field}: ${count}/${inventory.length} (${percentage}%)`)
      })
      
      // Sample recent entries
      console.log('\nRecent inventory entries (last 5):')
      inventory.slice(0, 5).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.plant_name}`)
        console.log(`   ID: ${item.id}`)
        console.log(`   Scientific Name: ${item.scientific_name || 'Not set'}`)
        console.log(`   Category: ${item.category || 'Not set'}`)
        console.log(`   Price: ${item.price || 'Not set'}`)
        console.log(`   Quantity: ${item.quantity}`)
        console.log(`   Image URL: ${item.image_url ? '✅ Set' : '❌ Not set'}`)
        console.log(`   Ready for Sale: ${item.ready_for_sale ? '✅ Yes' : '❌ No'}`)
        console.log(`   Created: ${new Date(item.created_at).toLocaleString()}`)
        
        if (item.image_url) {
          console.log(`   Image Path: ${item.image_url}`)
        }
      })
    }
    
    // 2. Check image storage
    console.log('\n\n2. IMAGE STORAGE ANALYSIS')
    console.log('=' .repeat(50))
    
    // Check storage bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error fetching buckets:', bucketsError.message)
    } else {
      const plantImagesBucket = buckets.find(bucket => bucket.id === 'plant-images')
      if (plantImagesBucket) {
        console.log('✅ Plant images bucket exists')
        console.log(`   Public: ${plantImagesBucket.public}`)
        console.log(`   Created: ${new Date(plantImagesBucket.created_at).toLocaleString()}`)
        
        // List files in bucket
        const { data: files, error: filesError } = await supabase.storage
          .from('plant-images')
          .list('plants', { limit: 100 })
        
        if (filesError) {
          console.error('❌ Error listing files:', filesError.message)
        } else {
          console.log(`✅ Files in storage: ${files.length}`)
          
          if (files.length > 0) {
            console.log('\nRecent uploaded files:')
            files.slice(0, 10).forEach((file, index) => {
              const sizeKB = file.metadata?.size ? (file.metadata.size / 1024).toFixed(1) : 'Unknown'
              console.log(`  ${index + 1}. ${file.name} (${sizeKB}KB) - ${new Date(file.created_at).toLocaleString()}`)
            })
          }
        }
      } else {
        console.log('❌ Plant images bucket not found')
      }
    }
    
    // 3. Image URL validation
    console.log('\n\n3. IMAGE URL VALIDATION')
    console.log('=' .repeat(50))
    
    const itemsWithImages = inventory.filter(item => item.image_url && item.image_url.trim() !== '')
    console.log(`Items with image URLs: ${itemsWithImages.length}`)
    
    if (itemsWithImages.length > 0) {
      console.log('\nValidating image URLs (testing first 5):')
      
      for (let i = 0; i < Math.min(5, itemsWithImages.length); i++) {
        const item = itemsWithImages[i]
        try {
          const response = await fetch(item.image_url, { method: 'HEAD' })
          const status = response.ok ? '✅' : '❌'
          console.log(`  ${status} ${item.plant_name}: ${response.status} ${response.statusText}`)
          
          if (response.ok) {
            const contentType = response.headers.get('content-type')
            const contentLength = response.headers.get('content-length')
            const sizeMB = contentLength ? (parseInt(contentLength) / (1024 * 1024)).toFixed(2) : 'Unknown'
            console.log(`     Type: ${contentType}, Size: ${sizeMB}MB`)
          }
        } catch (error) {
          console.log(`  ❌ ${item.plant_name}: Network error - ${error.message}`)
        }
      }
    }
    
    // 4. Check other tables
    console.log('\n\n4. OTHER TABLES ANALYSIS')
    console.log('=' .repeat(50))
    
    const tables = ['customers', 'sales', 'tasks', 'honey_inventory', 'consumables']
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(1)
        
        if (error) {
          if (error.message.includes('does not exist')) {
            console.log(`⚠️  Table '${tableName}': Does not exist`)
          } else {
            console.log(`❌ Table '${tableName}': Error - ${error.message}`)
          }
        } else {
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
          
          console.log(`✅ Table '${tableName}': ${count} records`)
        }
      } catch (error) {
        console.log(`❌ Table '${tableName}': Unexpected error - ${error.message}`)
      }
    }
    
    // 5. Data integrity checks
    console.log('\n\n5. DATA INTEGRITY CHECKS')
    console.log('=' .repeat(50))
    
    // Check for duplicates
    const plantNames = inventory.map(item => item.plant_name?.toLowerCase().trim()).filter(Boolean)
    const duplicateNames = plantNames.filter((name, index) => plantNames.indexOf(name) !== index)
    
    if (duplicateNames.length > 0) {
      console.log(`⚠️  Potential duplicate plant names: ${[...new Set(duplicateNames)].length} unique duplicates`)
    } else {
      console.log('✅ No duplicate plant names found')
    }
    
    // Check for orphaned image URLs
    const imageUrls = inventory.map(item => item.image_url).filter(Boolean)
    const supabaseImageUrls = imageUrls.filter(url => url.includes('supabase.co'))
    
    console.log(`✅ Total image URLs: ${imageUrls.length}`)
    console.log(`✅ Supabase-hosted images: ${supabaseImageUrls.length}`)
    console.log(`ℹ️  External image URLs: ${imageUrls.length - supabaseImageUrls.length}`)
    
    // Check price and quantity data types
    const invalidPrices = inventory.filter(item => 
      item.price !== null && item.price !== undefined && (isNaN(item.price) || item.price < 0)
    ).length
    
    const invalidQuantities = inventory.filter(item => 
      item.quantity !== null && item.quantity !== undefined && (isNaN(item.quantity) || item.quantity < 0)
    ).length
    
    if (invalidPrices > 0) {
      console.log(`⚠️  Invalid price values: ${invalidPrices} items`)
    } else {
      console.log('✅ All price values are valid')
    }
    
    if (invalidQuantities > 0) {
      console.log(`⚠️  Invalid quantity values: ${invalidQuantities} items`)
    } else {
      console.log('✅ All quantity values are valid')
    }
    
    // 6. Summary
    console.log('\n\n6. SUMMARY REPORT')
    console.log('=' .repeat(50))
    console.log(`📊 Database Health Score:`)
    
    const healthScore = {
      inventory: inventory.length > 0 ? 100 : 0,
      images: itemsWithImages.length > 0 ? Math.min(100, (itemsWithImages.length / inventory.length) * 100) : 0,
      dataCompleteness: Object.values(fieldsAnalysis).reduce((a, b) => a + b, 0) / (Object.keys(fieldsAnalysis).length * inventory.length) * 100 || 0,
      dataIntegrity: ((invalidPrices === 0 ? 25 : 0) + (invalidQuantities === 0 ? 25 : 0) + (duplicateNames.length === 0 ? 25 : 0) + 25)
    }
    
    Object.entries(healthScore).forEach(([metric, score]) => {
      const icon = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌'
      console.log(`   ${icon} ${metric}: ${score.toFixed(1)}%`)
    })
    
    const overallScore = Object.values(healthScore).reduce((a, b) => a + b, 0) / Object.keys(healthScore).length
    console.log(`\n🎯 Overall Health Score: ${overallScore.toFixed(1)}%`)
    
    if (overallScore >= 80) {
      console.log('🎉 Your database is in excellent condition!')
    } else if (overallScore >= 60) {
      console.log('👍 Your database is in good condition with minor issues.')
    } else {
      console.log('⚠️  Your database needs attention. Consider addressing the issues above.')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during examination:', error.message)
  }
}

// Run the examination
examineDatabase()
