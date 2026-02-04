'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Receipt, Users, Wallet } from 'lucide-react'
import Link from 'next/link'

type EmptyStateVariant = 'no_receipts' | 'no_members' | 'single_member'

interface SettlementEmptyStateProps {
  variant: EmptyStateVariant
  periodLabel?: string
}

export function SettlementEmptyState({
  variant,
  periodLabel,
}: SettlementEmptyStateProps) {
  const content = getEmptyStateContent(variant, periodLabel)

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          {content.icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
        <p className="text-muted-foreground max-w-sm mb-6">
          {content.description}
        </p>
        {content.action && (
          <Button asChild variant={content.action.variant || 'default'}>
            <Link href={content.action.href}>{content.action.label}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function getEmptyStateContent(
  variant: EmptyStateVariant,
  periodLabel?: string
): {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    href: string
    label: string
    variant?: 'default' | 'outline' | 'secondary'
  }
} {
  switch (variant) {
    case 'no_receipts':
      return {
        icon: <Receipt className="h-8 w-8 text-muted-foreground" />,
        title: 'Keine Ausgaben',
        description: periodLabel
          ? `Im Zeitraum ${periodLabel} wurden keine Kassenbons erfasst. Es gibt nichts auszugleichen.`
          : 'In diesem Zeitraum wurden keine Kassenbons erfasst. Es gibt nichts auszugleichen.',
        action: {
          href: '/dashboard/receipts/new',
          label: 'Kassenbon erfassen',
        },
      }

    case 'no_members':
      return {
        icon: <Users className="h-8 w-8 text-muted-foreground" />,
        title: 'Keine Haushaltsmitglieder',
        description:
          'Fuer die Abrechnung werden mindestens zwei Haushaltsmitglieder benoetigt.',
        action: {
          href: '/settings/household',
          label: 'Mitglieder einladen',
        },
      }

    case 'single_member':
      return {
        icon: <Wallet className="h-8 w-8 text-muted-foreground" />,
        title: 'Nur ein Mitglied',
        description:
          'Die Abrechnung ist nur sinnvoll wenn mehrere Personen im Haushalt sind. Lade weitere Mitglieder ein.',
        action: {
          href: '/settings/household',
          label: 'Mitglieder einladen',
          variant: 'outline',
        },
      }

    default:
      return {
        icon: <Wallet className="h-8 w-8 text-muted-foreground" />,
        title: 'Keine Daten',
        description: 'Es sind keine Daten fuer die Abrechnung verfuegbar.',
      }
  }
}
