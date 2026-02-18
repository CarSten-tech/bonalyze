'use client'

import { useState, useEffect } from 'react'
import { getVapidPublicKey, saveSubscription, deleteSubscription } from '@/app/actions/notifications'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

const SW_READY_TIMEOUT_MS = 2000

async function getReadyServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('SW_TIMEOUT')), SW_READY_TIMEOUT_MS)
    ),
  ]).catch(() => null)
}

async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  const existingRegistration = await getReadyServiceWorker()
  if (existingRegistration) return existingRegistration

  logger.debug('Service Worker not ready, attempting manual registration...')
  try {
    await navigator.serviceWorker.register('/sw.js')
    return getReadyServiceWorker()
  } catch (error) {
    logger.error('Manual SW registration failed', error)
    return null
  }
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLoading(false)
      return
    }

    const checkSubscription = async () => {
      try {
        const registration = await ensureServiceWorkerRegistration()

        if (!registration) {
          setLoading(false)
          return
        }

        const sub = await registration.pushManager.getSubscription()
        if (sub) {
          setSubscription(sub)
          setIsSubscribed(true)
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSubscription()

    // Failsafe: Force loading to false after 4 seconds to prevent UI hang
    const timer = setTimeout(() => {
        setLoading((l) => {
            if (l) console.warn('Push loading timed out. Forcing UI enable.')
            return false
        })
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const subscribeToPush = async () => {
    setLoading(true)
    try {
      if (!('serviceWorker' in navigator)) return

      let permission = Notification.permission
      if (permission === 'default') {
        permission = await Notification.requestPermission()
      }
      
      if (permission !== 'granted') {
        toast.error('Benachrichtigungen wurden nicht erlaubt.')
        return
      }

      const registration = await ensureServiceWorkerRegistration()
      if (!registration) {
        throw new Error('Service Worker konnte nicht geladen werden. Bitte Seite neu laden.')
      }

      const vapidPublicKey = await getVapidPublicKey()
      
      if (!vapidPublicKey) {
        throw new Error('VAPID Public Key nicht gefunden')
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      })

      const serializedSub = JSON.parse(JSON.stringify(sub))
      
      // Save to server with User Agent
      const result = await saveSubscription({
        endpoint: serializedSub.endpoint,
        keys: {
          auth: serializedSub.keys.auth,
          p256dh: serializedSub.keys.p256dh
        }
      }, navigator.userAgent)

      if (result.success) {
        setSubscription(sub)
        setIsSubscribed(true)
        toast.success('Push-Benachrichtigungen aktiviert!')
      } else {
        // If server save fails, we should probably unsubscribe locally to keep state in sync
        // await sub.unsubscribe() 
        throw new Error(result.error)
      }

    } catch (error: unknown) {
      console.error('Error subscribing:', error)
      toast.error(`Fehler beim Aktivieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setLoading(false)
    }
  }

  const unsubscribeFromPush = async () => {
    setLoading(true)
    try {
      if (subscription) {
        await subscription.unsubscribe()
        await deleteSubscription(subscription.endpoint)
        setSubscription(null)
        setIsSubscribed(false)
        toast.success('Push-Benachrichtigungen deaktiviert.')
      }
    } catch (error) {
      console.error('Error unsubscribing:', error)
      toast.error('Fehler beim Deaktivieren.')
    } finally {
      setLoading(false)
    }
  }

  return {
    isSubscribed,
    subscribeToPush,
    unsubscribeFromPush,
    loading
  }
}
