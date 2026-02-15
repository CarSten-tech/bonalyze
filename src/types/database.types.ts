export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alexa_link_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          household_id: string
          id: string
          shopping_list_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          household_id: string
          id?: string
          shopping_list_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          household_id?: string
          id?: string
          shopping_list_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alexa_link_codes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alexa_link_codes_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      alexa_user_links: {
        Row: {
          alexa_user_id: string
          created_at: string
          household_id: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          locale: string | null
          shopping_list_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alexa_user_id: string
          created_at?: string
          household_id: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          locale?: string | null
          shopping_list_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alexa_user_id?: string
          created_at?: string
          household_id?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          locale?: string | null
          shopping_list_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alexa_user_links_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alexa_user_links_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_alerts: {
        Row: {
          alert_type: string
          household_id: string
          id: string
          period_start: string
          sent_at: string
        }
        Insert: {
          alert_type: string
          household_id: string
          id?: string
          period_start: string
          sent_at?: string
        }
        Update: {
          alert_type?: string
          household_id?: string
          id?: string
          period_start?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          household_id: string
          id: string
          period_type: string
          total_amount_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          period_type: string
          total_amount_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          period_type?: string
          total_amount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          emoji: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_budgets: {
        Row: {
          amount_cents: number
          budget_id: string
          category: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          budget_id: string
          category: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          budget_id?: string
          category?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_budgets_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          brand: string | null
          category: string | null
          ean: string | null
          grammage: string | null
          id: string
          image_url: string | null
          price: number
          product_name: string
          store: string
          synced_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          ean?: string | null
          grammage?: string | null
          id?: string
          image_url?: string | null
          price: number
          product_name: string
          store?: string
          synced_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          ean?: string | null
          grammage?: string | null
          id?: string
          image_url?: string | null
          price?: number
          product_name?: string
          store?: string
          synced_at?: string
        }
        Relationships: []
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          id: string
          joined_at: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          joined_at?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          joined_at?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_nutrition_profiles: {
        Row: {
          activity_level: string
          age_years: number
          bmr_kcal: number
          created_at: string
          gender: string
          height_cm: number
          household_member_id: string
          id: string
          target_calories_kcal: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_protein_g: number | null
          target_water_ml: number | null
          tdee_kcal: number
          updated_at: string
          weight_kg: number
        }
        Insert: {
          activity_level?: string
          age_years: number
          bmr_kcal?: number
          created_at?: string
          gender: string
          height_cm: number
          household_member_id: string
          id?: string
          target_calories_kcal?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          target_water_ml?: number | null
          tdee_kcal?: number
          updated_at?: string
          weight_kg: number
        }
        Update: {
          activity_level?: string
          age_years?: number
          bmr_kcal?: number
          created_at?: string
          gender?: string
          height_cm?: number
          household_member_id?: string
          id?: string
          target_calories_kcal?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          target_water_ml?: number | null
          tdee_kcal?: number
          updated_at?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_nutrition_profiles_household_member_id_fkey"
            columns: ["household_member_id"]
            isOneToOne: true
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          household_id: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          household_id: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          household_id?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_library: {
        Row: {
          bls_code: string
          calcium: number | null
          calories: number | null
          carbs: number | null
          category: string | null
          fat: number | null
          fiber: number | null
          id: string
          iron: number | null
          magnesium: number | null
          name: string
          protein: number | null
          salt: number | null
          saturated_fat: number | null
          search_vector: unknown
          sugar: number | null
          vitamin_c: number | null
          zinc: number | null
        }
        Insert: {
          bls_code: string
          calcium?: number | null
          calories?: number | null
          carbs?: number | null
          category?: string | null
          fat?: number | null
          fiber?: number | null
          id?: string
          iron?: number | null
          magnesium?: number | null
          name: string
          protein?: number | null
          salt?: number | null
          saturated_fat?: number | null
          search_vector?: unknown
          sugar?: number | null
          vitamin_c?: number | null
          zinc?: number | null
        }
        Update: {
          bls_code?: string
          calcium?: number | null
          calories?: number | null
          carbs?: number | null
          category?: string | null
          fat?: number | null
          fiber?: number | null
          id?: string
          iron?: number | null
          magnesium?: number | null
          name?: string
          protein?: number | null
          salt?: number | null
          saturated_fat?: number | null
          search_vector?: unknown
          sugar?: number | null
          vitamin_c?: number | null
          zinc?: number | null
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          activity_name: string | null
          burned_calories_kcal: number | null
          calories_kcal: number | null
          carbs_g: number | null
          created_at: string
          duration_minutes: number | null
          fat_g: number | null
          fluid_ml: number | null
          group_id: string | null
          group_name: string | null
          household_id: string
          id: string
          is_from_suggestion: boolean | null
          item_name: string | null
          log_date: string
          meal_type: string
          protein_g: number | null
          receipt_item_id: string | null
          suggestion_dismissed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_name?: string | null
          burned_calories_kcal?: number | null
          calories_kcal?: number | null
          carbs_g?: number | null
          created_at?: string
          duration_minutes?: number | null
          fat_g?: number | null
          fluid_ml?: number | null
          group_id?: string | null
          group_name?: string | null
          household_id: string
          id?: string
          is_from_suggestion?: boolean | null
          item_name?: string | null
          log_date?: string
          meal_type: string
          protein_g?: number | null
          receipt_item_id?: string | null
          suggestion_dismissed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_name?: string | null
          burned_calories_kcal?: number | null
          calories_kcal?: number | null
          carbs_g?: number | null
          created_at?: string
          duration_minutes?: number | null
          fat_g?: number | null
          fluid_ml?: number | null
          group_id?: string | null
          group_name?: string | null
          household_id?: string
          id?: string
          is_from_suggestion?: boolean | null
          item_name?: string | null
          log_date?: string
          meal_type?: string
          protein_g?: number | null
          receipt_item_id?: string | null
          suggestion_dismissed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_logs_receipt_item_id_fkey"
            columns: ["receipt_item_id"]
            isOneToOne: false
            referencedRelation: "receipt_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          household_id: string | null
          id: string
          last_price_cents: number | null
          name: string
          price_updated_at: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          household_id?: string | null
          id?: string
          last_price_cents?: number | null
          name: string
          price_updated_at?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          household_id?: string | null
          id?: string
          last_price_cents?: number | null
          name?: string
          price_updated_at?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_keys: Json
          created_at: string
          endpoint: string
          id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_keys: Json
          created_at?: string
          endpoint: string
          id?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_keys?: Json
          created_at?: string
          endpoint?: string
          id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      receipt_items: {
        Row: {
          category_id: string | null
          created_at: string
          estimated_calories_kcal: number | null
          estimated_carbs_g: number | null
          estimated_fat_g: number | null
          estimated_protein_g: number | null
          estimated_weight_g: number | null
          expiry_acknowledged: boolean | null
          id: string
          is_food_item: boolean | null
          is_warranty_item: boolean | null
          price_cents: number
          product_id: string | null
          product_name: string
          quantity: number
          receipt_id: string
          unit: string | null
          updated_at: string
          warranty_end_date: string | null
          warranty_period_months: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          estimated_calories_kcal?: number | null
          estimated_carbs_g?: number | null
          estimated_fat_g?: number | null
          estimated_protein_g?: number | null
          estimated_weight_g?: number | null
          expiry_acknowledged?: boolean | null
          id?: string
          is_food_item?: boolean | null
          is_warranty_item?: boolean | null
          price_cents: number
          product_id?: string | null
          product_name: string
          quantity?: number
          receipt_id: string
          unit?: string | null
          updated_at?: string
          warranty_end_date?: string | null
          warranty_period_months?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          estimated_calories_kcal?: number | null
          estimated_carbs_g?: number | null
          estimated_fat_g?: number | null
          estimated_protein_g?: number | null
          estimated_weight_g?: number | null
          expiry_acknowledged?: boolean | null
          id?: string
          is_food_item?: boolean | null
          is_warranty_item?: boolean | null
          price_cents?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          receipt_id?: string
          unit?: string | null
          updated_at?: string
          warranty_end_date?: string | null
          warranty_period_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          created_by: string
          date: string
          household_id: string
          id: string
          image_url: string | null
          merchant_id: string | null
          notes: string | null
          payment_type: string | null
          purpose: string | null
          total_amount_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          household_id: string
          id?: string
          image_url?: string | null
          merchant_id?: string | null
          notes?: string | null
          payment_type?: string | null
          purpose?: string | null
          total_amount_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          household_id?: string
          id?: string
          image_url?: string | null
          merchant_id?: string | null
          notes?: string | null
          payment_type?: string | null
          purpose?: string | null
          total_amount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_transfers: {
        Row: {
          amount_cents: number
          created_at: string
          from_user_id: string
          id: string
          settlement_id: string
          to_user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          from_user_id: string
          id?: string
          settlement_id: string
          to_user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          from_user_id?: string
          id?: string
          settlement_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_transfers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_transfers_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_transfers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          created_at: string
          household_id: string
          id: string
          period_end: string
          period_start: string
          settled_at: string | null
          settled_by: string | null
          total_amount_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          period_end: string
          period_start: string
          settled_at?: string | null
          settled_by?: string | null
          total_amount_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          period_end?: string
          period_start?: string
          settled_at?: string | null
          settled_by?: string | null
          total_amount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          created_at: string
          id: string
          is_checked: boolean
          priority: string | null
          product_id: string | null
          product_name: string
          quantity: number | null
          shopping_list_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_checked?: boolean
          priority?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number | null
          shopping_list_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_checked?: boolean
          priority?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number | null
          shopping_list_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          id: string
          is_completed: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          is_completed?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          is_completed?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_available_expense_years: {
        Args: { p_household_id: string }
        Returns: {
          receipt_count: number
          total_amount_cents: number
          year: number
        }[]
      }
      get_category_summary: {
        Args: {
          p_category_slug: string
          p_household_id: string
          p_month?: number
          p_year: number
        }
        Returns: {
          category_emoji: string
          category_id: string
          category_name: string
          change_percentage: number
          previous_period_amount_cents: number
          product_count: number
          total_amount_cents: number
        }[]
      }
      get_monthly_expenses_by_category: {
        Args: {
          p_household_id: string
          p_payment_type?: string
          p_purpose?: string
          p_year: number
        }
        Returns: {
          categories: Json
          month_name: string
          month_number: number
          receipt_count: number
          total_amount_cents: number
          year: number
        }[]
      }
      get_product_ranking: {
        Args: {
          p_category_slug: string
          p_household_id: string
          p_limit?: number
          p_offset?: number
          p_year: number
        }
        Returns: {
          avg_price_cents: number
          product_id: string
          product_name: string
          purchase_count: number
          rank: number
          top_merchant_id: string
          top_merchant_name: string
          total_amount_cents: number
          total_quantity: number
          unit: string
        }[]
      }
      get_supply_range: {
        Args: { p_days_lookback?: number; p_household_id: string }
        Returns: {
          coverage_days: number
          daily_household_burn: number
          food_item_count: number
          member_count: number
          total_calories_purchased: number
          total_carbs_g: number
          total_fat_g: number
          total_protein_g: number
        }[]
      }
      is_household_member: {
        Args: { household_id: string; user_id: string }
        Returns: boolean
      }
      search_food: {
        Args: {
          items_per_page?: number
          page_number?: number
          search_term: string
        }
        Returns: {
          bls_code: string
          calcium: number | null
          calories: number | null
          carbs: number | null
          category: string | null
          fat: number | null
          fiber: number | null
          id: string
          iron: number | null
          magnesium: number | null
          name: string
          protein: number | null
          salt: number | null
          saturated_fat: number | null
          search_vector: unknown
          sugar: number | null
          vitamin_c: number | null
          zinc: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "nutrition_library"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
