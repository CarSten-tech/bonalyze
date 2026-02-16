import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase-admin'

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
    console.error('VAPID keys missing')
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
  productName: string,
  actorUserId: string,
  includeSelf = false
) {
  const supabase = createAdminClient()
  const wp = getWebPush()
  const now = new Date()

  // 1. Get Actor Name
  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', actorUserId)
    .single()

  const actorName = actorProfile?.display_name || 'Jemand'

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

  // 3. Check for Batching (Recent 'Neues Produkt' notification)
  const windowStart = new Date(now.getTime() - BATCH_WINDOW_MS).toISOString()
  
  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('id, message, user_id')
    .eq('household_id', householdId)
    .eq('type', 'info')
    .eq('title', 'Neues Produkt')
    .gt('created_at', windowStart)
  
  // Simply check if ANY recipient has a recent notification.
  // We assume if one has it, others might too (or the session is active).
  const isBatching = recentNotifications && recentNotifications.length > 0

  if (isBatching) {
    console.log('[Notification] Info: Batching update for', productName)
    
    // UPDATE existing notifications
    // We simply append the new product to the list of items in the message
    // Heuristic: "Carsten hat X hinzugefügt." -> remove " hinzugefügt.", append ", Y hinzugefügt."
    
    // We update each distinct notification found (could be multiple if multiple users)
    const updates = recentNotifications.map(async (notif) => {
        let newMessage = notif.message
        if (newMessage.endsWith(' hinzugefügt.')) {
            newMessage = newMessage.slice(0, -13) // remove " hinzugefügt."
            newMessage += `, ${productName} hinzugefügt.`
        } else {
            // Fallback if format is different
             newMessage += ` (+ ${productName})`
        }

        await supabase
            .from('notifications')
            .update({ 
                message: newMessage,
                created_at: now.toISOString(), // Renew timestamp to keep batch window open?
                is_read: false // Mark as unread again
            })
            .eq('id', notif.id)
    })

    await Promise.all(updates)
    return { success: true, method: 'batch-update' }
  }

  // 4. Create NEW Notifications & Send Push
  console.log('[Notification] Info: Sending new push for', productName)

  const title = 'Neues Produkt'
  const message = `${actorName} hat ${productName} hinzugefügt.`
  const data = { url: '/dashboard/list' }

  // Insert DB
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

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notificationsToInsert)

  if (insertError) {
    console.error('Error inserting notifications:', insertError)
    // Continue to Push anyway?
  }

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
    icon: '/icons/icon-192.png', // Ensure path is correct or generic
    data,
  })

  // Fire and forget pushes (or await appropriately)
  const pushPromises = subscriptions.map(async (sub) => {
    try {
      await wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.auth_keys as any,
        },
        payload
      )
    } catch (err: any) {
      if (err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('Push failed for endpoint', sub.endpoint, err)
      }
    }
  })

  await Promise.all(pushPromises)
  return { success: true, method: 'push' }
}
