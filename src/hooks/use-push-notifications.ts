'use client'

import { useState, useEffect } from 'react'
import { getVapidPublicKey, saveSubscription, deleteSubscription } from '@/app/actions/notifications'
import { toast } from 'sonner'

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
        // In dev mode, SW might not be registered. ready promise never resolves.
        // We race a timeout to prevent infinite loading.
        const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<ServiceWorkerRegistration | null>((_, reject) => 
                setTimeout(() => reject(new Error('SW_TIMEOUT')), 2000)
            )
        ]) .catch(err => null)

        if (!registration) {
            console.log('Service Worker not ready (Development Mode?)')
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

      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration | null>((_, reject) => 
            setTimeout(() => reject(new Error('SW_TIMEOUT')), 2000)
        )
      ]) .catch(err => null)

      if (!registration) {
        throw new Error('Service Worker nicht bereit. Bitte App neu laden.')
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

    } catch (error) {
      console.error('Error subscribing:', error)
      toast.error('Fehler beim Aktivieren der Benachrichtigungen.')
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
