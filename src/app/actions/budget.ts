"use server"

import { createServerClient as createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from "date-fns"

export async function upsertBudget(
  householdId: string,
  data: {
    period_type: "monthly" | "weekly"
    total_amount_cents: number
    categories?: { category: string; amount_cents: number }[]
  }
) {
  const supabase = await createClient()

  // 1. Upsert main budget
  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .upsert(
      {
        household_id: householdId,
        period_type: data.period_type,
        total_amount_cents: data.total_amount_cents,
      },
      { onConflict: "household_id" }
    )
    .select("id")
    .single()

  if (budgetError) throw new Error(budgetError.message)

  // 2. Handle categories if provided
  if (data.categories) {
    // Determine which categories to keep
    const categoriesToUpsert = data.categories.map((c) => ({
      budget_id: budget.id,
      category: c.category,
      amount_cents: c.amount_cents,
    }))

    // Delete existing categories first (simple strategy for full replace)
    // Or we could upsert and delete removed ones. Full replace per budget_id is safer for UI state.
    const { error: deleteError } = await supabase
      .from("category_budgets")
      .delete()
      .eq("budget_id", budget.id)
    
    if (deleteError) throw new Error(deleteError.message)

    if (categoriesToUpsert.length > 0) {
      const { error: catError } = await supabase
        .from("category_budgets")
        .insert(categoriesToUpsert)
      
      if (catError) throw new Error(catError.message)
    }
  }

  revalidatePath("/dashboard")
  revalidatePath("/settings")
  return budget
}

export async function getBudget(householdId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("budgets")
    .select("*, category_budgets(*)")
    .eq("household_id", householdId)
    .single()
  
  if (error && error.code !== "PGRST116") { // Ignore not found error
    throw new Error(error.message)
  }
  
  return data
}

export async function getBudgetStatus(householdId: string, referenceDate: Date = new Date()) {
  const budget = await getBudget(householdId)
  if (!budget) return null

  const supabase = await createClient()
  // Ensure we work with a Date object (if passed from client might be string implicitly in some setups, but strict TS usually catches this. Server actions serialization handles Date usually fine in newer Next.js, but let's be safe if it comes as ISO string). 
  // Actually Next.js server actions serialization is robust.
  const targetDate = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)

  let startDate: Date, endDate: Date

  if (budget.period_type === "monthly") {
    startDate = startOfMonth(targetDate)
    endDate = endOfMonth(targetDate)
  } else {
    startDate = startOfWeek(targetDate, { weekStartsOn: 1 }) // Monday start
    endDate = endOfWeek(targetDate, { weekStartsOn: 1 })
  }

  // Calculate total spending in period using receipts (most accurate for total)
  const { data: receipts, error: receiptsError } = await supabase
    .from("receipts")
    .select("total_amount_cents")
    .eq("household_id", householdId)
    .gte("date", startDate.toISOString())
    .lte("date", endDate.toISOString())

  if (receiptsError) throw new Error(receiptsError.message)

  const usedAmount = receipts.reduce((sum, r) => sum + r.total_amount_cents, 0)

  // Calculate category usage using receipt items
  // We need to join with receipts to filter by date/household, and categories to get name
  const { data: items, error: itemsError } = await supabase
    .from("receipt_items")
    .select(`
      price_cents,
      category:categories(name),
      receipt:receipts!inner(
        household_id,
        date
      )
    `)
    .eq("receipt.household_id", householdId)
    .gte("receipt.date", startDate.toISOString())
    .lte("receipt.date", endDate.toISOString())

  if (itemsError) throw new Error(itemsError.message)

  const categoryUsage: Record<string, number> = {}
  
  items?.forEach((item) => {
    // access nested data safely
    const categoryName = (item.category as any)?.name
    
    // only count if it has a category
    if (categoryName) {
      categoryUsage[categoryName] = (categoryUsage[categoryName] || 0) + item.price_cents
    }
  })

  return {
    budget,
    period: { start: startDate, end: endDate },
    usedAmount,
    categoryUsage,
  }
}

export async function checkBudgetAlerts(householdId: string) {
  const status = await getBudgetStatus(householdId)
  if (!status) return

  const { budget, usedAmount, period } = status
  
  // Check global threshold (e.g. 80%, 100%)
  const percentage = (usedAmount / budget.total_amount_cents) * 100
  
  if (percentage >= 100) {
    // Check if we already sent an alert for this period and type '100_percent'
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from("budget_alerts")
      .select("id")
      .eq("household_id", householdId)
      .eq("alert_type", "100_percent")
      .eq("period_start", period.start.toISOString())
      .single()

    if (!existing) {
      await supabase.from("budget_alerts").insert({
        household_id: householdId,
        alert_type: "100_percent",
        period_start: period.start.toISOString(),
      })
      // Here we would confirm triggering a push notification or email
      console.log(`Budget alert: 100% reached for household ${householdId}`)
    }
  } else if (percentage >= 80) {
     const supabase = await createClient()
     const { data: existing } = await supabase
      .from("budget_alerts")
      .select("id")
      .eq("household_id", householdId)
      .eq("alert_type", "80_percent")
      .eq("period_start", period.start.toISOString())
      .single()

    if (!existing) {
      await supabase.from("budget_alerts").insert({
        household_id: householdId,
        alert_type: "80_percent",
        period_start: period.start.toISOString(),
      })
      console.log(`Budget alert: 80% reached for household ${householdId}`)
    }
  }
}
