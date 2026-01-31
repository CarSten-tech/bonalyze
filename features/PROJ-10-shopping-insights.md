# PROJ-10: Shopping Insights

## Status: 🔵 Planned

## Übersicht
AI-basierte Insights und Empfehlungen basierend auf Einkaufsdaten. Zeigt Muster, Trends und hilfreiche Tipps.

## Abhängigkeiten
- Benötigt: PROJ-1 (Database Schema) - für Datenbasis
- Benötigt: PROJ-6 (Receipt List) - für ausreichend Daten
- Benötigt: PROJ-9 (Preis-Tracking) - für Preisvergleiche

## User Stories

### US-1: Einkaufsmuster erkennen
- Als **User** möchte ich **sehen welche Produkte ich regelmäßig kaufe**, um **nichts zu vergessen**

### US-2: Spar-Tipps
- Als **User** möchte ich **Tipps zum Sparen bekommen**, um **weniger auszugeben**

### US-3: Einkaufs-Rhythmus
- Als **User** möchte ich **meinen Einkaufs-Rhythmus verstehen**, um **besser zu planen**

## Acceptance Criteria

### AC-1: Insight-Cards
- [ ] "Du kaufst X oft bei Y" Insight
- [ ] "X war bei Y günstiger" Spar-Tipp
- [ ] "Du kaufst ca. alle X Tage ein" Rhythmus-Insight
- [ ] "Deine Top 5 Produkte diesen Monat" Liste

### AC-2: Spar-Potential
- [ ] "Hättest du X bei Y gekauft, hättest du €Z gespart"
- [ ] Basierend auf tatsächlichen Preisdaten

### AC-3: Regelmäßige Käufe
- [ ] Produkte die mind. 3x in 30 Tagen gekauft wurden
- [ ] Durchschnittlicher Kaufabstand

### AC-4: Insight-Generierung
- [ ] Insights werden beim Dashboard-Load generiert
- [ ] Caching für Performance
- [ ] Rotation: Nicht immer dieselben Insights

### AC-5: Mindestdaten
- [ ] Insights erst ab 10 Receipts anzeigen
- [ ] Davor: "Scanne mehr Kassenbons für Insights"

## Edge Cases

### EC-1: Zu wenig Daten
- **Was passiert, wenn** weniger als 10 Receipts existieren?
- **Lösung**: Motivierende Message, keine falschen Insights

### EC-2: Keine Preisunterschiede
- **Was passiert, wenn** alle Käufe bei gleichem Store?
- **Lösung**: Keine Spar-Insights, andere Insights zeigen

### EC-3: Saisonale Produkte
- **Was passiert, wenn** Produkte nur saisonal gekauft werden?
- **Lösung**: Nicht als "regelmäßig" klassifizieren

## UI/UX Spezifikation

### Insights Section (Dashboard)
```
┌─────────────────────────────┐
│  💡 Shopping Insights       │
├─────────────────────────────┤
│                             │
│  ┌───────────────────────┐  │
│  │ 🛒 Einkaufs-Rhythmus  │  │
│  │                       │  │
│  │ Du kaufst etwa alle   │  │
│  │ 4-5 Tage ein.         │  │
│  │ Meistens Samstags.    │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ 💰 Spar-Tipp          │  │
│  │                       │  │
│  │ Hafermilch ist bei    │  │
│  │ LIDL 30ct günstiger   │  │
│  │ als bei REWE.         │  │
│  │                       │  │
│  │ Ersparnis/Monat: ~€2  │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ 🔄 Regelmäßige Käufe  │  │
│  │                       │  │
│  │ Diese Produkte kaufst │  │
│  │ du oft:               │  │
│  │ • Milch (alle 5 Tage) │  │
│  │ • Brot (alle 3 Tage)  │  │
│  │ • Bananen (wöchentl.) │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

## Implementation Notes

### Insight-Generierung
```typescript
interface Insight {
  type: 'rhythm' | 'saving' | 'frequent' | 'trend'
  title: string
  description: string
  data?: any
  priority: number
}

async function generateInsights(householdId: string): Promise<Insight[]> {
  const insights: Insight[] = []

  // 1. Einkaufs-Rhythmus
  const rhythm = await analyzeShoppingRhythm(householdId)
  if (rhythm) insights.push(rhythm)

  // 2. Spar-Potential
  const savings = await findSavingOpportunities(householdId)
  insights.push(...savings)

  // 3. Regelmäßige Käufe
  const frequent = await findFrequentProducts(householdId)
  if (frequent.length > 0) insights.push(createFrequentInsight(frequent))

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 3)
}
```

## Checklist vor Abschluss

- [x] **User Stories komplett**: 3 User Stories definiert
- [x] **Acceptance Criteria konkret**: 5 Kategorien
- [x] **Edge Cases identifiziert**: 3 Edge Cases
- [x] **Feature-ID vergeben**: PROJ-10
- [x] **Status gesetzt**: 🔵 Planned
- [ ] **User Review**: Warte auf User-Approval

## Tech-Design (Solution Architect)

### Component-Struktur

```
Dashboard-Seite
└── Insights Section (neuer Bereich)
    ├── Section Header ("Shopping Insights")
    ├── Leerer Zustand (wenn < 10 Receipts)
    │   └── Motivations-Nachricht + Fortschrittsanzeige
    └── Insight-Cards (wenn >= 10 Receipts)
        ├── Einkaufs-Rhythmus Card
        │   └── Zeigt: Intervall + bevorzugter Wochentag
        ├── Spar-Tipp Card
        │   └── Zeigt: Produkt, Stores, Preisdifferenz, monatliche Ersparnis
        └── Regelmaessige Kaeufe Card
            └── Zeigt: Liste der Top-Produkte mit Kaufintervall
