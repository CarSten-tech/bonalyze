'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { saveSubscriptionSchema, notificationIdSchema, uuidSchema } from '@/lib/validations'

export async function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
}

interface PushSubscriptionData {
  endpoint: string
  keys: {
    auth: string
    p256dh: string
  }
}

export async function saveSubscription(subscription: PushSubscriptionData, userAgent?: string) {
  // Validate subscription data
  const parsed = saveSubscriptionSchema.safeParse(subscription)
  if (!parsed.success) {
    return { success: false, error: 'Ungueltige Subscription-Daten' }
  }

  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    logger.warn('saveSubscription: User not authenticated')
    throw new Error('User not authenticated')
  }

  logger.debug('saveSubscription: Saving for user', { userId: user.id })

  const { error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      auth_keys: subscription.keys,
      user_agent: userAgent,
    })

  if (error) {
    if (error.code === '23505') { // Unique violation
        // Optionally update the record to ensure latest keys/UA
        await supabase
            .from('push_subscriptions')
            .update({
                auth_keys: subscription.keys,
                user_agent: userAgent
            })
            .eq('endpoint', subscription.endpoint)
            .eq('user_id', user.id)
            
        return { success: true }
    }
    logger.error('Error saving subscription', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deleteSubscription(endpoint: string) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) {
    logger.error('Error deleting subscription', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// --- Helper for sending notifications ---

import webpush from 'web-push'

function setupWebPush() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    
    if (!vapidPublicKey || !vapidPrivateKey) {
        logger.error('VAPID keys missing')
        return false
    }

    webpush.setVapidDetails(
        'mailto:support@bonalyze.app',
        vapidPublicKey,
        vapidPrivateKey
    )
    return true
}

export async function sendReceiptNotification(receiptId: string) {
    if (!setupWebPush()) return { success: false, error: 'Configuration missing' }
    
    const supabase = await createClient()
    
    // 1. Fetch receipt details including creator and merchant
    const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .select(`
            id, 
            total_amount_cents, 
            merchant:merchants(name),
            creator:profiles!receipts_created_by_fkey(display_name),
            household_id,
            created_by
        `)
        .eq('id', receiptId)
        .single()

    if (receiptError || !receipt) {
        logger.error('Notification: Receipt not found', receiptError)
        return { success: false }
    }

    // 2. Fetch other household members to notify
    const { data: members, error: membersError } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', receipt.household_id)
        .neq('user_id', receipt.created_by) // Don't notify self

    if (membersError || !members || members.length === 0) {
        return { success: true, message: 'No other members to notify' }
    }

    const recipientIds = members.map(m => m.user_id)

    // 3. Fetch subscriptions for these users
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', recipientIds)

    if (!subscriptions || subscriptions.length === 0) return { success: true }

    // 4. Persist to Database AND Send notifications
    const amount = (receipt.total_amount_cents / 100).toFixed(2).replace('.', ',')
    const merchant = receipt.merchant as { name: string } | null
    const creator = receipt.creator as { display_name: string } | null
    const merchantName = merchant?.name || 'Unbekannt'
    const creatorName = creator?.display_name || 'Jemand'
    const title = 'Neuer Bon'
    const body = `${creatorName} hat ${amount}€ bei ${merchantName} ausgegeben.`
    const data = { url: `/dashboard/receipts/${receipt.id}` }

    const payload = JSON.stringify({
        title,
        body,
        icon: '/icons/icon-192.png',
        data
    })

    // Insert into DB for each user
    const notificationsToInsert = recipientIds.map(userId => ({
        user_id: userId,
        household_id: receipt.household_id,
        type: 'receipt',
        title,
        message: body,
        data,
        is_read: false
    }))

    const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert)

    if (insertError) {
        logger.error('Failed to persist notifications', insertError)
        // We continue to send Push even if DB fails, or vice versa? 
        // Best to continue.
    }

    const results = await Promise.all(subscriptions.map(async (sub) => {
        try {
            const pushSub = {
                 endpoint: sub.endpoint,
                 keys: sub.auth_keys as { auth: string; p256dh: string }
            }
            await webpush.sendNotification(pushSub, payload)
            return { success: true }
        } catch (err: unknown) {
            logger.error('Failed to send push', err)
            const statusCode = (err as { statusCode?: number })?.statusCode
            if (statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            }
            return { success: false }
        }
    }))

    return { success: true, sent: results.filter(r => r.success).length }
}

export async function sendBudgetNotification(householdId: string, alertType: string, percentage: number) {
    if (!setupWebPush()) return { success: false, error: 'Config missing' }

    const supabase = await createClient()

    // 1. Fetch household members
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', householdId)

    if (!members?.length) return { success: true }

    const recipientIds = members.map(m => m.user_id)

    // 2. Fetch subscriptions
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', recipientIds)

    // Even if no subscriptions, we should persist the notification to the feed!
    // But we need recipients. recipientIds has them.

    // 3. Determine message based on alert type
    let title = 'Budget Update'
    let body = ''
    
    // Remaining = 100 - Used
    const remaining = 100 - percentage

    if (alertType.includes('50_remaining')) {
        title = 'Budget-Halbzeit 🌓'
        body = 'Ihr habt 50% eures Budgets verbraucht.'
    } else if (alertType.includes('25_remaining')) {
        title = 'Budget wird knapp ⚠️'
        body = 'Achtung: Nur noch 25% Budget übrig.'
    } else if (alertType.includes('10_remaining')) {
        title = 'Budget kritisch 🚨'
        body = 'Fast leer! Nur noch 10% Budget verfügbar.'
    } else if (alertType === 'exceeded_100') {
         title = 'Budget überschritten 💸'
         body = 'Ihr habt euer Budgetlimit überschritten.'
    }

    const data = { url: '/dashboard/ausgaben' }
    const payload = JSON.stringify({
        title,
        body,
        icon: '/icons/icon-192.png',
        data
    })

    // Insert into DB
    const notificationsToInsert = recipientIds.map(userId => ({
        user_id: userId,
        household_id: householdId,
        type: 'budget',
        title,
        message: body,
        data,
        is_read: false
    }))

    await supabase.from('notifications').insert(notificationsToInsert)

    if (!subscriptions?.length) return { success: true }

    // 4. Send Push
     await Promise.all(subscriptions.map(async (sub) => {
        try {
            await webpush.sendNotification({
                 endpoint: sub.endpoint,
                 keys: sub.auth_keys as { auth: string; p256dh: string }
            }, payload)
        } catch (err: unknown) {
             const statusCode = (err as { statusCode?: number })?.statusCode
             if (statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            }
        }
    }))

    return { success: true }
}

export async function getNotifications(limit = 20) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []

    const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    return data || []
}

export async function markAsRead(notificationId: string) {
    const parsed = notificationIdSchema.safeParse(notificationId)
    if (!parsed.success) throw new Error('Ungueltige Notification-ID')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
}

export async function markAllAsRead() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
}
export async function notifyShoppingListUpdate(householdId: string, shoppingListId: string, productName: string, includeSelf = false) {
    const parsedHouseholdId = uuidSchema.safeParse(householdId)
    if (!parsedHouseholdId.success) return { success: false, error: 'Ungueltige Household-ID' }
    
    const parsedListId = uuidSchema.safeParse(shoppingListId)
    if (!parsedListId.success) return { success: false, error: 'Ungueltige List-ID' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        const { notifyShoppingListUpdate: serviceNotify } = await import('@/lib/notification-service')
        const result = await serviceNotify(householdId, shoppingListId, productName, user.id, includeSelf)
        return { success: true }
    } catch (error) {
        logger.error('Failed to notify shopping list update', error)
        return { success: false }
    }
}
