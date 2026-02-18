
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { addMonths, subMonths, format } from 'date-fns'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Key in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seed() {
  console.log('🌱 Starting Warranty Vault Seeding...')

  // 1. Get a Test User & Household
  // We'll pick the first user we find in 'profiles' or 'household_members'
  const { data: members, error: memberError } = await supabase
    .from('household_members')
    .select('user_id, household_id')
    .limit(1)

  if (memberError || !members || members.length === 0) {
    console.error('❌ No users/households found. Please sign up in the app first.')
    return
  }

  const { user_id, household_id } = members[0]
  console.log(`👤 Using User: ${user_id}`)
  console.log(`🏠 Using Household: ${household_id}`)

  // 2. Ensure Merchants Exist
  const merchants = [
    { name: 'MediaMarkt' },
    { name: 'Saturn' },
    { name: 'Amazon' },
    { name: 'Cyberport' },
  ]

  const merchantMap = new Map<string, string>()

  for (const m of merchants) {
    const { data } = await supabase
      .from('merchants')
      .upsert({ name: m.name, created_by: user_id }, { onConflict: 'name' })
      .select('id, name')
      .single()

    if (data) merchantMap.set(data.name, data.id)
  }

  // 3. Create Receipts with Warranty Items
  const warrantyItems = [
    {
      product: 'MacBook Pro M3',
      merchant: 'Cyberport',
      price: 249900,
      buyDate: subMonths(new Date(), 3), // Bought 3 months ago
      warrantyMonths: 24,
      category_id: null, // Optional
    },
    {
      product: 'Dyson V15 Detect',
      merchant: 'MediaMarkt',
      price: 69900,
      buyDate: subMonths(new Date(), 23), // Bought 23 months ago -> Expiring soon!
      warrantyMonths: 24,
      category_id: null,
    },
    {
      product: 'Sony WH-1000XM5',
      merchant: 'Amazon',
      price: 34900,
      buyDate: subMonths(new Date(), 6),
      warrantyMonths: 24,
      category_id: null,
    },
    {
      product: 'Philips Haartrockner',
      merchant: 'Saturn',
      price: 4999,
      buyDate: subMonths(new Date(), 25), // Expired
      warrantyMonths: 24,
      category_id: null,
    }
  ]

  for (const item of warrantyItems) {
    // A. Create Receipt
    const receiptDate = format(item.buyDate, 'yyyy-MM-dd')
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        household_id: household_id,
        merchant_id: merchantMap.get(item.merchant),
        date: receiptDate,
        total_amount_cents: item.price,
        created_by: user_id,
        notes: `Mock receipt for ${item.product}`
      })
      .select()
      .single()

    if (receiptError) {
      console.error(`❌ Failed to create receipt for ${item.product}:`, receiptError)
      continue
    }

    // B. Create Product (Upsert)
    const { data: product } = await supabase
      .from('products')
      .upsert({
        household_id: household_id,
        name: item.product,
        last_price_cents: item.price,
        price_updated_at: new Date().toISOString(),
      }, { onConflict: 'household_id, name' })
      .select()
      .single()

    // C. Create Receipt Item with Warranty Fields
    const endDate = addMonths(item.buyDate, item.warrantyMonths)
    
    await supabase.from('receipt_items').insert({
      receipt_id: receipt.id,
      product_id: product?.id,
      product_name: item.product,
      quantity: 1,
      price_cents: item.price,
      is_warranty_item: true,
      warranty_period_months: item.warrantyMonths,
      warranty_end_date: format(endDate, 'yyyy-MM-dd'),
    })

    console.log(`✅ Created warranty item: ${item.product} (Ends: ${format(endDate, 'yyyy-MM-dd')})`)
  }

  console.log('🎉 Seeding complete! Check your dashboard.')
}

seed().catch(console.error)
