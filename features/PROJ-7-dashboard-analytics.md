# PROJ-7: Dashboard & Analytics

## Status: 🔵 Planned

## Übersicht
Das Dashboard zeigt Ausgaben-Übersichten, Trends und Kategorie-Verteilungen. Zentrale Anlaufstelle für User um ihre Haushaltsausgaben zu verstehen.

## Abhängigkeiten
- Benötigt: PROJ-1 (Database Schema) - für Daten
- Benötigt: PROJ-6 (Receipt List) - für Drill-Down zu Receipts

## User Stories

### US-1: Ausgaben-Übersicht
- Als **User** möchte ich **meine Gesamtausgaben diesen Monat sehen**, um **mein Spending zu verstehen**
- Als **User** möchte ich **den Vergleich zum Vormonat sehen**, um **Trends zu erkennen**

### US-2: Kategorie-Verteilung
- Als **User** möchte ich **sehen wieviel ich pro Kategorie ausgebe** (Lebensmittel, Haushalt, etc.), um **große Posten zu identifizieren**

### US-3: Store-Analyse
- Als **User** möchte ich **sehen bei welchen Stores ich am meisten ausgebe**, um **mein Einkaufsverhalten zu verstehen**

### US-4: Zeitraum wählen (ERWEITERT)
- Als **User** möchte ich **verschiedene Zeiträume analysieren** (Woche, Monat, Quartal, Jahr), um **flexibel zu sein**
- Als **User** möchte ich **Rolling Periods wählen** (letzte 30/60/90 Tage), um **aktuelle Trends zu sehen**
- Als **User** möchte ich **einen Custom-Zeitraum mit Datepicker wählen**, um **spezifische Zeiträume zu analysieren**
- Als **User** möchte ich **Vergleiche zur Vorperiode sehen**, um **Veränderungen zu verstehen**

### US-5: Quick Actions
- Als **User** möchte ich **vom Dashboard schnell einen Scan starten**, um **effizienter zu sein**

## Acceptance Criteria

### AC-1: Haupt-KPI
- [ ] "Ausgaben diesen Monat" prominent angezeigt
- [ ] Vergleich zum Vormonat (% Änderung, ↑/↓ Indikator)
- [ ] Anzahl der Einkäufe diesen Monat

### AC-2: Kategorie-Chart
- [ ] Pie/Donut Chart mit Top-Kategorien
- [ ] Legende mit Beträgen
- [ ] Tap auf Kategorie → Filter auf Receipt-Liste
- [ ] "Sonstiges" für kleine Kategorien

### AC-3: Store-Ranking
- [ ] Top 5 Stores nach Ausgaben
- [ ] Bar Chart oder Liste
- [ ] Store-Name + Betrag + Anzahl Besuche
- [ ] Tap → Filter auf Receipt-Liste

### AC-4: Zeitraum-Auswahl (ERWEITERT)
- [ ] **Preset Tabs**: "Woche", "Monat", "Quartal", "Jahr"
- [ ] **Rolling Periods**: "Letzte 30 Tage", "Letzte 60 Tage", "Letzte 90 Tage"
- [ ] **Custom Range**: Datepicker mit "Von" und "Bis" Feld
- [ ] Alle Daten aktualisieren bei Wechsel (< 500ms)
- [ ] Default: "Dieser Monat"
- [ ] URL-Parameter für Zeitraum (deep-linkable: `/dashboard?period=month`)
- [ ] "Custom" Pill wird aktiv wenn Datepicker genutzt wird

### AC-4a: Vorperioden-Vergleich (NEU)
- [ ] Jede KPI zeigt Vergleich zur Vorperiode
- [ ] "Diese Woche" → vs. letzte Woche
- [ ] "Dieser Monat" → vs. letzter Monat
- [ ] "Dieses Quartal" → vs. letztes Quartal
- [ ] "Dieses Jahr" → vs. letztes Jahr
- [ ] "Letzte 30 Tage" → vs. die 30 Tage davor
- [ ] "Custom Range" → vs. gleicher Zeitraum davor (automatisch berechnet)
- [ ] Anzeige: "+12% vs. Vorperiode" oder "-5% vs. Vorperiode"

### AC-5: Trend-Indikator
- [ ] "↑12% vs. Vormonat" oder "↓5% vs. Vormonat"
- [ ] Grün für weniger Ausgaben, Rot für mehr (optional: neutral)

