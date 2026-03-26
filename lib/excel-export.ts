import * as XLSX from "xlsx"

export function exportToExcel(data: any[], fileName: string) {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new()

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data)

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data")

    // Generate Excel file as a binary string
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

    // Convert buffer to Blob
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${fileName}.xlsx`

    // Append to body, trigger download, and clean up
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return true
  } catch (error) {
    console.error("Error exporting to Excel:", error)
    return false
  }
}

// Helper function to check if an item is a consumable
function isConsumable(item: any) {
  return (
    (item.category && item.category.startsWith("Consumable:")) ||
    (item.scientific_name && item.scientific_name.startsWith("[Consumable]"))
  )
}

// Helper function to extract unit from scientific_name
function getConsumableUnit(item: any) {
  if (item.scientific_name && item.scientific_name.startsWith("[Consumable]")) {
    return item.scientific_name.replace("[Consumable] ", "")
  }
  return "Pieces"
}

// Helper function to extract real category from prefixed category
function getConsumableCategory(item: any) {
  if (item.category && item.category.startsWith("Consumable:")) {
    return item.category.replace("Consumable: ", "")
  }
  return item.category
}

// Update the formatInventoryForExport function to include cost tracking
export function formatInventoryForExport(inventoryData: any[], isConsumablesTab = false) {
  return inventoryData.map((item) => {
    const itemIsConsumable = isConsumablesTab || isConsumable(item)

    if (itemIsConsumable) {
      return {
        "Item Name": item.plant_name,
        Category: getConsumableCategory(item),
        Quantity: item.quantity,
        Unit: getConsumableUnit(item),
        Status: item.status,
        "Price per Unit (Ksh)": item.price,
        "Total Batch Cost (Ksh)": item.batch_cost || 0,
        SKU: item.sku,
        "Storage Location": item.section || "",
        Supplier: item.source || "",
        "Purchase Date": item.date_planted ? new Date(item.date_planted).toLocaleDateString() : "",
        "Last Updated": new Date(item.updated_at).toLocaleDateString(),
      }
    } else {
      // Calculate profit margin for plants
      const costPerSeedling = item.cost_per_seedling || 0
      const sellingPrice = item.price || 0
      const profitMargin = sellingPrice > 0 ? (((sellingPrice - costPerSeedling) / sellingPrice) * 100).toFixed(1) : "0"

      return {
        "Plant Name": item.plant_name,
        "Scientific Name": item.scientific_name || "",
        Category: item.category,
        Quantity: item.quantity,
        Age: item.age || "",
        "Date Planted": item.date_planted ? new Date(item.date_planted).toLocaleDateString() : "",
        Status: item.status,
        "Selling Price per Seedling (Ksh)": item.price,
        "Cost per Seedling (Ksh)": costPerSeedling,
        "Total Batch Cost (Ksh)": item.batch_cost || 0,
        "Profit Margin (%)": profitMargin,
        "Total Batch Value (Ksh)": (item.quantity * item.price).toLocaleString(),
        SKU: item.sku,
        Section: item.section || "",
        Row: item.row || "",
        Source: item.source || "",
        "Last Updated": new Date(item.updated_at).toLocaleDateString(),
      }
    }
  })
}

// Format sales data for Excel export with profit calculations
export function formatSalesForExport(salesData: any[]) {
  return salesData.map((sale) => {
    const costPerSeedling = sale.inventory?.cost_per_seedling || 0
    const sellingPrice = sale.inventory?.price || 0
    const totalCost = costPerSeedling * sale.quantity
    const profit = sale.total_amount - totalCost
    const profitMargin = sale.total_amount > 0 ? ((profit / sale.total_amount) * 100).toFixed(1) : "0"

    return {
      Date: new Date(sale.sale_date).toLocaleDateString(),
      Plant: sale.inventory?.plant_name || "Unknown",
      Category: sale.inventory?.category || "",
      Quantity: sale.quantity,
      "Unit Selling Price (Ksh)": sellingPrice,
      "Unit Cost (Ksh)": costPerSeedling,
      "Total Revenue (Ksh)": sale.total_amount,
      "Total Cost (Ksh)": totalCost,
      "Profit (Ksh)": profit,
      "Profit Margin (%)": profitMargin,
      Customer: sale.customer?.name || "Walk-in Customer",
      "Customer Contact": sale.customer?.contact || "",
    }
  })
}
