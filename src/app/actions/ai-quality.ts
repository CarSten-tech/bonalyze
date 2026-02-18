'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { getAiQualitySummary, getRecentAiQualityEvents } from '@/lib/ai-quality-metrics'

export async function getAiQualityDashboard(householdId: string, days = 30) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht eingeloggt')

  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) throw new Error('Kein Zugriff auf diesen Haushalt')

  const [summary, recent] = await Promise.all([
    getAiQualitySummary(householdId, days),
    getRecentAiQualityEvents(householdId, 25),
  ])

  return { summary, recent }
}
