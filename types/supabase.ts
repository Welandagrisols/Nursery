export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      inventory: {
        Row: {
          id: string
          plant_name: string
          scientific_name: string | null
          category: string
          quantity: number
          age: string | null
          date_planted: string | null
          status: string
          price: number
          sku: string
          section: string | null
          row: string | null
          source: string | null
          created_at: string
          updated_at: string
          batch_cost: number | null
          image_url: string | null
          description: string | null
          ready_for_sale: boolean | null
        }
        Insert: {
          id?: string
          plant_name: string
          scientific_name?: string | null
          category: string
          quantity?: number
          age?: string | null
          date_planted?: string | null
          status?: string
          price?: number
          sku: string
          section?: string | null
          row?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          batch_cost?: number | null
          image_url?: string | null
          description?: string | null
          ready_for_sale?: boolean | null
        }
        Update: {
          id?: string
          plant_name?: string
          scientific_name?: string | null
          category?: string
          quantity?: number
          age?: string | null
          date_planted?: string | null
          status?: string
          price?: number
          sku?: string
          section?: string | null
          row?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          batch_cost?: number | null
          image_url?: string | null
          description?: string | null
          ready_for_sale?: boolean | null
        }
        Relationships: []
      }
      impact_stories: {
        Row: {
          id: string
          title: string
          text: string
          media_urls: string[] | null
          category: 'water' | 'food_security' | 'beautification'
          display_order: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          text: string
          media_urls?: string[] | null
          category: 'water' | 'food_security' | 'beautification'
          display_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          text?: string
          media_urls?: string[] | null
          category?: 'water' | 'food_security' | 'beautification'
          display_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      water_source_gallery: {
        Row: {
          id: string
          spring_name: string | null
          media_url: string
          media_type: string
          story: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          spring_name?: string | null
          media_url: string
          media_type: string
          story?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          spring_name?: string | null
          media_url?: string
          media_type?: string
          story?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      green_champions_gallery: {
        Row: {
          id: string
          school_name: string | null
          media_url: string
          story: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_name?: string | null
          media_url: string
          story?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_name?: string | null
          media_url?: string
          story?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          id: string
          inventory_id: string
          quantity: number
          sale_date: string
          customer_id: string | null
          total_amount: number
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inventory_id: string
          quantity: number
          sale_date?: string
          customer_id?: string | null
          total_amount: number
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inventory_id?: string
          quantity?: number
          sale_date?: string
          customer_id?: string | null
          total_amount?: number
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          name: string
          contact: string
          email: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          contact: string
          email?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact?: string
          email?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      vnms_batch_bookings: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_batches: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_broadcast_messages: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_costs: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_customers: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_nursery_beds: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_nursery_rows: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_nursery_trays: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_price_changes: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_prices: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_sachets: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_sales: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_staff: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_staff_tasks: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_stock_alerts: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_task_consumables: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_tray_assignments: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
      vnms_security_settings: { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: [] }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      vnms_verify_staff_pin: {
        Args: { p_staff_id: string; p_pin: string }
        Returns: { id: string; name: string; role: string }[]
      }
      vnms_verify_owner_pin: {
        Args: { p_pin: string }
        Returns: boolean
      }
      vnms_set_owner_pin: {
        Args: { p_current_pin: string | null; p_new_pin: string }
        Returns: boolean
      }
      vnms_is_owner_pin_configured: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      record_sale_atomic: {
        Args: {
          p_batch_id: string
          p_quantity: number
          p_unit_price: number
          p_total_amount: number
          p_sale_date: string
          p_customer_id: string | null
          p_customer_name: string | null
          p_customer_type: string | null
          p_payment_method: string
          p_payment_reference: string | null
          p_receipt_number: string
          p_notes: string | null
          p_batch_code: string | null
          p_plant_name: string | null
          p_booking_id?: string | null
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}