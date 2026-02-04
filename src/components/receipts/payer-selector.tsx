'use client'

import * as React from 'react'
import { User } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface HouseholdMember {
  user_id: string
  display_name: string
}

interface PayerSelectorProps {
  members: HouseholdMember[]
  selectedUserId: string | null
  onSelect: (userId: string) => void
  label?: string
  className?: string
}

export function PayerSelector({
  members,
  selectedUserId,
  onSelect,
  label = 'Bezahlt von',
  className,
}: PayerSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <Select value={selectedUserId || ''} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Wer hat bezahlt?">
            {selectedUserId && (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {members.find((m) => m.user_id === selectedUserId)?.display_name ||
                  'Unbekannt'}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {members.map((member) => (
            <SelectItem key={member.user_id} value={member.user_id}>
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {member.display_name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
