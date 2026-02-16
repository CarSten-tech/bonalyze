import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'

// --- Types ---
interface PushSubscription {
  id: string
  endpoint: string
  auth_keys: {
    auth: string
    p256dh: string
  }
}

// --- Configuration ---
const BATCH_WINDOW_MS = 2 * 60 * 1000 // 2 minutes

function getWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    logger.error('VAPID keys missing')
    return null
  }

  webpush.setVapidDetails(
    'mailto:support@bonalyze.app',
    publicKey,
    privateKey
  )
  return webpush
}

// --- Main Service Function ---
export async function notifyShoppingListUpdate(
  householdId: string,
  shoppingListId: string,
  productName: string,
  actorUserId: string,
  includeSelf = false
) {
  const supabase = createAdminClient()
  const wp = getWebPush()
  const now = new Date()

  // 1. Get Actor Name and List Name
  const [profileResult, listResult] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', actorUserId).single(),
    supabase.from('shopping_lists').select('name').eq('id', shoppingListId).single()
  ])

  const actorName = profileResult.data?.display_name || 'Jemand'
  const listName = listResult.data?.name || 'Einkaufsliste'

  // 2. Identify Recipients
  let membersQuery = supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)

  if (!includeSelf) {
    membersQuery = membersQuery.neq('user_id', actorUserId)
  }

  const { data: members } = await membersQuery
  if (!members || members.length === 0) return { success: true, method: 'none' }

  const recipientIds = members.map((m) => m.user_id)

  // 3. Check for Batching (Recent matching notification)
  const windowStart = new Date(now.getTime() - BATCH_WINDOW_MS).toISOString()
  const title = 'Bonalyze'
  const prefix = `Einkaufsliste (${listName}):`
  
  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('id, message, user_id')
    .eq('household_id', householdId)
    .eq('type', 'info')
    .eq('title', title)
    .ilike('message', `${prefix}%`)
    .gt('created_at', windowStart)
  
  const isBatching = recentNotifications && recentNotifications.length > 0

  if (isBatching) {
    logger.info('Batching refined notification update', { productName })
    
    const updates = recentNotifications.map(async (notif) => {
        let newMessage = notif.message
        if (newMessage.endsWith(' hinzugefügt.')) {
            newMessage = newMessage.slice(0, -13)
            newMessage += `, ${productName} hinzugefügt.`
        } else {
             newMessage += ` (+ ${productName})`
        }

        await supabase
            .from('notifications')
            .update({ 
                message: newMessage,
                created_at: now.toISOString(),
                is_read: false 
            })
            .eq('id', notif.id)
    })

    await Promise.all(updates)
    return { success: true, method: 'batch-update' }
  }

  // 4. Create NEW Notifications & Send Push
  logger.info('Sending refined push notification', { productName })

  const message = `${prefix} ${actorName} hat ${productName} hinzugefügt.`
  const data = { url: '/dashboard/list' }

  const notificationsToInsert = recipientIds.map((userId) => ({
    user_id: userId,
    household_id: householdId,
    type: 'info',
    title,
    message,
    data,
    is_read: false,
    created_at: now.toISOString(),
  }))

  const { error: insertError } = await supabase.from('notifications').insert(notificationsToInsert)
  if (insertError) logger.error('Error inserting notifications', insertError)

  // Send Push
  if (!wp) return { success: true, method: 'db-only' }

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, auth_keys')
    .in('user_id', recipientIds)

  if (!subscriptions || subscriptions.length === 0) return { success: true, method: 'db-only' }

  const payload = JSON.stringify({
    title,
    body: message,
    icon: '/icons/icon-192.png',
    data,
  })

  const pushPromises = subscriptions.map(async (sub) => {
    try {
      await wp.sendNotification({ endpoint: sub.endpoint, keys: sub.auth_keys as any }, payload)
    } catch (err: any) {
      if (err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        logger.error('Push failed', err, { endpoint: sub.endpoint })
      }
    }
  })

  await Promise.all(pushPromises)
  return { success: true, method: 'push' }
}
