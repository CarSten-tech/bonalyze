'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

type Household = Tables<'households'>
type HouseholdMember = Tables<'household_members'> & {
  households: Household
}

interface HouseholdWithRole extends Household {
  role: string | null
}

interface HouseholdContextType {
  currentHousehold: HouseholdWithRole | null
  households: HouseholdWithRole[]
  isLoading: boolean
  switchHousehold: (householdId: string) => void
  refreshHouseholds: () => Promise<void>
  isAdmin: boolean
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined)

const STORAGE_KEY = 'bonalyze_active_household'

interface HouseholdProviderProps {
  children: ReactNode
}

export function HouseholdProvider({ children }: HouseholdProviderProps) {
  const [currentHousehold, setCurrentHousehold] = useState<HouseholdWithRole | null>(null)
  const [households, setHouseholds] = useState<HouseholdWithRole[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const loadHouseholds = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    // Fetch all households where user is a member
    const { data: memberships, error } = await supabase
      .from('household_members')
      .select(`
        role,
        households (
          id,
          name,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading households:', error)
      setIsLoading(false)
      return
    }

    // Transform data to HouseholdWithRole[]
    const userHouseholds: HouseholdWithRole[] = (memberships || [])
      .filter((m): m is HouseholdMember & { households: Household } => m.households !== null)
      .map((m) => ({
        ...m.households,
        role: m.role,
      }))

    setHouseholds(userHouseholds)

    // Try to restore last active household from localStorage
    const savedHouseholdId = localStorage.getItem(STORAGE_KEY)

    if (savedHouseholdId) {
      const savedHousehold = userHouseholds.find((h) => h.id === savedHouseholdId)
      if (savedHousehold) {
        setCurrentHousehold(savedHousehold)
        setIsLoading(false)
        return
      }
    }

    // Default to first household if available
    if (userHouseholds.length > 0) {
      setCurrentHousehold(userHouseholds[0])
      localStorage.setItem(STORAGE_KEY, userHouseholds[0].id)
    }

    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHouseholds()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadHouseholds])

  const switchHousehold = useCallback((householdId: string) => {
    const household = households.find((h) => h.id === householdId)
    if (household) {
      setCurrentHousehold(household)
      localStorage.setItem(STORAGE_KEY, householdId)
    }
  }, [households])

  const refreshHouseholds = useCallback(async () => {
    setIsLoading(true)
    await loadHouseholds()
  }, [loadHouseholds])

  const isAdmin = currentHousehold?.role === 'admin' || currentHousehold?.role === 'owner'

  return (
    <HouseholdContext.Provider
      value={{
        currentHousehold,
        households,
        isLoading,
        switchHousehold,
        refreshHouseholds,
        isAdmin,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const context = useContext(HouseholdContext)
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider')
  }
  return context
}
