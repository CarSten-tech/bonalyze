'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, X, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useNutritionData } from '@/hooks/use-nutrition-data'
import { useFoodSearch } from '@/hooks/use-food-search'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase'
import { getRecentFoodItems } from '@/app/actions/nutrition'
import type { FoodSearchResult } from '@/lib/open-food-facts'
import { cn } from '@/lib/utils'

const MEAL_META: Record<string, { label: string; emoji: string }> = {
  fruehstueck: { label: 'Fruehstueck', emoji: '\u{1F305}' },
  mittagessen: { label: 'Mittagessen', emoji: '\u{1F37D}\u{FE0F}' },
  abendessen: { label: 'Abendessen', emoji: '\u{1F319}' },
  snacks: { label: 'Snacks', emoji: '\u{1F36A}' },
}

interface RecentItem {
  item_name: string | null
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

function FoodResultRow({
  name,
  subtitle,
  calories,
  protein,
  carbs,
  fat,
  onAdd,
  added,
}: {
  name: string
  subtitle?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  onAdd: () => void
  added?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
          E {protein}g &middot; K {carbs}g &middot; F {fat}g
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {calories} kcal
        </span>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-9 w-9 rounded-full transition-colors',
            added
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-primary text-primary hover:bg-primary/10'
          )}
          onClick={onAdd}
          disabled={added}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function ManualEntryForm({
  mealType,
  onAdd,
}: {
  mealType: string
  onAdd: (data: {
    meal_type: string
    item_name: string
    calories_kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name || !kcal) return
    setIsSubmitting(true)
    try {
      await onAdd({
        meal_type: mealType,
        item_name: name,
        calories_kcal: parseInt(kcal) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      })
      toast.success(`${name} hinzugefuegt`)
      setName('')
      setKcal('')
      setProtein('')
      setCarbs('')
      setFat('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Lebensmittel</label>
        <Input
          placeholder="z.B. Magerquark, Haferflocken..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Kalorien (kcal)</label>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="250"
          value={kcal}
          onChange={(e) => setKcal(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Eiweiss (g)
          </label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Kohlenh. (g)
          </label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Fett (g)
          </label>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
          />
        </div>
      </div>
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={!name || !kcal || isSubmitting}
      >
        Hinzufuegen
      </Button>
    </div>
  )
}

export default function MahlzeitPage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type } = use(params)
  const router = useRouter()
  const { currentHousehold } = useHousehold()
  const { addLog } = useNutritionData(new Date())
  const { query, results, isSearching, search, clearSearch } = useFoodSearch()

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [addedCount, setAddedCount] = useState(0)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('zuletzt')
  const [userId, setUserId] = useState<string | null>(null)

  const meta = MEAL_META[type] || { label: type, emoji: '' }

  // Get user ID
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null)
    })
  }, [])

  // Fetch recent items
  useEffect(() => {
    if (!currentHousehold || !userId) return
    setRecentLoading(true)
    getRecentFoodItems(currentHousehold.id, userId, type)
      .then(setRecentItems)
      .catch(() => setRecentItems([]))
      .finally(() => setRecentLoading(false))
  }, [currentHousehold, userId, type])

  // Switch to search tab when user types
  useEffect(() => {
    if (query.length >= 2) {
      setActiveTab('suche')
    }
  }, [query])

  const handleAddFromSearch = useCallback(
    async (item: FoodSearchResult) => {
      if (addedIds.has(item.id)) return
      try {
        await addLog({
          meal_type: type,
          item_name: item.brand ? `${item.name} (${item.brand})` : item.name,
          calories_kcal: item.calories,
          protein_g: item.protein,
          carbs_g: item.carbs,
          fat_g: item.fat,
        })
        setAddedIds((prev) => new Set(prev).add(item.id))
        setAddedCount((c) => c + 1)
        toast.success(`${item.name} hinzugefuegt`)
      } catch {
        toast.error('Fehler beim Hinzufuegen')
      }
    },
    [addLog, type, addedIds]
  )

  const handleAddFromRecent = useCallback(
    async (item: RecentItem) => {
      if (!item.item_name) return
      try {
        await addLog({
          meal_type: type,
          item_name: item.item_name,
          calories_kcal: item.calories_kcal || 0,
          protein_g: Number(item.protein_g) || 0,
          carbs_g: Number(item.carbs_g) || 0,
          fat_g: Number(item.fat_g) || 0,
        })
        setAddedCount((c) => c + 1)
        toast.success(`${item.item_name} hinzugefuegt`)
      } catch {
        toast.error('Fehler beim Hinzufuegen')
      }
    },
    [addLog, type]
  )

  return (
    <div className="flex flex-col min-h-screen bg-background -mx-4 -mt-2">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border safe-top">
        <div className="flex h-14 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">
            {meta.emoji} {meta.label}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary font-semibold"
            onClick={() => router.back()}
          >
            Fertig
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 pr-10 h-10 bg-muted/50 border-0"
              placeholder="Lebensmittel suchen..."
              value={query}
              onChange={(e) => search(e.target.value)}
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="px-4 border-b border-border">
          <TabsList className="w-full bg-transparent h-auto p-0 gap-0">
            <TabsTrigger
              value="suche"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
            >
              Suche
            </TabsTrigger>
            <TabsTrigger
              value="zuletzt"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
            >
              Zuletzt
            </TabsTrigger>
            <TabsTrigger
              value="manuell"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
            >
              Manuell
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Search Results Tab */}
        <TabsContent value="suche" className="flex-1 mt-0">
          {isSearching ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-full" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div>
              {results.map((item) => (
                <FoodResultRow
                  key={item.id}
                  name={item.name}
                  subtitle={
                    item.brand
                      ? `${item.brand} \u00B7 pro 100g`
                      : 'pro 100g'
                  }
                  calories={item.calories}
                  protein={item.protein}
                  carbs={item.carbs}
                  fat={item.fat}
                  onAdd={() => handleAddFromSearch(item)}
                  added={addedIds.has(item.id)}
                />
              ))}
              <p className="text-center text-xs text-muted-foreground py-4">
                Powered by Open Food Facts
              </p>
            </div>
          ) : query.length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Keine Ergebnisse fuer &bdquo;{query}&ldquo;
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Versuche es mit einem anderen Begriff oder nutze die manuelle
                Eingabe
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Suche nach Lebensmitteln in der Open Food Facts Datenbank
              </p>
            </div>
          )}
        </TabsContent>

        {/* Recent Items Tab */}
        <TabsContent value="zuletzt" className="flex-1 mt-0">
          {recentLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentItems.length > 0 ? (
            <div>
              {recentItems.map((item, idx) => (
                <FoodResultRow
                  key={`${item.item_name}-${idx}`}
                  name={item.item_name || 'Unbenannt'}
                  calories={item.calories_kcal || 0}
                  protein={Number(item.protein_g) || 0}
                  carbs={Number(item.carbs_g) || 0}
                  fat={Number(item.fat_g) || 0}
                  onAdd={() => handleAddFromRecent(item)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-muted-foreground">
                Noch keine Eintraege fuer {meta.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Eintraege werden hier gespeichert, sobald du etwas hinzufuegst
              </p>
            </div>
          )}
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manuell" className="flex-1 mt-0">
          <ManualEntryForm mealType={type} onAdd={addLog} />
        </TabsContent>
      </Tabs>

      {/* Bottom Bar */}
      {addedCount > 0 && (
        <div className="sticky bottom-0 z-30 bg-background border-t border-border safe-bottom px-4 py-3">
          <Button className="w-full h-12 text-base" onClick={() => router.back()}>
            Fertig &middot; {addedCount}{' '}
            {addedCount === 1 ? 'Eintrag' : 'Eintraege'} hinzugefuegt
          </Button>
        </div>
      )}
    </div>
  )
}