### AC-6: Empty State
- [ ] "Noch keine Daten für diesen Zeitraum"
- [ ] CTA: "Ersten Kassenbon scannen"

### AC-7: Performance
- [ ] Dashboard lädt < 500ms
- [ ] Aggregationen server-side (nicht client-side)
- [ ] Caching für häufige Queries (optional)

## Edge Cases

### EC-1: Neuer User ohne Daten
- **Was passiert, wenn** keine Receipts existieren?
- **Lösung**: Freundlicher Empty State mit Onboarding-Hinweis

### EC-2: Nur Receipts von einem Store
- **Was passiert, wenn** alle Einkäufe bei einem Store?
- **Lösung**: Normal anzeigen (100% bei einem Store)

### EC-3: Fehlende Kategorien
- **Was passiert, wenn** Produkte keine Kategorie haben?
- **Lösung**: "Sonstiges" oder "Nicht kategorisiert"

### EC-4: Zeitraum ohne Daten
- **Was passiert, wenn** gewählter Zeitraum leer ist?
- **Lösung**: "Keine Ausgaben in diesem Zeitraum"

## UI/UX Spezifikation

### Dashboard Screen
```
┌─────────────────────────────┐
│  🏠 Familie Müller  ▼       │
├─────────────────────────────┤
│                             │
│  [Woche][Monat*][Quartal][Jahr][Custom]│
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │     €847,32           │  │
│  │     ──────────        │  │
│  │     Ausgaben im       │  │
│  │     Januar 2025       │  │
│  │                       │  │
│  │     ↑12% vs. Dez      │  │
│  │     23 Einkäufe       │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  ─── Nach Kategorie ──────  │
│                             │
│  ┌───────────────────────┐  │
│  │      [DONUT CHART]    │  │
│  │                       │  │
│  │  🥦 Lebensmittel 62%  │  │
│  │  🧴 Haushalt     22%  │  │
│  │  🍷 Getränke     12%  │  │
│  │  📦 Sonstiges     4%  │  │
│  └───────────────────────┘  │
│                             │
│  ─── Top Stores ──────────  │
│                             │
│  ┌───────────────────────┐  │
│  │ 1. REWE      €412  →  │  │
│  │    14 Einkäufe        │  │
│  ├───────────────────────┤  │
│  │ 2. LIDL      €298  →  │  │
│  │    8 Einkäufe         │  │
│  ├───────────────────────┤  │
│  │ 3. ALDI      €137  →  │  │
│  │    5 Einkäufe         │  │
│  └───────────────────────┘  │
│                             │
│  [  Alle Kassenbons →  ]    │
│                             │
└─────────────────────────────┘

     [+] FAB: Neuer Scan
```

### Custom Range Picker (NEU)
```
┌─────────────────────────────┐
│  Zeitraum wählen        ×   │
├─────────────────────────────┤
│                             │
│  [Letzte 30 Tage]           │
│  [Letzte 60 Tage]           │
│  [Letzte 90 Tage]           │
│                             │
│  ─── Custom ─────────────── │
│                             │
│  Von: [📅 01.01.2025    ]   │
│  Bis: [📅 31.01.2025    ]   │
│                             │
│  [    Anwenden    ]         │
│                             │
└─────────────────────────────┘
```

## Implementation Notes

### Analytics Query (ERWEITERT)
```typescript
// Flexible Zeitraum-Abfrage
const { data } = await supabase.rpc('get_dashboard_summary', {
  p_household_id: householdId,
  p_start_date: '2025-01-01',  // ISO Date
  p_end_date: '2025-01-31',    // ISO Date
  p_include_comparison: true   // Vorperiode automatisch berechnen
})

// Returns:
// {
//   period: {
//     start: "2025-01-01",
//     end: "2025-01-31",
//     label: "Januar 2025"
//   },
//   current: {
//     total_spent: 84732,        // cents
//     receipt_count: 23,
//     categories: [...],
//     top_merchants: [...]
//   },
//   comparison: {                 // Vorperiode (wenn angefragt)
//     period: {
//       start: "2024-12-01",
//       end: "2024-12-31",
//       label: "Dezember 2024"
//     },
//     total_spent: 75621,
//     receipt_count: 19,
//     percentage_change: 12.05    // +12% vs. Vorperiode
//   }
// }
```

