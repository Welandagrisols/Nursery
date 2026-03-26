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
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}