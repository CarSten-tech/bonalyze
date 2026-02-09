'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import { useSync } from '@/hooks/use-sync'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useSync()
  
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 1 minute
        staleTime: 60 * 1000,
        // Refetch on window focus is true by default, which is good
        networkMode: 'offlineFirst',
      },
      mutations: {
        networkMode: 'offlineFirst',
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
