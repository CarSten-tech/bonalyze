'use client'

import * as React from 'react'
import { Bell, Check, Info, Receipt, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getNotifications, markAsRead, markAllAsRead } from '@/app/actions/notifications'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'receipt' | 'budget' | 'system'
  title: string
  message: string
  data: any
  is_read: boolean
  created_at: string
}

export function NotificationBell() {
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)

  const fetchNotifications = React.useCallback(async () => {
    try {
      // Don't show loading spinner for background refreshes
      const data = await getNotifications(20)
      if (data) {
        // Force cast since we know the shape matches our interface
        // and Supabase types might be inferred as generic Json/string
        const safeData = data as unknown as Notification[]
        setNotifications(safeData)
        setUnreadCount(safeData.filter(n => !n.is_read).length)
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error)
    }
  }, [])

  // Initial fetch and poll
  React.useEffect(() => {
    fetchNotifications()
    // Poll every 30s
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Re-fetch when opening
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      fetchNotifications()
    }
  }

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    
    await markAsRead(id)
  }

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    
    await markAllAsRead()
  }

  const handleItemClick = async (n: Notification) => {
    if (!n.is_read) {
      await handleMarkAsRead(n.id)
    }
    
    setIsOpen(false)
    
    if (n.data?.url) {
      router.push(n.data.url)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'receipt': return <Receipt className="h-4 w-4 text-blue-500" />
      case 'budget': return <Wallet className="h-4 w-4 text-orange-500" />
      default: return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-background" />
          )}
          <span className="sr-only">Benachrichtigungen</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Aktivitäten</h4>
          {unreadCount > 0 && (
            <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto text-xs text-muted-foreground px-2 py-1"
                onClick={handleMarkAllRead}
            >
                <Check className="h-3 w-3 mr-1" />
                Alle gelesen
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Keine Nachrichten</p>
             </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    !notification.is_read && "bg-blue-50/50 dark:bg-blue-900/10"
                  )}
                  onClick={() => handleItemClick(notification)}
                >
                  <div className="mt-1 flex-shrink-0">
                    <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center bg-background border shadow-sm",
                        !notification.is_read ? "border-blue-200 dark:border-blue-800" : "border-muted"
                    )}>
                        {getIcon(notification.type)}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-sm font-medium leading-none", !notification.is_read && "text-foreground")}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                       {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: de })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="mt-2 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
