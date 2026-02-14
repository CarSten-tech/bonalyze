'use client'

import Link from 'next/link'
import { Loader2, ArrowLeft, History, FileX } from 'lucide-react'

import { useHousehold } from '@/contexts/household-context'
import { useSettlementHistory } from '@/hooks/use-settlement-history'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import {
  SettlementHistoryCard,
  SettlementHistoryCardSkeleton,
} from '@/components/settlement/settlement-history-card'

export default function SettlementHistoryPage() {
  const { currentHousehold, isLoading: isHouseholdLoading } = useHousehold()
  const { settlements, isLoading, error, filter, setFilter } =
    useSettlementHistory()

  // Loading state
  if (isHouseholdLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No household
  if (!currentHousehold) {
    return (
      <div className="space-y-6">
        <Header />
        <p className="text-muted-foreground">
          Bitte wähle einen Haushalt aus.
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header />

      {/* Filter Tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as 'all' | 'open' | 'settled')}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="open">Offen</TabsTrigger>
          <TabsTrigger value="settled">Erledigt</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <SettlementHistoryCardSkeleton />
          <SettlementHistoryCardSkeleton />
          <SettlementHistoryCardSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && settlements.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <FileX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Keine Abrechnungen</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              {filter === 'open' && 'Es gibt keine offenen Abrechnungen.'}
              {filter === 'settled' && 'Es gibt noch keine erledigten Abrechnungen.'}
              {filter === 'all' &&
                'Es wurden noch keine Abrechnungen abgeschlossen. Markiere eine aktuelle Abrechnung als erledigt, um sie hier zu sehen.'}
            </p>
            <Button asChild>
              <Link href="/dashboard/settlement">Zur aktuellen Abrechnung</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Settlement List */}
      {!isLoading && settlements.length > 0 && (
        <div className="space-y-4">
          {settlements.map((settlement) => (
            <SettlementHistoryCard key={settlement.id} settlement={settlement} />
          ))}
        </div>
      )}
    </div>
  )
}

function Header() {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" asChild>
        <Link href="/dashboard/settlement">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">Abrechnungs-Historie</h1>
        <p className="text-muted-foreground mt-1">
          Vergangene Abrechnungen einsehen
        </p>
      </div>
    </div>
  )
}
