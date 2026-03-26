// Process the uploaded plant document and create inventory entries
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Plant data extracted from your document
const plantData = [
  // Indigenous Trees
  { name: "Acacia tortilis", scientific: "Acacia tortilis", category: "Indigenous Trees" },
  { name: "Acacia xanthophloea", scientific: "Acacia xanthophloea", category: "Indigenous Trees" },
  { name: "Balanites aegyptiaca", scientific: "Balanites aegyptiaca", category: "Indigenous Trees" },
  { name: "Commiphora africana", scientific: "Commiphora africana", category: "Indigenous Trees" },
  { name: "Delonix elata", scientific: "Delonix elata", category: "Indigenous Trees" },
  { name: "Ficus sycomorus", scientific: "Ficus sycomorus", category: "Indigenous Trees" },
  { name: "Kigelia africana", scientific: "Kigelia africana", category: "Indigenous Trees" },
  { name: "Tamarindus indica", scientific: "Tamarindus indica", category: "Indigenous Trees" },
  { name: "Adansonia digitata", scientific: "Adansonia digitata", category: "Indigenous Trees" },
  { name: "Combretum molle", scientific: "Combretum molle", category: "Indigenous Trees" },

  // Fruit Trees
  { name: "Mango", scientific: "Mangifera indica", category: "Fruit Trees" },
  { name: "Avocado", scientific: "Persea americana", category: "Fruit Trees" },
  { name: "Orange", scientific: "Citrus sinensis", category: "Fruit Trees" },
  { name: "Lemon", scientific: "Citrus limon", category: "Fruit Trees" },
  { name: "Lime", scientific: "Citrus aurantifolia", category: "Fruit Trees" },
  { name: "Grapefruit", scientific: "Citrus paradisi", category: "Fruit Trees" },
  { name: "Papaya", scientific: "Carica papaya", category: "Fruit Trees" },
  { name: "Guava", scientific: "Psidium guajava", category: "Fruit Trees" },
  { name: "Passion Fruit", scientific: "Passiflora edulis", category: "Fruit Trees" },
  { name: "Banana", scientific: "Musa acuminata", category: "Fruit Trees" },

  // Ornamental Trees
  { name: "Jacaranda", scientific: "Jacaranda mimosifolia", category: "Ornamentals" },
  { name: "Flame Tree", scientific: "Delonix regia", category: "Ornamentals" },
  { name: "Bottlebrush", scientific: "Callistemon citrinus", category: "Ornamentals" },
  { name: "Cassia", scientific: "Cassia fistula", category: "Ornamentals" },
  { name: "Bougainvillea", scientific: "Bougainvillea spectabilis", category: "Ornamentals" },
  { name: "Hibiscus", scientific: "Hibiscus rosa-sinensis", category: "Ornamentals" },
  { name: "Frangipani", scientific: "Plumeria rubra", category: "Ornamentals" },
  { name: "Croton", scientific: "Codiaeum variegatum", category: "Ornamentals" },
  { name: "Ixora", scientific: "Ixora coccinea", category: "Ornamentals" },
  { name: "Oleander", scientific: "Nerium oleander", category: "Ornamentals" },

  // Palms
  { name: "Coconut Palm", scientific: "Cocos nucifera", category: "Palms" },
  { name: "Date Palm", scientific: "Phoenix dactylifera", category: "Palms" },
  { name: "Royal Palm", scientific: "Roystonea regia", category: "Palms" },
  { name: "Fan Palm", scientific: "Livistona chinensis", category: "Palms" },
  { name: "Areca Palm", scientific: "Dypsis lutescens", category: "Palms" },

  // Herbs and Medicinal Plants
  { name: "Aloe Vera", scientific: "Aloe barbadensis", category: "Herbs" },
  { name: "Moringa", scientific: "Moringa oleifera", category: "Herbs" },
  { name: "Neem", scientific: "Azadirachta indica", category: "Herbs" },
  { name: "Basil", scientific: "Ocimum basilicum", category: "Herbs" },
  { name: "Mint", scientific: "Mentha spicata", category: "Herbs" },
  { name: "Rosemary", scientific: "Rosmarinus officinalis", category: "Herbs" },
  { name: "Thyme", scientific: "Thymus vulgaris", category: "Herbs" },
  { name: "Sage", scientific: "Salvia officinalis", category: "Herbs" },
  { name: "Oregano", scientific: "Origanum vulgare", category: "Herbs" },
  { name: "Lemongrass", scientific: "Cymbopogon citratus", category: "Herbs" },

  // Flowers
  { name: "Marigold", scientific: "Tagetes erecta", category: "Flowers" },
  { name: "Sunflower", scientific: "Helianthus annuus", category: "Flowers" },
  { name: "Zinnia", scientific: "Zinnia elegans", category: "Flowers" },
  { name: "Petunia", scientific: "Petunia hybrida", category: "Flowers" },
  { name: "Impatiens", scientific: "Impatiens walleriana", category: "Flowers" },
  { name: "Salvia", scientific: "Salvia splendens", category: "Flowers" },
  { name: "Celosia", scientific: "Celosia argentea", category: "Flowers" },
  { name: "Vinca", scientific: "Catharanthus roseus", category: "Flowers" },
  { name: "Cosmos", scientific: "Cosmos bipinnatus", category: "Flowers" },
  { name: "Dahlia", scientific: "Dahlia pinnata", category: "Flowers" },
]

