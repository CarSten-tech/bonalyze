# PROJ-15: Ausgaben-Seite mit Kategorien & Produkt-Ranking

**Status:** Design Ready
**Priorität:** High
**Erstellt:** 2025-02-03

---

## Zusammenfassung

Eine neue Ausgaben-Seite, die alle Einkäufe nach Kategorien und Subcategories aufschlüsselt. Nutzer können durch Monats-Accordions navigieren und bei Klick auf eine Warengruppe ein detailliertes Produkt-Ranking sehen.

---

## User Stories

### US-1: Ausgaben nach Kategorien sehen
**Als** Haushaltsmitglied
**möchte ich** meine Ausgaben nach Warengruppen aufgeschlüsselt sehen
**damit** ich verstehe, wofür ich mein Geld ausgebe

**Acceptance Criteria:**
- [ ] Monatsweise Übersicht mit expandierbaren Accordions
- [ ] Jeder Monat zeigt Gesamtbetrag und Anzahl Einkäufe
- [ ] Kategorien mit Emoji, Name und Betrag angezeigt
- [ ] Subcategories sind aufklappbar unter Hauptkategorien
- [ ] Beträge in Euro formatiert (deutsche Locale)

### US-2: Nach Zahlungsart filtern
**Als** Haushaltsmitglied
**möchte ich** meine Ausgaben nach Zahlungsart filtern können
**damit** ich sehe, was ich selbst bezahlt habe vs. Auslagen für andere

**Acceptance Criteria:**
- [ ] Filter "Alle" zeigt alle Ausgaben
- [ ] Filter "Eigen" zeigt nur selbst bezahlte Einkäufe
- [ ] Filter "Auslage" zeigt Einkäufe, die für andere bezahlt wurden
- [ ] Filter "Zweck" zeigt Einkäufe mit speziellem Zweck (z.B. Eltern, Geburtstag)
- [ ] Filter-Status bleibt beim Navigieren erhalten

### US-3: Produkt-Ranking pro Kategorie
**Als** Haushaltsmitglied
**möchte ich** sehen, welche Produkte ich am meisten in einer Kategorie kaufe
**damit** ich mein Einkaufsverhalten analysieren kann

**Acceptance Criteria:**
- [ ] Klick auf Subcategory öffnet Produkt-Ranking-Seite
- [ ] Produkte nach Gesamtausgaben sortiert (Rang 1, 2, 3...)
- [ ] Jedes Produkt zeigt: Name, Anzahl Einheiten, Gesamtpreis, Ø-Preis
- [ ] Badge zeigt "Meistgekauft bei [Store]"
- [ ] "Weitere Produkte laden" für Pagination

### US-4: Jahr auswählen
**Als** Haushaltsmitglied
**möchte ich** zwischen Jahren wechseln können
**damit** ich historische Daten vergleichen kann

**Acceptance Criteria:**
- [ ] Dropdown zur Jahr-Auswahl (z.B. 2024, 2023)
- [ ] Nur Jahre mit vorhandenen Daten auswählbar
- [ ] Bei Jahr-Wechsel werden alle Monate des Jahres geladen

---

## Tech-Design (Solution Architect)

### Verwendete UI-Patterns (aus UI-PATTERNS-REFERENCE.md)

| Pattern | Komponente | Verwendung |
|---------|------------|------------|
| App Header | `DashboardLayout` | Logo + Suche + Avatar (existiert) |
| Filter Pills | Neu: `FilterPills` | Alle / Eigen / Auslage / Zweck |
| Dropdown Selector | shadcn `Select` | Jahr-Auswahl |
| Month Accordion | shadcn `Accordion` | Expandierbare Monats-Karten |
| Tabs | shadcn `Tabs` | Übersicht / Einkäufe |
| Category List Items | Neu: `CategoryListItem` | Kategorien mit Subcategories |
| Sub-Page Header | `PageHeader` | Zurück + Titel (existiert) |
| Hero KPI Card | Neu: `SummaryKPICard` | 2-spaltig: Ausgaben + Artikel |
| Product Ranking List | Neu: `ProductRankingItem` | Nummerierte Produktliste |
| Bottom Navigation | `BottomNav` | 5 Tabs (existiert) |

---

### Component-Struktur

#### Screen 1: Ausgaben-Übersicht (`/dashboard/ausgaben`)

