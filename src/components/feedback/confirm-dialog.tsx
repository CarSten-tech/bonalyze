"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { ReactNode, useState } from "react"
import { Spinner } from "@/components/common/loading-state"

/**
 * ConfirmDialog Component
 *
 * Per DESIGN-UX-BLUEPRINT.md Section 4 (Dialog):
 * - Destructive confirmations
 * - Centered, with backdrop
 * - Always closeable via X or backdrop tap
 *
 * Usage:
 * - Confirming deletion (receipts, household, account)
 * - Confirming leaving a household
 * - Any irreversible action
 */

interface ConfirmDialogProps {
  /** Dialog trigger element */
  trigger: ReactNode
  /** Dialog title */
  title: string
  /** Dialog description/explanation */
  description: string
  /** Confirm button text */
  confirmLabel?: string
  /** Cancel button text */
  cancelLabel?: string
  /** Is this a destructive action (shows red button) */
  destructive?: boolean
  /** Called when user confirms. Return a promise to show loading state */
  onConfirm: () => void | Promise<void>
  /** Called when user cancels */
  onCancel?: () => void
  /** Controlled open state */
  open?: boolean
  /** Controlled onOpenChange */
  onOpenChange?: (open: boolean) => void
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Bestaetigen",
  cancelLabel = "Abbrechen",
  destructive = false,
  onConfirm,
  onCancel,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)

  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  const handleConfirm = async () => {
    try {
      setIsLoading(true)
      await onConfirm()
      setIsOpen(false)
    } catch (error) {
      // Error handling should be done by the caller
      console.error("Confirm action failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    setIsOpen(false)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-sm mx-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-sm">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1",
              destructive && "bg-destructive hover:bg-destructive/90"
            )}
          >
            {isLoading ? (
              <Spinner size="sm" className="mr-2" />
            ) : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/* =============================================================================
   PRESET CONFIRM DIALOGS
   Common confirmation dialogs used throughout the app
   ============================================================================= */

interface PresetConfirmDialogProps {
  trigger: ReactNode
  onConfirm: () => void | Promise<void>
  /** Optional: name of the item being deleted for personalized message */
  itemName?: string
}

/** Confirm deletion of a receipt */
export function DeleteReceiptDialog({
  trigger,
  onConfirm,
}: PresetConfirmDialogProps) {
  return (
    <ConfirmDialog
      trigger={trigger}
      title="Kassenbon loeschen"
      description="Dieser Kassenbon wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
      confirmLabel="Loeschen"
      destructive
      onConfirm={onConfirm}
    />
  )
}

/** Confirm leaving a household */
export function LeaveHouseholdDialog({
  trigger,
  onConfirm,
  itemName,
}: PresetConfirmDialogProps) {
  return (
    <ConfirmDialog
      trigger={trigger}
      title="Haushalt verlassen"
      description={`Du wirst "${itemName || "diesen Haushalt"}" verlassen. Du kannst nur wieder beitreten wenn du erneut eingeladen wirst.`}
      confirmLabel="Verlassen"
      destructive
      onConfirm={onConfirm}
    />
  )
}

/** Confirm removal of a household member */
export function RemoveMemberDialog({
  trigger,
  onConfirm,
  itemName,
}: PresetConfirmDialogProps) {
  return (
    <ConfirmDialog
      trigger={trigger}
      title="Mitglied entfernen"
      description={`${itemName || "Dieses Mitglied"} wird aus dem Haushalt entfernt. Die Person kann nur wieder beitreten wenn sie erneut eingeladen wird.`}
      confirmLabel="Entfernen"
      destructive
      onConfirm={onConfirm}
    />
  )
}

/** Confirm marking settlement as done */
export function MarkSettlementDoneDialog({
  trigger,
  onConfirm,
}: PresetConfirmDialogProps) {
  return (
    <ConfirmDialog
      trigger={trigger}
      title="Abrechnung abschliessen"
      description="Die Abrechnung wird als erledigt markiert. Alle offenen Beträge werden zurückgesetzt."
      confirmLabel="Abschliessen"
      onConfirm={onConfirm}
    />
  )
}

/** Confirm account deletion */
export function DeleteAccountDialog({
  trigger,
  onConfirm,
}: PresetConfirmDialogProps) {
  return (
    <ConfirmDialog
      trigger={trigger}
      title="Konto loeschen"
      description="Dein Konto und alle damit verbundenen Daten werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
      confirmLabel="Konto loeschen"
      destructive
      onConfirm={onConfirm}
    />
  )
}

export default ConfirmDialog
