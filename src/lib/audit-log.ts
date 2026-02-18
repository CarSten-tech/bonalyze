import { createEnterpriseAdminClient } from '@/lib/enterprise-admin'
import { logger } from '@/lib/logger'

export type AuditAction = 'create' | 'update' | 'delete'

export interface AuditLogPayload {
  householdId: string
  actorUserId?: string | null
  action: AuditAction
  entityType: string
  entityId: string
  details?: Record<string, unknown>
}

export interface AuditLogRecord {
  id: string
  household_id: string
  actor_user_id: string | null
  action: AuditAction
  entity_type: string
  entity_id: string
  details: Record<string, unknown>
  created_at: string
}

export async function writeAuditLog(payload: AuditLogPayload) {
  try {
    const supabase = createEnterpriseAdminClient()
    const { error } = await supabase.from('audit_logs').insert({
      household_id: payload.householdId,
      actor_user_id: payload.actorUserId ?? null,
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      details: payload.details ?? {},
    })

    if (error) {
      logger.error('Failed to write audit log', error, {
        householdId: payload.householdId,
        entityType: payload.entityType,
      })
    }
  } catch (error) {
    logger.error('Audit log write crashed', error)
  }
}

export async function listAuditLogsForHousehold(
  householdId: string,
  limit = 50,
  offset = 0
): Promise<AuditLogRecord[]> {
  const supabase = createEnterpriseAdminClient()
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as AuditLogRecord[]
}