```
Ausgaben-Seite
├── Page Title
│   ├── "Ausgaben" (h1)
│   └── "Übersicht aller Einkäufe" (subtitle)
├── Filter Pills
│   ├── [Alle] (default, aktiv)
│   ├── [Eigen]
│   ├── [Auslage]
│   └── [Zweck]
├── Jahr-Selector
│   └── Dropdown: "2024 ▼"
├── Month Accordions (für jeden Monat mit Daten)
│   ├── Accordion Header (klickbar)
│   │   ├── Chevron (▼/▲)
│   │   ├── Monat ("Januar 2024")
│   │   ├── Einkäufe-Count ("25 EINKÄUFE")
│   │   └── Gesamtbetrag ("590,05 €")
│   └── Accordion Content
│       ├── Tabs
│       │   ├── [Übersicht] ← default
│       │   └── [Einkäufe (25)]
│       └── Tab Content
│           ├── Übersicht-Tab:
│           │   └── Category Accordion List
│           │       ├── Hauptkategorie (expandable)
│           │       │   ├── Header: Emoji + Name + Betrag
│           │       │   └── Content: Subcategories
│           │       │       └── Subcategory Row (klickbar → Ranking)
│           │       │           ├── Name + Betrag
│           │       │           └── Chevron →
│           │       └── ...weitere Kategorien
│           └── Einkäufe-Tab:
│               └── Receipt List (existiert)
└── Bottom Navigation
```

#### Screen 2: Produkt-Ranking (`/dashboard/ausgaben/kategorie/[slug]`)

```
Produkt-Ranking-Seite
├── Page Header
│   ├── Back Button (←)
│   ├── Titel: "Produkt-Ranking"
│   ├── Sort Button (optional)
│   └── Avatar
├── Kategorie-Header
│   ├── Emoji + Name ("🥛 Milchprodukte")
│   └── Subtitle ("Top Produkte & Marktvergleich 2024")
├── Summary KPI Card (2-spaltig)
│   ├── Links: Gesamtausgaben
│   │   ├── Label: "GESAMTAUSGABEN"
│   │   ├── Betrag: "83,28 €"
│   │   └── Trend: "↑ +4% vs. Vormonat"
│   └── Rechts: Produkte
│       ├── Label: "PRODUKTE"
│       └── Anzahl: "24 Artikel"
├── Content Card
│   ├── Tabs Header
│   │   ├── [PRODUKT & BELIEBTHEIT] ← aktiv
│   │   └── [AUSGABEN]
│   └── Product Ranking List
│       └── Ranking Item (pro Produkt)
│           ├── Rang (1, 2, 3... in Circle)
│           ├── Produkt-Info
│           │   ├── Name ("Frische Vollmilch 3,5%")
│           │   ├── Menge ("12 Einheiten gekauft")
│           │   └── Store Badge ("MEISTGEKAUFT BEI EDEKA")
│           └── Preis-Info (rechts)
│               ├── Gesamtpreis ("18,48 €")
│               └── Ø-Preis ("Ø 1,54 €/L")
├── Load More Button
│   └── "Weitere Produkte laden ▼"
└── Bottom Navigation
```

---

### Daten-Model

#### Neue Tabelle: `categories`

```
categories
├── id (UUID, Primary Key)
├── name (Text, z.B. "Milchprodukte")
├── slug (Text, z.B. "milchprodukte")
├── parent_id (UUID, nullable → für Hauptkategorien NULL)
├── emoji (Text, z.B. "🥛")
├── sort_order (Integer, für Sortierung)
├── created_at (Timestamp)
└── updated_at (Timestamp)

Beispiel-Daten:
┌─────────────────────────────────────────────────────────────┐
│ Lebensmittel (parent: NULL, emoji: 🍎)                      │
│   ├── Milchprodukte (parent: Lebensmittel, emoji: 🥛)      │
│   ├── Süßigkeiten (parent: Lebensmittel, emoji: 🍬)        │
│   ├── Fleisch (parent: Lebensmittel, emoji: 🥩)            │
│   ├── Brot/Backwaren (parent: Lebensmittel, emoji: 🥖)     │
│   └── Obst (parent: Lebensmittel, emoji: 🍇)               │
├── Haushalt (parent: NULL, emoji: 🏠)                        │
│   ├── Küche (parent: Haushalt)                              │
│   ├── Bad (parent: Haushalt)                                │
│   └── Schreibwaren (parent: Haushalt)                       │
└── Freizeit (parent: NULL, emoji: 🎬)                        │
```

#### Erweiterung: `receipts` Tabelle

