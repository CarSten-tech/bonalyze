// Supabase Server Client for Next.js App Router
// Use this in Server Components and API Routes

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Create a Supabase client for Server Components
 * Automatically handles cookies for authentication
 *
 * @example
 * ```tsx
 * import { createServerClient } from '@/lib/supabase-server'
 *
 * export default async function ServerComponent() {
 *   const supabase = await createServerClient()
 *
 *   const { data: receipts } = await supabase
 *     .from('receipts')
 *     .select('*')
 *
 *   return <div>{receipts?.length} receipts</div>
 * }
 * ```
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
