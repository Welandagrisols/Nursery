"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase, isDemoMode } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Loader2 } from "lucide-react";

interface ClearDataButtonProps {
  onDataCleared?: () => void
}

export function ClearDataButton({ onDataCleared }: ClearDataButtonProps) {
  const [isClearing, setIsClearing] = useState(false)
  const { toast } = useToast()

  const handleClearData = async () => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase to enable data clearing",
        variant: "destructive",
      })
      return
    }

    setIsClearing(true)
    
    try {
      // Clear data in order due to foreign key constraints
      
      // 1. Clear sales first (has foreign keys to customers and inventory)
      const salesResult = await supabase
        .from('vnms_sales')
        .delete()
        .not('id', 'is', null) // Delete all records by matching all with non-null IDs

      if (salesResult.error) {
        throw new Error(`Failed to clear sales: ${salesResult.error.message}`)
      }

      // 2. Clear customers
      const customersResult = await supabase
        .from('vnms_customers')
        .delete()
        .not('id', 'is', null) // Delete all records by matching all with non-null IDs

      if (customersResult.error) {
        throw new Error(`Failed to clear customers: ${customersResult.error.message}`)
      }

      // 3. Clear inventory
      const inventoryResult = await supabase
        .from('vnms_batches')
        .delete()
        .not('id', 'is', null) // Delete all records by matching all with non-null IDs

      if (inventoryResult.error) {
        throw new Error(`Failed to clear inventory: ${inventoryResult.error.message}`)
      }

      toast({
        title: "Data Cleared Successfully",
        description: "All data has been removed from your database. You can now start fresh with real data.",
      })

      // Call the callback to refresh the app
      if (onDataCleared) {
        onDataCleared()
      }

    } catch (error: any) {
      console.error('Error clearing data:', error)
      toast({
        title: "Clear Data Failed",
        description: error.message || "An error occurred while clearing data",
        variant: "destructive",
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="flex items-center gap-2"
          disabled={isDemoMode || isClearing}
          title={isDemoMode ? "Connect to Supabase to enable data clearing" : "Clear all data from database"}
        >
          {isClearing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {isClearing ? "Clearing..." : "Clear All Data"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete all data from your database including:
            <br />
            <br />
            • All inventory items (plants and consumables)
            <br />
            • All customer records
            <br />
            • All sales records
            <br />
            <br />
            This is useful when you want to clear test data and start fresh with real nursery data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearData}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, clear all data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
