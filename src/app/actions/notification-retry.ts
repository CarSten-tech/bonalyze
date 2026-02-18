'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { assertUserHouseholdPermission } from '@/lib/household-roles'
import {
  getRetryQueueStats,
  listRetryQueueItems,
  processNotificationRetryQueue,
} from '@/lib/notification-retry-queue'

export async function getNotificationRetryDashboard(householdId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht eingeloggt')

  const permission = await assertUserHouseholdPermission(user.id, householdId, 'audit.read')
  if (!permission.allowed) throw new Error('Kein Zugriff auf diesen Haushalt')

  const [stats, items] = await Promise.all([
    getRetryQueueStats(householdId),
    listRetryQueueItems(householdId, 25),
  ])

  return { stats, items }
}

export async function retryNotificationDeliveryQueue(householdId: string, limit = 25) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht eingeloggt')

  const permission = await assertUserHouseholdPermission(user.id, householdId, 'notifications.manage')
  if (!permission.allowed) throw new Error('Keine Berechtigung für Retry-Operationen')

  return processNotificationRetryQueue(householdId, limit)
}
