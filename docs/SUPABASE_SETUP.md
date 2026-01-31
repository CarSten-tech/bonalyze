# Supabase Setup - Bonalyze

## ✅ Setup Complete

Your Supabase database is ready with:
- **9 Tables** (profiles, households, household_members, merchants, products, receipts, receipt_items, shopping_lists, shopping_list_items)
- **36 RLS Policies** (Row-Level Security)
- **20 Indexes** (Performance-optimized)
- **TypeScript Types** (Auto-generated from schema)
- **Type-safe Supabase Clients** (Client & Server)

---

## 📁 Files Created

```
types/
  └── database.types.ts         # TypeScript types for all tables

src/lib/
  ├── supabase.ts               # Client-side Supabase client
  └── supabase-server.ts        # Server-side Supabase client

migrations/
  ├── 001_initial_schema.sql    # Database schema
  ├── 002_rls_policies.sql      # Security policies
  └── 003_seed_data.sql         # Seed data (5 merchants, 20 products)
```

---

## 🚀 Usage

### Client Components (Browser)

Use `createClient()` for client-side React components:

```tsx
'use client'

import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState([])
  const supabase = createClient()

  useEffect(() => {
    const fetchReceipts = async () => {
      const { data } = await supabase
        .from('receipts')
        .select(`
          *,
          merchant:merchants(name),
          items:receipt_items(*)
        `)
        .order('date', { ascending: false })

      setReceipts(data || [])
    }

    fetchReceipts()
  }, [])

  return (
    <div>
      {receipts.map(receipt => (
        <div key={receipt.id}>
          {receipt.merchant?.name} - €{receipt.total_amount_cents / 100}
        </div>
      ))}
    </div>
  )
}
```

### Server Components

Use `createServerClient()` for server-side rendering:

```tsx
import { createServerClient } from '@/lib/supabase-server'

export default async function ReceiptsPage() {
  const supabase = await createServerClient()

  const { data: receipts } = await supabase
    .from('receipts')
    .select('*, merchant:merchants(name)')
    .order('date', { ascending: false })

  return (
    <div>
      {receipts?.map(receipt => (
        <div key={receipt.id}>
          {receipt.merchant?.name} - €{receipt.total_amount_cents / 100}
        </div>
      ))}
    </div>
  )
}
```

### API Routes

Use `createServerClient()` in API routes:

```ts
// app/api/receipts/route.ts
import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch receipts (RLS automatically filters to user's households)
  const { data: receipts, error } = await supabase
    .from('receipts')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ receipts })
}

export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { household_id, merchant_id, date, total_amount_cents, notes } = body

  // Validation
  if (!household_id || !date || !total_amount_cents) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Insert receipt (RLS automatically checks if user is household member)
  const { data: receipt, error } = await supabase
    .from('receipts')
    .insert({
      household_id,
      merchant_id,
      date,
      total_amount_cents,
      notes,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ receipt }, { status: 201 })
}
```

---

## 🔒 Row-Level Security (RLS)

All tables have RLS enabled. Users can only:
- See households they are members of
- See receipts/shopping lists in their households
- Create new merchants/products (shared globally)
- Full access to edit within their households

**Example Security Check:**

```ts
// This query automatically filters to user's households
const { data } = await supabase
  .from('receipts')
  .select('*')
// → Only returns receipts from households where user is a member
```

---

## 📊 TypeScript Types

Use the generated types for type-safety:

```ts
import { Database } from '@/types/database.types'

// Table row types
type Receipt = Database['public']['Tables']['receipts']['Row']
type NewReceipt = Database['public']['Tables']['receipts']['Insert']
type UpdateReceipt = Database['public']['Tables']['receipts']['Update']

// Example: Type-safe insert
const newReceipt: NewReceipt = {
  household_id: '...',
  date: '2026-01-31',
  total_amount_cents: 4567, // €45.67
  created_by: user.id,
}

const { data } = await supabase
  .from('receipts')
  .insert(newReceipt)
  .select()
```

---

## 🧪 Testing the Setup

### 1. Check Tables in Supabase Dashboard

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Database** → **Tables**
3. You should see 9 tables: profiles, households, household_members, merchants, products, receipts, receipt_items, shopping_lists, shopping_list_items

### 2. Verify RLS is Enabled

```sql
-- Run in SQL Editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- All tables should have rowsecurity = true
```

### 3. Check Seed Data

```sql
-- Run in SQL Editor
SELECT COUNT(*) FROM merchants;  -- Should return 5
SELECT COUNT(*) FROM products;   -- Should return 20
```

### 4. Test a Query

```ts
// In any Server Component
const supabase = await createServerClient()
const { data: merchants } = await supabase.from('merchants').select('*')
console.log(merchants) // Should return REWE, LIDL, ALDI, EDEKA, Kaufland
```

---

## 🔄 Regenerating Types

If you modify the database schema, regenerate types:

```bash
# Option 1: Use Supabase CLI (recommended)
npx supabase gen types typescript --project-id neuedyzjwsxrkvflrzbr > types/database.types.ts

# Option 2: Ask Claude to regenerate via MCP
# Just tell Claude: "Regenerate TypeScript types from Supabase"
```

---

## 📚 Next Steps

1. **Authentication**: Set up Supabase Auth (email/password, OAuth)
2. **Create API Routes**: Build CRUD endpoints for receipts, shopping lists, etc.
3. **Build UI**: Create React components for data visualization
4. **Add Validations**: Use Zod for input validation in API routes
5. **Add Tests**: Write unit/integration tests for API routes

---

## 🐛 Troubleshooting

### "Module not found: @supabase/ssr"

Run: `npm install @supabase/ssr`

### "NEXT_PUBLIC_SUPABASE_URL is not defined"

Check `.env.local` exists and contains:
```env
NEXT_PUBLIC_SUPABASE_URL=https://neuedyzjwsxrkvflrzbr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### "Row-level security policy for relation..."

This is expected! RLS is enabled. Make sure:
1. User is authenticated (`supabase.auth.getUser()`)
2. User is a member of the household they're trying to access

### "Cannot read properties of null (user)"

User is not authenticated. Add authentication check:

```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  // Redirect to login or return error
}
```

---

## 📖 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router + Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [TypeScript Support](https://supabase.com/docs/guides/api/rest/generating-types)

---

**Setup completed successfully!** 🎉

Your database is ready. Start building your features!