async function importPlants() {
  console.log("Starting bulk plant import...")
  console.log(`Processing ${plantData.length} plants`)

  const inventoryData = plantData.map((plant, index) => {
    // Generate SKU
    const prefix = plant.category.substring(0, 3).toUpperCase()
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const sku = `${prefix}${randomNum}`

    // Set pricing based on category
    let price = 50 // Default price
    let batchCost = 3000 // Default batch cost for 100 seedlings

    switch (plant.category) {
      case "Indigenous Trees":
        price = 45
        batchCost = 2500
        break
      case "Fruit Trees":
        price = 80
        batchCost = 4500
        break
      case "Ornamentals":
        price = 60
        batchCost = 3500
        break
      case "Palms":
        price = 120
        batchCost = 6000
        break
      case "Herbs":
        price = 35
        batchCost = 2000
        break
      case "Flowers":
        price = 25
        batchCost = 1500
        break
    }

    return {
      plant_name: plant.name,
      scientific_name: plant.scientific,
      category: plant.category,
      quantity: 100, // Default as requested
      price: price,
      batch_cost: batchCost,
      cost_per_seedling: batchCost / 100,
      status: "Healthy",
      sku: sku,
      item_type: "Plant",
      ready_for_sale: true,
      source: "Bulk Import - Document",
      age: "6 months",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  })

  try {
    // Insert in batches of 10 to avoid overwhelming the database
    const batchSize = 10
    let totalInserted = 0

    for (let i = 0; i < inventoryData.length; i += batchSize) {
      const batch = inventoryData.slice(i, i + batchSize)

      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(inventoryData.length / batchSize)}`)

      const { data, error } = await supabase.from("inventory").insert(batch).select()

      if (error) {
        console.error("Error inserting batch:", error)
        console.error(
          "Failed batch:",
          batch.map((item) => item.plant_name),
        )
      } else {
        totalInserted += batch.length
        console.log(`Successfully inserted ${batch.length} plants`)
      }

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    console.log(`\n✅ Import completed!`)
    console.log(`📊 Total plants processed: ${plantData.length}`)
    console.log(`✅ Successfully imported: ${totalInserted}`)
    console.log(`❌ Failed imports: ${plantData.length - totalInserted}`)

    // Summary by category
    const categorySummary = {}
    inventoryData.forEach((plant) => {
      categorySummary[plant.category] = (categorySummary[plant.category] || 0) + 1
    })

    console.log("\n📋 Summary by category:")
    Object.entries(categorySummary).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} plants`)
    })
  } catch (error) {
    console.error("Fatal error during import:", error)
  }
}

// Run the import
importPlants()
