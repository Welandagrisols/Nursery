"use client";
import type React from "react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { isDemoMode } from "@/lib/supabase";
import { useForm } from "react-hook-form";
 // Import useForm
import {  } from "@/components/ui/dialog";

interface SaleFormData {
  inventory_id: string
  quantity: number
  sale_date: string
  customer_id?: string
  customer_name?: string
  customer_contact?: string
  customer_email?: string
  total_amount: number
}

interface AddSaleFormProps {
  onSuccess: () => void
}

export function AddSaleForm({ onSuccess }: AddSaleFormProps) {
  const [loading, setLoading] = useState(false)
  const [inventory, setInventory] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [mpesaRef, setMpesaRef] = useState("")
  const { toast } = useToast()

  const defaultFormValues = {
    inventory_id: "",
    quantity: 1,
    sale_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    customer_name: "",
    customer_contact: "",
    customer_email: "",
    total_amount: 0,
  }

  // Use useForm from react-hook-form for better form management
  const { register, handleSubmit: handleFormSubmit, watch, setValue, reset, formState: { errors } } = useForm<SaleFormData>({
    defaultValues: defaultFormValues
  })

  const [formData, setFormData] = useState(defaultFormValues)

  useEffect(() => {
    fetchInventory()
    fetchCustomers()
  }, [])

  async function fetchInventory() {
    try {
      const { data, error } = await supabase
        .from("vnms_batches")
        .select("*")
        .gt("quantity", 0)
        .order("plant_name", { ascending: true })

      if (error) throw error
      setInventory(data || [])
    } catch (error: any) {
      console.error("Error fetching inventory:", error)
      toast({
        title: "Error fetching inventory",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase.from("vnms_customers").select("*").order("name", { ascending: true })

      if (error) throw error
      setCustomers(data || [])
    } catch (error: any) {
      console.error("Error fetching customers:", error)
      toast({
        title: "Error fetching customers",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === "quantity") {
      const quantity = Number(value)
      const price = selectedItem?.price || 0
      const newTotal = quantity * price

      setFormData((prev) => ({
        ...prev,
        quantity,
        total_amount: newTotal,
      }))
      setValue("quantity", quantity)
      setValue("total_amount", newTotal)
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
      setValue(name as keyof SaleFormData, value)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === "inventory_id") {
      const item = inventory.find((item) => item.id === value)
      setSelectedItem(item)
      const newTotal = formData.quantity * (item?.price || 0)

      setFormData((prev) => ({
        ...prev,
        inventory_id: value,
        total_amount: newTotal,
      }))
      setValue("inventory_id", value)
      setValue("total_amount", newTotal)
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
      setValue(name as keyof SaleFormData, value)
    }
  }

  const handleSubmit = async (dataFromForm: any) => {
    console.log("handleSubmit called with data:", dataFromForm)

    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase and set up tables to enable recording sales",
        variant: "destructive",
      })
      return
    }

    if (!dataFromForm.inventory_id || dataFromForm.quantity <= 0 || dataFromForm.total_amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please select an item and enter a valid quantity",
        variant: "destructive",
      })
      return
    }

    const selectedInventoryItem = inventory.find(item => item.id === dataFromForm.inventory_id)
    if (!selectedInventoryItem) {
      toast({
        title: "Validation Error",
        description: "Selected item not found in inventory",
        variant: "destructive",
      })
      return
    }

    if (Number(dataFromForm.quantity) > selectedInventoryItem.quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Cannot sell ${dataFromForm.quantity} units. Only ${selectedInventoryItem.quantity} available.`,
        variant: "destructive",
      })
      fetchInventory()
      return
    }

    if (isNewCustomer && (!dataFromForm.customer_name || !dataFromForm.customer_contact)) {
      toast({
        title: "Validation Error",
        description: "Please fill in customer name and contact for new customer",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("Starting sale transaction...")

      let customerId = dataFromForm.customer_id || null

      // If new customer, create customer first
      if (isNewCustomer && dataFromForm.customer_name && dataFromForm.customer_contact) {
        console.log("Creating new customer...")
        const { data: customerData, error: customerError } = await supabase
          .from("vnms_customers")
          .insert({
            name: dataFromForm.customer_name.trim(),
            contact: dataFromForm.customer_contact.trim(),
            email: dataFromForm.customer_email?.trim() || null,
          } as any)
          .select()
          .single()

        if (customerError) {
          console.error("Customer creation error:", customerError)
          toast({
            title: "Error",
            description: `Failed to create customer: ${customerError.message}`,
            variant: "destructive",
          })
          return
        }
        customerId = (customerData as any).id
        console.log("Customer created with ID:", customerId)
      }

      // Insert the sale record
      console.log("Inserting sale record...")
      const { data: saleData, error: saleError } = await supabase
        .from("vnms_sales")
        .insert({
          inventory_id: dataFromForm.inventory_id,
          quantity: Number(dataFromForm.quantity),
          sale_date: dataFromForm.sale_date,
          customer_id: customerId,
          total_amount: Number(dataFromForm.total_amount),
          payment_method: paymentMethod,
          payment_reference: paymentMethod === "M-Pesa" ? mpesaRef || null : null,
        } as any)
        .select()
        .single()

      if (saleError) {
        console.error("Sale insert error:", saleError)
        toast({
          title: "Error",
          description: `Failed to record sale: ${saleError.message}`,
          variant: "destructive",
        })
        return
      }
      console.log("Sale recorded:", saleData)

      // Update inventory quantity
      const newQuantity = selectedInventoryItem.quantity - Number(dataFromForm.quantity)
      console.log("Updating inventory quantity to:", newQuantity)
      
      const { error: inventoryError } = await supabase
        .from("vnms_batches")
        .update({ quantity: newQuantity } as any)
        .eq("id", dataFromForm.inventory_id)

      if (inventoryError) {
        console.error("Inventory update error:", inventoryError)
        toast({
          title: "Warning",
          description: "Sale recorded but inventory update failed. Please check inventory manually.",
          variant: "destructive",
        })
      }

      console.log("Sale transaction completed successfully")

      toast({
        title: "Success",
        description: "Sale recorded successfully!",
      })

      // Reset form
      const resetValues = {
        inventory_id: "",
        quantity: 1,
        sale_date: new Date().toISOString().split("T")[0],
        customer_id: "",
        customer_name: "",
        customer_contact: "",
        customer_email: "",
        total_amount: 0,
      }
      setFormData(resetValues)
      reset(resetValues)

      setSelectedItem(null)
      setIsNewCustomer(false)

      // Refresh inventory to show updated quantities
      fetchInventory()

      console.log("Calling onSuccess...")
      onSuccess()
    } catch (error: any) {
      console.error("Error calling atomic sale RPC:", error)
      toast({
        title: "Error recording sale",
        description: error.message || "Failed to record sale",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[70vh] max-h-[600px]">
      <div className="flex-1 overflow-y-auto pr-2">
        <form id="add-sale-form" onSubmit={handleFormSubmit(handleSubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inventory_id">Select Plant/Seedling *</Label>
              <Select
                value={formData.inventory_id}
                onValueChange={(value) => {
                  handleSelectChange("inventory_id", value);
                  setValue("inventory_id", value); // Update react-hook-form
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plant from inventory" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.plant_name} - {item.quantity} available - Ksh {item.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedItem?.quantity || 1}
                value={formData.quantity}
                {...register("quantity", { required: "Quantity is required", min: { value: 1, message: "Quantity must be at least 1" } })}
                onChange={(e) => {
                  handleChange(e);
                  setValue("quantity", Number(e.target.value)); // Update react-hook-form
                }}
                required
              />
              {selectedItem && (
                <p className="text-sm text-muted-foreground">
                  Available: {selectedItem.quantity} | Price per unit: Ksh {selectedItem.price}
                </p>
              )}
              {errors.quantity && <p className="text-red-500 text-sm">{errors.quantity.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale_date">Sale Date *</Label>
              <Input
                id="sale_date"
                type="date"
                value={formData.sale_date}
                {...register("sale_date", { required: "Sale date is required" })}
                onChange={(e) => {
                  handleChange(e);
                  setValue("sale_date", e.target.value); // Update react-hook-form
                }}
                required
              />
              {errors.sale_date && <p className="text-red-500 text-sm">{errors.sale_date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount (Ksh) *</Label>
              <Input
                id="total_amount"
                type="number"
                value={formData.total_amount}
                readOnly
                className="bg-muted"
                {...register("total_amount", { required: "Total amount is required" })}
              />
              {errors.total_amount && <p className="text-red-500 text-sm">{errors.total_amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Credit">Credit (record now, pay later)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "M-Pesa" && (
              <div className="space-y-2">
                <Label>M-Pesa Reference</Label>
                <Input
                  placeholder="e.g. RCA8L7X2P1"
                  value={mpesaRef}
                  onChange={e => setMpesaRef(e.target.value)}
                  className="font-mono"
                />
              </div>
            )}

            {paymentMethod === "Credit" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                <strong>Credit sale:</strong> This amount will appear in the Creditors tab for collection. A customer must be linked.
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="new-customer"
                checked={isNewCustomer}
                onCheckedChange={(checked) => {
                  setIsNewCustomer(checked === true);
                }}
              />
              <Label htmlFor="new-customer">Add new customer</Label>
            </div>

            {isNewCustomer ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    {...register("customer_name", { required: isNewCustomer ? "Customer name is required" : false })}
                    onChange={(e) => {
                      handleChange(e);
                      setValue("customer_name", e.target.value); // Update react-hook-form
                    }}
                    required={isNewCustomer}
                  />
                  {errors.customer_name && <p className="text-red-500 text-sm">{errors.customer_name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_contact">Customer Contact *</Label>
                  <Input
                    id="customer_contact"
                    value={formData.customer_contact}
                    {...register("customer_contact", { required: isNewCustomer ? "Customer contact is required" : false })}
                    onChange={(e) => {
                      handleChange(e);
                      setValue("customer_contact", e.target.value); // Update react-hook-form
                    }}
                    required={isNewCustomer}
                  />
                  {errors.customer_contact && <p className="text-red-500 text-sm">{errors.customer_contact.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    {...register("customer_email")}
                    onChange={(e) => {
                      handleChange(e);
                      setValue("customer_email", e.target.value); // Update react-hook-form
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="customer_id">Select Customer (Optional)</Label>
                <Select value={formData.customer_id} onValueChange={(value) => {
                  handleSelectChange("customer_id", value);
                  setValue("customer_id", value); // Update react-hook-form
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.contact}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="border-t border-border bg-white pt-4 mt-4">
        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            form="add-sale-form"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
            disabled={loading || isDemoMode}
          >
            {loading ? "Recording Sale..." : "Record Sale"}
          </Button>
        </div>
      </div>
    </div>
  )
}