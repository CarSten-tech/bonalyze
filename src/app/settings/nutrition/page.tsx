'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, Users } from 'lucide-react'
import { toast } from 'sonner'

import { useHousehold } from '@/contexts/household-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getHouseholdNutritionProfiles,
  upsertMemberNutritionProfile,
} from '@/app/actions/nutrition'
import {
  ACTIVITY_LEVEL_LABELS,
  GENDER_LABELS,
  calculateBMR,
  calculateTDEE,
  type ActivityLevel,
  type Gender,
} from '@/lib/nutrition-utils'

interface MemberProfile {
  memberId: string
  displayName: string
  avatarUrl: string | null
  // Form fields
  age: string
  weight: string
  height: string
  gender: Gender
  activityLevel: ActivityLevel
  // Computed
  bmr: number | null
  tdee: number | null
  // Targets (optional)
  targetCalories: string
  targetWater: string
  // State
  isSaving: boolean
  hasProfile: boolean
}

export default function NutritionSettingsPage() {
  const { currentHousehold, isLoading: isHouseholdLoading } = useHousehold()
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!currentHousehold) return

      setIsLoading(true)
      try {
        const data = await getHouseholdNutritionProfiles(currentHousehold.id)

        const profiles: MemberProfile[] = (data || []).map((m) => {
          const profile = Array.isArray(m.member_nutrition_profiles)
            ? m.member_nutrition_profiles[0]
            : m.member_nutrition_profiles
          const profileData = profile as {
            age_years: number
            weight_kg: number
            height_cm: number
            gender: string
            activity_level: string
            bmr_kcal: number
            tdee_kcal: number
            target_calories_kcal: number | null
            target_water_ml: number | null
          } | null

          return {
            memberId: m.id,
            displayName: (m.profiles as { display_name: string } | null)?.display_name || 'Unbekannt',
            avatarUrl: (m.profiles as { avatar_url: string | null } | null)?.avatar_url || null,
            age: profileData?.age_years?.toString() || '',
            weight: profileData?.weight_kg?.toString() || '',
            height: profileData?.height_cm?.toString() || '',
            gender: (profileData?.gender as Gender) || 'male',
            activityLevel: (profileData?.activity_level as ActivityLevel) || 'moderate',
            bmr: profileData?.bmr_kcal || null,
            tdee: profileData?.tdee_kcal || null,
            targetCalories: profileData?.target_calories_kcal?.toString() || '',
            targetWater: profileData?.target_water_ml?.toString() || '',
            isSaving: false,
            hasProfile: !!profileData,
          }
        })

        setMembers(profiles)
      } catch (err) {
        console.error('Error loading profiles:', err)
        toast.error('Fehler beim Laden der Profile')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [currentHousehold])

  const updateMember = (index: number, field: keyof MemberProfile, value: string) => {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const saveMember = async (index: number) => {
    const member = members[index]
    if (!member.age || !member.weight || !member.height) {
      toast.error('Bitte alle Pflichtfelder ausfuellen')
      return
    }

    setMembers(prev => prev.map((m, i) => i === index ? { ...m, isSaving: true } : m))

    try {
      const age = parseInt(member.age)
      const weight = parseFloat(member.weight)
      const height = parseFloat(member.height)

      await upsertMemberNutritionProfile(member.memberId, {
        age_years: age,
        weight_kg: weight,
        height_cm: height,
        gender: member.gender,
        activity_level: member.activityLevel,
        target_calories_kcal: member.targetCalories ? parseInt(member.targetCalories) : null,
        target_water_ml: member.targetWater ? parseInt(member.targetWater) : null,
      })

      // Update computed values locally
      const bmr = calculateBMR(weight, height, age, member.gender)
      const tdee = calculateTDEE(bmr, member.activityLevel)

      setMembers(prev => prev.map((m, i) =>
        i === index ? { ...m, bmr, tdee, hasProfile: true, isSaving: false } : m
      ))

      toast.success(`Profil fuer ${member.displayName} gespeichert`)
    } catch (err) {
      console.error('Error saving profile:', err)
      toast.error('Fehler beim Speichern')
      setMembers(prev => prev.map((m, i) => i === index ? { ...m, isSaving: false } : m))
    }
  }

  // Calculate aggregate household TDEE
  const totalHouseholdTDEE = members.reduce((sum, m) => sum + (m.tdee || 0), 0)
  const profileCount = members.filter(m => m.hasProfile).length

  if (isHouseholdLoading || isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Ernaehrungs-Profile</h1>
        <p className="text-muted-foreground">
          Erfasse BMR-Daten fuer Haushaltsmitglieder zur Berechnung der Versorgungsreichweite.
        </p>
      </div>

      {/* Aggregate Summary */}
      {profileCount > 0 && (
        <Card className="rounded-xl shadow-sm border-0 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tagesbedarf Haushalt</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  ~{totalHouseholdTDEE.toLocaleString('de-DE')} kcal/Tag
                </p>
                <p className="text-xs text-muted-foreground">
                  {profileCount} von {members.length} {members.length === 1 ? 'Mitglied' : 'Mitgliedern'} eingerichtet
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Cards */}
      {members.map((member, index) => (
        <Card key={member.memberId} className="rounded-xl shadow-sm border-0 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {member.displayName}
              {member.hasProfile && member.tdee && (
                <span className="text-sm font-normal text-muted-foreground ml-auto">
                  {member.tdee.toLocaleString('de-DE')} kcal/Tag
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`age-${index}`}>Alter (Jahre)</Label>
                <Input
                  id={`age-${index}`}
                  type="number"
                  placeholder="30"
                  value={member.age}
                  onChange={(e) => updateMember(index, 'age', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`gender-${index}`}>Geschlecht</Label>
                <Select
                  value={member.gender}
                  onValueChange={(v) => updateMember(index, 'gender', v)}
                >
                  <SelectTrigger id={`gender-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(GENDER_LABELS) as [Gender, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`weight-${index}`}>Gewicht (kg)</Label>
                <Input
                  id={`weight-${index}`}
                  type="number"
                  step="0.1"
                  placeholder="75.0"
                  value={member.weight}
                  onChange={(e) => updateMember(index, 'weight', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`height-${index}`}>Groesse (cm)</Label>
                <Input
                  id={`height-${index}`}
                  type="number"
                  step="0.1"
                  placeholder="175.0"
                  value={member.height}
                  onChange={(e) => updateMember(index, 'height', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`activity-${index}`}>Aktivitaetslevel</Label>
              <Select
                value={member.activityLevel}
                onValueChange={(v) => updateMember(index, 'activityLevel', v)}
              >
                <SelectTrigger id={`activity-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ACTIVITY_LEVEL_LABELS) as [ActivityLevel, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional targets */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`targetCal-${index}`} className="text-muted-foreground text-xs">
                  Kalorien-Ziel (optional)
                </Label>
                <Input
                  id={`targetCal-${index}`}
                  type="number"
                  placeholder="Auto (TDEE)"
                  value={member.targetCalories}
                  onChange={(e) => updateMember(index, 'targetCalories', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`targetWater-${index}`} className="text-muted-foreground text-xs">
                  Wasser-Ziel (ml, optional)
                </Label>
                <Input
                  id={`targetWater-${index}`}
                  type="number"
                  placeholder="2500"
                  value={member.targetWater}
                  onChange={(e) => updateMember(index, 'targetWater', e.target.value)}
                />
              </div>
            </div>

            {/* Computed values */}
            {member.hasProfile && member.bmr && member.tdee && (
              <div className="bg-muted rounded-lg p-3 flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">BMR: </span>
                  <span className="font-medium tabular-nums">{member.bmr.toLocaleString('de-DE')} kcal</span>
                </div>
                <div>
                  <span className="text-muted-foreground">TDEE: </span>
                  <span className="font-medium tabular-nums">{member.tdee.toLocaleString('de-DE')} kcal</span>
                </div>
              </div>
            )}

            {/* Save button */}
            <Button
              className="w-full"
              onClick={() => saveMember(index)}
              disabled={member.isSaving || !member.age || !member.weight || !member.height}
            >
              {member.isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Profil speichern
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
