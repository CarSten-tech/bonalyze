'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { listAuditLogsForHousehold } from '@/lib/audit-log'

export async function getHouseholdAuditLog(householdId: string, limit = 50, offset = 0) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Nicht eingeloggt')
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    throw new Error('Kein Zugriff auf diesen Haushalt')
  }

  return listAuditLogsForHousehold(householdId, limit, offset)
}