```

**Wiederverwendbare Komponenten (bereits vorhanden):**
- Card (shadcn/ui) - fuer Insight-Karten
- Badge (shadcn/ui) - fuer Kategorien/Tags
- Progress (shadcn/ui) - fuer Fortschrittsanzeige
- Skeleton (shadcn/ui) - fuer Ladezustand

### Daten-Model

**Welche Daten werden analysiert:**
Die Insights basieren auf bereits vorhandenen Daten - es werden KEINE neuen Tabellen benoetigt!

Genutzt werden:
- Kassenbons (wann wurde wo eingekauft?)
- Produkte auf Kassenbons (was wurde gekauft?)
- Preise (was hat es gekostet?)
- Haendler (wo wurde eingekauft?)

**Berechnete Insights (zur Laufzeit, nicht gespeichert):**

1. **Einkaufs-Rhythmus**
   - Durchschnittlicher Abstand zwischen Einkaeufen (in Tagen)
   - Haeufigster Einkaufstag (z.B. "Samstag")

2. **Spar-Tipps**
   - Produkte die bei verschiedenen Haendlern unterschiedlich kosten
   - Preisdifferenz pro Produkt
   - Geschaetzte monatliche Ersparnis

3. **Regelmaessige Kaeufe**
   - Produkte die mindestens 3x in 30 Tagen gekauft wurden
   - Durchschnittlicher Kaufabstand pro Produkt

**Caching:**
- Insights werden im Browser zwischengespeichert (5 Minuten)
- Verhindert staendige Neuberechnung beim Seitenwechsel

### Backend vs. Frontend Entscheidung

**Loesung: API Route + Datenbank-Abfragen**

Warum Backend (API Route)?
- Die Berechnungen erfordern mehrere Datenbank-Abfragen
- Komplexe Aggregationen (Durchschnitte, Gruppierungen)
- Bessere Performance als viele einzelne Frontend-Abfragen
- Daten bleiben auf dem Server (Sicherheit)

Ablauf:
1. Dashboard laedt -> ruft API-Endpoint auf
2. API berechnet Insights basierend auf Household-Daten
3. Frontend zeigt fertige Insights als Cards an

### Tech-Entscheidungen

**Warum API Route statt Edge Function?**
- Einfacher zu entwickeln und testen
- Kein separates Deployment noetig
- Gleiche Supabase-Anbindung wie restliche App

**Warum keine separate Insights-Tabelle?**
- Daten muessen immer aktuell sein
- Vermeidet Synchronisations-Probleme
- Weniger Komplexitaet

**Warum Browser-Caching?**
- Schnellere wiederholte Seitenaufrufe
- Reduziert Server-Last
- 5 Minuten = guter Kompromiss zwischen Aktualitaet und Performance

**Warum Rotation der Insights?**
- User sieht nicht immer dieselben 3 Insights
- Erhoehtes Engagement
- Einfache Umsetzung: Zufaellige Auswahl aus berechneten Insights

### Dependencies

**Keine neuen Packages erforderlich!**

Alles wird mit vorhandenen Tools umgesetzt:
- Supabase Client (bereits installiert) - fuer Datenbank-Abfragen
- shadcn/ui Components (bereits installiert) - fuer UI
- Next.js API Routes (bereits Teil des Projekts) - fuer Backend-Logik

### Risiken und Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Langsame Berechnung bei vielen Receipts | Limit auf letzte 100 Receipts + Caching |
| Ungenaue Spar-Tipps bei wenig Daten | Mindestens 2 verschiedene Stores pro Produkt erforderlich |
| Verwirrende Insights | Klare, einfache Formulierungen verwenden |

### Abhaengigkeiten zu anderen Features

- PROJ-1 (Database Schema) - Tabellen muessen existieren
- PROJ-6 (Receipt List) - User muss Receipts erfassen koennen
- PROJ-9 (Preis-Tracking) - Optional, verbessert Spar-Tipps

**Hinweis:** Feature funktioniert auch ohne PROJ-9, dann werden Spar-Tipps aus Receipt-Daten berechnet.

---

## Next Steps
1. **User-Review**: Spec durchlesen und approven
2. **Backend Developer**: Insight-Generierung Logik
3. **Frontend Developer**: Insight Cards UI
4. **Danach**: PROJ-11 (PWA Setup)
