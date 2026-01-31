// Supabase Client Setup
// Type-safe Supabase clients for Next.js App Router

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Create a Supabase client for Client Components (Browser)
 * Use this in React Components, Client-Side hooks, etc.
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * import { createClient } from '@/lib/supabase'
 *
 * export default function MyComponent() {
 *   const supabase = createClient()
 *
 *   const fetchReceipts = async () => {
 *     const { data } = await supabase
 *       .from('receipts')
 *       .select('*')
 *     return data
 *   }
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Legacy export for backwards compatibility
export const supabase = createClient()
