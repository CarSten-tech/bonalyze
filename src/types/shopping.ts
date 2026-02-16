// Types for Shopping List feature (PROJ-16)
// Aligned with existing database schema from 001_initial_schema.sql

export interface ShoppingList {
  id: string
  household_id: string
  name: string
  created_by: string
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface ShoppingListItem {
  id: string
  shopping_list_id: string
  product_id: string | null
  product_name: string
  quantity: number | null
  unit: string | null
  priority?: string | null
  note?: string | null
  category_id?: string | null
  is_checked: boolean
  user_id?: string | null
  offerHints?: Array<{
    store: string
    price: number | null
    valid_until: string | null
    discount_percent: number | null
  }> | null
  created_at: string
  updated_at: string
  product?: {
    last_price_cents: number | null
  }
}

export interface SuggestedProduct {
  id: string
  name: string
  category: string | null
  last_purchased: string
  purchase_count: number
  avg_days_between: number | null
}

// Form types
export interface AddItemInput {
  product_name: string
  quantity?: number
  unit?: string
}

export interface Offer {
  id: string
  store: string
  product_name: string
  product_slug: string
  price: number
  original_price: number | null
  discount_percent: number | null
  valid_from: string | null
  valid_until: string | null
  image_url: string | null
  weight_volume: string | null
  price_per_unit: string | null
  category: string | null
}

export interface CreateListInput {
  name: string
}
