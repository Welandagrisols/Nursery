
import { z } from "zod"

export const inventorySchema = z.object({
  plant_name: z.string().min(1, "Plant name is required").max(255),
  scientific_name: z.string().max(255).optional(),
  category: z.string().min(1, "Category is required"),
  quantity: z.number().int().min(0, "Quantity must be 0 or greater"),
  age: z.string().max(100).optional(),
  date_planted: z.string().optional(),
  status: z.enum(["Healthy", "Attention", "Critical", "Sold"]),
  price: z.number().min(0, "Price must be 0 or greater"),
  batch_cost: z.number().min(0, "Batch cost must be 0 or greater").optional(),
  cost_per_seedling: z.number().min(0, "Cost per seedling must be 0 or greater").optional(),
  sku: z.string().min(1, "SKU is required").max(50),
  section: z.string().max(50).optional(),
  row: z.string().max(50).optional(),
  source: z.string().max(255).optional(),
})

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  contact: z.string().min(1, "Contact is required").max(100),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
})

export const saleSchema = z.object({
  inventory_id: z.string().uuid("Invalid inventory ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  sale_date: z.string().min(1, "Sale date is required"),
  customer_id: z.string().uuid("Invalid customer ID").optional(),
  total_amount: z.number().min(0, "Total amount must be 0 or greater"),
})

export function validateInventory(data: any) {
  return inventorySchema.safeParse(data)
}

export function validateCustomer(data: any) {
  return customerSchema.safeParse(data)
}

export function validateSale(data: any) {
  return saleSchema.safeParse(data)
}
