import { createAdminClient } from '@/lib/supabase-admin'

export type HouseholdRole = 'owner' | 'admin' | 'member'

export type HouseholdPermission =
  | 'household.manage_members'
  | 'household.manage_settings'
  | 'household.transfer_ownership'
  | 'shopping.create_list'
  | 'settlements.manage'
  | 'notifications.manage'
  | 'audit.read'

const OWNER_PERMISSIONS: HouseholdPermission[] = [
  'household.manage_members',
  'household.manage_settings',
  'household.transfer_ownership',
  'shopping.create_list',
  'settlements.manage',
  'notifications.manage',
  'audit.read',
]

const ADMIN_PERMISSIONS: HouseholdPermission[] = [
  'household.manage_members',
  'household.manage_settings',
  'shopping.create_list',
  'settlements.manage',
  'notifications.manage',
  'audit.read',
]

// Membership-first model:
// Operational day-to-day actions are available to all household members.
// Governance/sensitive operations stay with owner/admin.
const MEMBER_PERMISSIONS: HouseholdPermission[] = [
  'shopping.create_list',
  'settlements.manage',
  'audit.read',
]

const PERMISSIONS_BY_ROLE: Record<HouseholdRole, ReadonlySet<HouseholdPermission>> = {
  owner: new Set(OWNER_PERMISSIONS),
  admin: new Set(ADMIN_PERMISSIONS),
  member: new Set(MEMBER_PERMISSIONS),
}

function normalizeRole(role: string | null | undefined): HouseholdRole | null {
  if (role === 'owner' || role === 'admin' || role === 'member') return role
  return null
}

export function hasHouseholdPermission(role: HouseholdRole, permission: HouseholdPermission): boolean {
  return PERMISSIONS_BY_ROLE[role].has(permission)
}

export async function getUserHouseholdRole(userId: string, householdId: string): Promise<HouseholdRole | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('household_members')
    .select('role')
    .eq('user_id', userId)
    .eq('household_id', householdId)
    .maybeSingle()

  return normalizeRole(data?.role)
}

export async function assertUserHouseholdPermission(
  userId: string,
  householdId: string,
  permission: HouseholdPermission
): Promise<{ allowed: boolean; role: HouseholdRole | null }> {
  const role = await getUserHouseholdRole(userId, householdId)
  if (!role) return { allowed: false, role: null }

  return {
    allowed: hasHouseholdPermission(role, permission),
    role,
  }
}
