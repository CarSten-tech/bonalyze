'use server'

import { createServerClient as createClient } from '@/lib/supabase-server'

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
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error('saveSubscription: User not authenticated')
    throw new Error('User not authenticated')
  }

  console.log('saveSubscription: Saving for user', user.id)

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
    console.error('Error saving subscription:', error)
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
    console.error('Error deleting subscription:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