Neue Felder:
```
receipts (erweitert)
├── ... (bestehende Felder)
├── payment_type (Text: 'eigen' | 'auslage')
└── purpose (Text, nullable: z.B. "Eltern", "Geburtstag", "Arbeit")
```

#### Erweiterung: `products` Tabelle

```
products (erweitert)
├── ... (bestehende Felder)
├── category_id (UUID → categories.id)  ← ersetzt category (Text)
```

---

### Daten-Aggregationen (was berechnet wird)

**Für Ausgaben-Übersicht:**
```
Pro Monat:
├── Gesamtbetrag (SUM receipt_items.price_cents)
├── Anzahl Einkäufe (COUNT receipts)
└── Pro Kategorie:
    ├── Kategorie-Summe
    └── Pro Subcategory:
        └── Subcategory-Summe
```

**Für Produkt-Ranking:**
```
Pro Produkt in Subcategory:
├── Rang (nach Gesamtausgaben)
├── Anzahl Einheiten (SUM receipt_items.quantity)
├── Gesamtausgaben (SUM receipt_items.price_cents)
├── Ø-Preis pro Einheit (Gesamtausgaben / Anzahl Einheiten)
└── Top-Store (MODE von receipts.merchant_id)
```

---

### Tech-Entscheidungen

| Entscheidung | Wahl | Begründung |
|--------------|------|------------|
| Kategorien-System | Neue `categories` Tabelle | Flexibel, Admin-verwaltbar, hierarchisch |
| Filter State | URL Query Params | Shareable, Browser-Back funktioniert |
| Pagination | Cursor-based | Performance bei vielen Produkten |
| Aggregation | Supabase RPC / View | Performance-optimiert auf DB-Ebene |

---

### Neue Routes

| Route | Beschreibung |
|-------|--------------|
| `/dashboard/ausgaben` | Ausgaben-Übersicht |
| `/dashboard/ausgaben/kategorie/[slug]` | Produkt-Ranking für Subcategory |

---

### API Endpoints (Backend Developer)

**1. GET Ausgaben pro Monat mit Kategorien**
```
Input: household_id, year, payment_type?, purpose?
Output: Array von Monaten mit Kategorie-Breakdown
```

**2. GET Produkt-Ranking für Subcategory**
```
Input: household_id, category_slug, year, limit, cursor
Output: Array von Produkten mit Ranking-Daten
```

---

### Dependencies

**Keine neuen Packages nötig!**

Bereits vorhanden:
- `shadcn/ui` (Accordion, Tabs, Select, Card)
- `date-fns` + `date-fns/locale/de`
- `lucide-react`

---

### Migration Tasks (Backend Developer)

1. **Neue `categories` Tabelle erstellen**
   - Mit hierarchischer Struktur (parent_id)
   - Mit Emoji-Feld
   - Mit RLS Policies

2. **Seed-Daten für Kategorien**
   - Standard-Kategorien einfügen (Lebensmittel, Haushalt, etc.)
   - Mit Subcategories

3. **`receipts` Tabelle erweitern**
   - `payment_type` Feld hinzufügen (default: 'eigen')
   - `purpose` Feld hinzufügen (nullable)

4. **`products` Tabelle migrieren**
   - `category_id` Feld hinzufügen
   - Bestehende `category` Text-Werte zu IDs migrieren
   - Altes `category` Feld entfernen (oder deprecated)

5. **Aggregations-Views oder RPCs erstellen**
   - Für Kategorie-Summen pro Monat
   - Für Produkt-Rankings

---

### Komponenten für Frontend Developer

| Komponente | Beschreibung | Datei |
|------------|--------------|-------|
| `ExpensesPage` | Hauptseite Ausgaben | `app/dashboard/ausgaben/page.tsx` |
| `FilterPills` | Zahlungsart-Filter | `components/ausgaben/filter-pills.tsx` |
| `YearSelector` | Jahr-Dropdown | `components/ausgaben/year-selector.tsx` |
| `MonthAccordion` | Monats-Accordion | `components/ausgaben/month-accordion.tsx` |
| `CategoryList` | Kategorie-Liste mit Subcategories | `components/ausgaben/category-list.tsx` |
| `CategoryItem` | Einzelne Kategorie (expandable) | `components/ausgaben/category-item.tsx` |
| `ProductRankingPage` | Ranking-Seite | `app/dashboard/ausgaben/kategorie/[slug]/page.tsx` |
| `SummaryKPICard` | 2-spaltige KPI Card | `components/ausgaben/summary-kpi-card.tsx` |
| `ProductRankingList` | Ranking-Liste | `components/ausgaben/product-ranking-list.tsx` |
| `ProductRankingItem` | Einzelnes Ranking-Item | `components/ausgaben/product-ranking-item.tsx` |