### Preset Period Helper (Client-side)
```typescript
type PeriodPreset =
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_30_days'
  | 'last_60_days'
  | 'last_90_days'
  | 'custom'

function getDateRange(preset: PeriodPreset, customRange?: { start: Date, end: Date }) {
  // Returns { start: Date, end: Date } für API-Call
}
```

### Supabase Function
```sql
CREATE OR REPLACE FUNCTION get_monthly_summary(
  p_household_id UUID,
  p_year INT,
  p_month INT
) RETURNS JSONB AS $$
  -- Implementation
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Checklist vor Abschluss

- [x] **User Stories komplett**: 5 User Stories definiert (US-4 erweitert)
- [x] **Acceptance Criteria konkret**: 8 Kategorien (AC-4 erweitert, AC-4a neu)
- [x] **Edge Cases identifiziert**: 4 Edge Cases
- [x] **Feature-ID vergeben**: PROJ-7
- [x] **Status gesetzt**: 🔵 Planned
- [x] **User Review**: Approved (02.02.2025)

## Changelog

### v1.1 (02.02.2025)
- ✅ **ERWEITERT**: US-4 um Rolling Periods (30/60/90 Tage) und Custom Range
- ✅ **ERWEITERT**: AC-4 um Jahr, Rolling Periods, Custom Datepicker, URL-Parameter
- ✅ **NEU**: AC-4a Vorperioden-Vergleich (automatisch basierend auf gewähltem Zeitraum)
- ✅ **NEU**: UI Mockup für Custom Range Picker
- ✅ **NEU**: Erweiterte API mit `p_start_date`, `p_end_date`, `p_include_comparison`
- ✅ **NEU**: PeriodPreset Type Definition für Client-side Helper

## Tech-Design (Solution Architect)

### Component-Struktur

```
Dashboard Seite
├── Header-Bereich
│   ├── Haushalt-Auswahl (Dropdown "Familie Mueller")
│   └── Zeitraum-Tabs ("Woche" | "Monat" | "Quartal")
│
├── Haupt-KPI Karte (prominent, zentriert)
│   ├── Gesamt-Ausgaben (gross, z.B. "847,32 EUR")
│   ├── Zeitraum-Label ("Ausgaben im Januar 2025")
│   ├── Trend-Indikator ("12% mehr als Dezember" mit Pfeil)
│   └── Anzahl Einkaeufe ("23 Einkaeufe")
│
├── Kategorie-Bereich
│   ├── Ueberschrift ("Nach Kategorie")
│   ├── Donut-Chart (interaktiv, klickbar)
│   └── Legende mit Betraegen
│       ├── Lebensmittel - 62% - 525,34 EUR
│       ├── Haushalt - 22% - 186,41 EUR
│       ├── Getraenke - 12% - 101,68 EUR
│       └── Sonstiges - 4% - 33,89 EUR
│
├── Store-Ranking Bereich
│   ├── Ueberschrift ("Top Stores")
│   └── Store-Liste (Top 5)
│       ├── Platz 1: REWE - 412 EUR - 14 Einkaeufe (klickbar)
│       ├── Platz 2: LIDL - 298 EUR - 8 Einkaeufe (klickbar)
│       └── ... weitere Stores
│
├── Quick-Action Button
│   └── "Alle Kassenbons" Link (fuehrt zu Receipt-Liste)
│
├── Empty State (falls keine Daten)
│   ├── Illustration/Icon
│   ├── Text: "Noch keine Daten fuer diesen Zeitraum"
│   └── CTA Button: "Ersten Kassenbon scannen"
│
└── Floating Action Button (FAB)
    └── "+" fuer neuen Scan
