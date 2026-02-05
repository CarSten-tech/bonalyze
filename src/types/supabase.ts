
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      budget_alerts: {
        Row: {
          alert_type: string
          created_at: string
          household_id: string
          id: string
          period_start: string
          sent_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          household_id: string
          id?: string
          period_start: string
          sent_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          household_id?: string
          id?: string
          period_start?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_household_id_fkey"
            columns: ["household_id"]
            referencedRelation: "households"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          household_id: string
          type: 'receipt' | 'budget' | 'system'
          title: string
          message: string
          data: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id: string
          type: 'receipt' | 'budget' | 'system'
          title: string
          message: string
          data?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string
          type?: 'receipt' | 'budget' | 'system'
          title?: string
          message?: string
          data?: Json
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
            {
                foreignKeyName: "notifications_user_id_fkey"
                columns: ["user_id"]
                referencedRelation: "profiles"
                referencedColumns: ["id"]
            },
            {
                foreignKeyName: "notifications_household_id_fkey"
                columns: ["household_id"]
                referencedRelation: "households"
                referencedColumns: ["id"]
            }
        ]
      }
      // ... other tables would be here, but for now we manually update or rely on the tool output if it wrote to a file.
      // The tool typically returns the types. I need to write them to `types/supabase.ts` or similar.
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