---

## Wireframes (ASCII)

### Ausgaben-Seite

```
┌─────────────────────────────────────────────────────────────┐
│  [B] Bonalyze                              [🔍]  [Avatar]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Ausgaben                                                   │
│  Übersicht aller Einkäufe                                   │
│                                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │  Alle  │ │ Eigen  │ │Auslage │ │ Zweck  │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
│                                                             │
│  ┌──────────────┐                                          │
│  │  2024     ▼  │                                          │
│  └──────────────┘                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ▼  Januar 2024                          590,05 €   │   │
│  │     25 EINKÄUFE                                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  [Übersicht]        [Einkäufe (25)]                 │   │
│  │  ───────────                                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  🍎 Lebensmittel                         542,06 €   │   │
│  │     ├── Milchprodukte                     83,28 € → │   │
│  │     ├── Süßigkeiten                       82,56 € → │   │
│  │     ├── Fleisch                           59,75 € → │   │
│  │     └── ...                                         │   │
│  │                                                     │   │
│  │  🏠 Haushalt                              33,38 €   │   │
│  │     ├── Küche                             16,84 € → │   │
│  │     └── ...                                         │   │
│  │                                                     │   │
│  │  🎬 Freizeit                              18,08 €   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ▶  Februar 2024                            423,12 €       │
│     18 EINKÄUFE                                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│   🏠      📋      [📷]      📊      ☰                      │
│  HOME   AUSGABEN          ANALYSE   MENÜ                   │
└─────────────────────────────────────────────────────────────┘
```

### Produkt-Ranking-Seite

```
┌─────────────────────────────────────────────────────────────┐
│  ←  Produkt-Ranking                        [≡]   [Avatar]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🥛 Milchprodukte                                          │
│  Top Produkte & Marktvergleich 2024                        │
│                                                             │
│  ┌─────────────────────────┬───────────────────────────┐   │
│  │  GESAMTAUSGABEN         │  PRODUKTE                 │   │
│  │  83,28 €                │  24 Artikel               │   │
│  │  ↑ +4% vs. Vormonat     │                           │   │
│  └─────────────────────────┴───────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PRODUKT & BELIEBTHEIT              AUSGABEN        │   │
│  │  ─────────────────────                              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ┌───┐                                              │   │
│  │  │ 1 │  Frische Vollmilch 3,5%          18,48 €    │   │
│  │  └───┘  12 Einheiten gekauft            Ø 1,54€/L  │   │
│  │         ┌─────────────────────────┐                │   │
│  │         │ 🏪 MEISTGEKAUFT BEI EDEKA│                │   │
│  │         └─────────────────────────┘                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ┌───┐                                              │   │
│  │  │ 2 │  Speisequark Magerstufe          11,92 €    │   │
│  │  └───┘  8 Einheiten gekauft          Ø 1,49€/Stk   │   │
│  │         ┌─────────────────────────┐                │   │
│  │         │ 🏪 MEISTGEKAUFT BEI REWE │                │   │
│  │         └─────────────────────────┘                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ... weitere Produkte ...                           │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │           Weitere Produkte laden  ▼                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│   🏠      📋      [📷]      📊      ☰                      │
│  HOME   AUSGABEN          ANALYSE   MENÜ                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Offene Fragen

- [x] Kategorien-System: Neue Tabelle → **Bestätigt**
- [x] Filter-Bedeutung: Eigen/Auslage/Zweck → **Geklärt**
- [ ] Soll "Zweck" ein Freitext-Feld oder vordefinierte Werte sein?
- [ ] Soll es einen "Alle Jahre"-View geben oder nur einzelne Jahre?

---

## Nächste Schritte

1. **Backend Developer:** Migration für `categories` Tabelle + Seed-Daten
2. **Backend Developer:** `receipts` erweitern (payment_type, purpose)
3. **Backend Developer:** Aggregations-RPCs erstellen
4. **Frontend Developer:** UI-Komponenten implementieren

---

## Handoff

Nach User-Approval:

```
Lies .claude/agents/backend-dev.md und implementiere die Migrations für /features/PROJ-15-ausgaben-kategorien.md
```

Dann:

```
Lies .claude/agents/frontend-dev.md und implementiere /features/PROJ-15-ausgaben-kategorien.md
```