```

### Daten-Model

**Welche Daten werden verwendet (bereits vorhanden in Supabase):**

| Information | Quelle | Beschreibung |
|-------------|--------|--------------|
| Kassenbons | `receipts` Tabelle | Datum, Gesamtbetrag, Haushalt-Zuordnung |
| Stores | `merchants` Tabelle | Store-Namen (REWE, LIDL, etc.) |
| Produkte | `receipt_items` Tabelle | Einzelne Artikel pro Kassenbon |
| Kategorien | `products.category` Feld | Lebensmittel, Haushalt, Getraenke, etc. |

**Berechnete Werte (werden vom Server aggregiert):**

| KPI | Berechnung |
|-----|------------|
| Gesamt-Ausgaben | Summe aller `receipts.total_amount_cents` im Zeitraum |
| Vormonats-Vergleich | Prozentuale Aenderung zum Vorperiode |
| Anzahl Einkaeufe | Anzahl der Kassenbons im Zeitraum |
| Kategorie-Verteilung | Gruppierung nach `products.category`, Summe der Betraege |
| Store-Ranking | Gruppierung nach `merchant_id`, Summe + Anzahl Besuche |

**Wichtig:** Alle Aggregationen passieren auf dem Server (Supabase), nicht im Browser. Das ist schneller und spart Datenvolumen.

### Backend-Anforderungen

Bevor das Dashboard gebaut werden kann, braucht es eine **Supabase Database Function** (wird vom Backend Developer erstellt):

| Funktion | Zweck |
|----------|-------|
| `get_dashboard_summary` | Liefert alle Dashboard-Daten auf einmal |

Diese Funktion erhaelt:
- Welcher Haushalt (household_id)
- Welcher Zeitraum (Woche/Monat/Quartal)

Und liefert zurueck:
- Gesamt-Ausgaben + Vergleich zur Vorperiode
- Anzahl Einkaeufe
- Kategorie-Aufschluesselung (Name, Betrag, Prozent)
- Top 5 Stores (Name, Betrag, Anzahl Besuche)

### Tech-Entscheidungen

| Entscheidung | Begruendung |
|--------------|-------------|
| **Recharts fuer Charts** | Moderne React-Chart-Bibliothek, einfach zu verwenden, gute Animationen, responsive. Alternativen wie Chart.js sind aelter und weniger React-nativ. |
| **Supabase RPC fuer Aggregationen** | Berechnungen auf dem Server sind 10x schneller als im Browser. User muss nicht alle Rohdaten herunterladen. |
| **shadcn/ui Tabs Komponente** | Bereits im Projekt vorhanden, konsistentes Design fuer Zeitraum-Auswahl. |
| **shadcn/ui Card Komponente** | Bereits vorhanden, fuer KPI-Karte und Sektionen. |
| **Cents statt Euros in DB** | Vermeidet Rundungsfehler bei Geldbetraegen. Formatierung zu Euros passiert nur in der Anzeige. |
| **Server-Side Caching (optional)** | Fuer haeufige Queries kann Supabase die Ergebnisse zwischenspeichern - macht Dashboard noch schneller. |

### Dependencies

**Neue Packages (muessen installiert werden):**

| Package | Zweck |
|---------|-------|
| `recharts` | Charts (Donut-Chart, Bar-Chart) |

**Bereits vorhandene Packages (werden wiederverwendet):**

| Package | Verwendung |
|---------|------------|
| `@supabase/supabase-js` | Datenbankabfragen |
| shadcn/ui `Card` | KPI-Karte, Sektionen |
| shadcn/ui `Tabs` | Zeitraum-Auswahl |
| shadcn/ui `Skeleton` | Lade-Zustand |
| shadcn/ui `Button` | CTAs, FAB |

### Wiederverwendbare Komponenten

Folgende shadcn/ui Komponenten sind bereits im Projekt und werden genutzt:
- `card.tsx` - fuer alle Karten-Layouts
- `tabs.tsx` - fuer Zeitraum-Umschaltung
- `skeleton.tsx` - fuer Lade-Animationen
- `button.tsx` - fuer Aktions-Buttons

### Performance-Ueberlegungen

| Anforderung | Loesung |
|-------------|---------|
| Dashboard < 500ms laden | Server-side Aggregation via Supabase RPC |
| Smooth Animationen | Recharts mit React-Transitions |
| Keine unnoetige Daten | Nur aggregierte Werte werden geladen, nicht alle Receipts |

### Abhaengigkeiten zu anderen Features

| Feature | Beziehung |
|---------|-----------|
| PROJ-1 (Database Schema) | Nutzt existierende Tabellen (receipts, merchants, products) |
| PROJ-6 (Receipt List) | Drill-Down: Klick auf Kategorie/Store oeffnet gefilterte Receipt-Liste |

---

## Next Steps
1. **User-Review**: Spec durchlesen und approven
2. **Backend Developer**: Analytics RPC Functions
3. **Frontend Developer**: Dashboard UI + Charts
4. **Danach**: PROJ-8 (Settlement)
