"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, Trash2, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { upsertBudget, getBudget } from "@/app/actions/budget"
import { useHousehold } from "@/contexts/household-context"

const budgetSchema = z.object({
  period_type: z.enum(["monthly", "weekly"]),
  total_amount: z.coerce.number().min(1, "Betrag muss > 0 sein"),
  categories: z.array(z.object({
    category: z.string().min(1, "Name erforderlich"),
    amount: z.coerce.number().min(1, "Betrag muss > 0 sein")
  })).default([])
})

type BudgetFormData = z.infer<typeof budgetSchema>

export function BudgetSettings() {
  const { currentHousehold, isAdmin } = useHousehold()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema) as any,
    defaultValues: {
      period_type: "monthly",
      total_amount: 0,
      categories: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "categories"
  })

  useEffect(() => {
    const loadBudget = async () => {
      if (!currentHousehold) return
      
      try {
        const budget = await getBudget(currentHousehold.id)
        if (budget) {
          form.reset({
            period_type: budget.period_type as "monthly" | "weekly",
            total_amount: budget.total_amount_cents / 100,
            categories: budget.category_budgets.map((cb: any) => ({
              category: cb.category,
              amount: cb.amount_cents / 100
            }))
          })
        }
      } catch (error) {
        console.error("Error loading budget:", error)
        // It's okay if no budget exists yet
      } finally {
        setIsLoading(false)
      }
    }

    loadBudget()
  }, [currentHousehold, form])

  const onSubmit: import("react-hook-form").SubmitHandler<BudgetFormData> = async (data) => {
    if (!currentHousehold) return
    setIsSaving(true)

    try {
      await upsertBudget(currentHousehold.id, {
        period_type: data.period_type,
        total_amount_cents: Math.round(data.total_amount * 100),
        categories: data.categories.map(c => ({
          category: c.category,
          amount_cents: Math.round(c.amount * 100)
        }))
      })
      toast.success("Budget Einstellungen gespeichert")
    } catch (error: any) {
      toast.error("Fehler beim Speichern", {
        description: error.message
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Budget Einstellungen</h1>
        <p className="text-muted-foreground">
          Konfiguriere dein Haushalts-Budget und Ausgaben-Warnungen
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Allgemeines Budget</CardTitle>
            <CardDescription>
              Lege fest wie viel du monatlich oder wöchentlich ausgeben möchtest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Zeitraum</Label>
              <Select
                disabled={isSaving}
                onValueChange={(value) => form.setValue("period_type", value as "monthly" | "weekly")}
                defaultValue={form.getValues("period_type")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wähle einen Zeitraum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monatlich</SelectItem>
                  <SelectItem value="weekly">Wöchentlich</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Gesamt-Budget (€)</Label>
              <Input
                type="number"
                step="0.01"
                disabled={isSaving}
                {...form.register("total_amount")}
              />
              {form.formState.errors.total_amount && (
                <p className="text-sm text-destructive">{form.formState.errors.total_amount.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Kategorie-Budgets (Optional)</CardTitle>
                <CardDescription>
                  Setze spezifische Limits für bestimmte Kategorien.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ category: "", amount: 0 })}
                disabled={isSaving}
              >
                <Plus className="h-4 w-4 mr-2" />
                Kategorie hinzufügen
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-start">
                <div className="grid gap-2 flex-1">
                  <Label className={index !== 0 ? "sr-only" : ""}>Kategorie</Label>
                  <Input
                    placeholder="z.B. Lebensmittel"
                    disabled={isSaving}
                    {...form.register(`categories.${index}.category`)}
                  />
                  {form.formState.errors.categories?.[index]?.category && (
                    <p className="text-sm text-destructive">{form.formState.errors.categories[index]?.category?.message}</p>
                  )}
                </div>
                <div className="grid gap-2 w-32">
                  <Label className={index !== 0 ? "sr-only" : ""}>Betrag (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    disabled={isSaving}
                    {...form.register(`categories.${index}.amount`)}
                  />
                   {form.formState.errors.categories?.[index]?.amount && (
                    <p className="text-sm text-destructive">{form.formState.errors.categories[index]?.amount?.message}</p>
                  )}
                </div>
                <div className={index === 0 ? "mt-8" : ""}>
                   <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Kategorie-Budgets definiert.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Einstellungen speichern
          </Button>
        </div>
      </form>
    </div>
  )
}
