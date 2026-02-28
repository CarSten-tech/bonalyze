'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'

interface AuditLogItem {
  id: string
  action: string
  entity_type: string
  entity_id: string
  created_at: string
}

interface AuditLogResult {
  logs: AuditLogItem[]
  error?: string
}

function friendlyAuditError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/does not exist|relation .* does not exist|42P01/i.test(message)) {
    return 'Audit Logs sind noch nicht eingerichtet (Migration fehlt).'
  }
  return 'Audit Logs konnten nicht geladen werden.'
}

export async function getHouseholdAuditLog(
  householdId: string,
  limit = 50,
  offset = 0
): Promise<AuditLogResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { logs: [], error: 'Nicht eingeloggt' }
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return { logs: [], error: 'Kein Zugriff auf diesen Haushalt' }
  }

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, created_at')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      logs: (data as AuditLogItem[]) || [],
    }
  } catch (error) {
    return {
      logs: [],
      error: friendlyAuditError(error),
    }
  }
}
