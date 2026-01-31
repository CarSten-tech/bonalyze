# PROJ-9: Preis-Tracking

## Status: 🔵 Planned

## Übersicht
Verfolgt Produktpreise über Zeit. Zeigt Preisverlauf, günstigsten Store und Preis-Alerts (Future). Ermöglicht smartes Einkaufen.

## Abhängigkeiten
- Benötigt: PROJ-1 (Database Schema) - für `products`, `receipt_items`
- Benötigt: PROJ-6 (Receipt List) - für Datenbasis

## User Stories

### US-1: Preisverlauf sehen
- Als **User** möchte ich **den Preisverlauf eines Produkts sehen**, um **Preisänderungen zu erkennen**

### US-2: Günstigsten Store finden
- Als **User** möchte ich **sehen wo ein Produkt am günstigsten ist**, um **beim nächsten Einkauf zu sparen**

### US-3: Produkt-Suche
- Als **User** möchte ich **nach Produkten suchen**, um **deren Preise zu vergleichen**

### US-4: Letzte Käufe
- Als **User** möchte ich **sehen wann ich ein Produkt zuletzt gekauft habe**, um **Nachkäufe zu planen**

## Acceptance Criteria

### AC-1: Preis-Detail-Ansicht
- [ ] Produktname + Kategorie
- [ ] Aktueller Durchschnittspreis
- [ ] Günstigster/Teuerster Preis
- [ ] Preisverlauf als Line Chart (letzte 6 Monate)
- [ ] Preise pro Store

### AC-2: Store-Vergleich
- [ ] Liste aller Stores wo gekauft
- [ ] Letzter Preis pro Store
- [ ] Durchschnittspreis pro Store
- [ ] "Günstigster Store" Badge

### AC-3: Produkt-Suche
- [ ] Suchfeld mit Autocomplete
- [ ] Suche in gekauften Produkten
- [ ] Recent Searches
- [ ] Kategorie-Filter optional

### AC-4: Letzte Käufe
- [ ] "Zuletzt gekauft: 28. Jan bei REWE"
- [ ] Link zum Receipt

### AC-5: Performance
- [ ] Preis-Historie effizient speichern (Aggregation)
- [ ] Chart-Rendering < 200ms

## Edge Cases

### EC-1: Produkt nur einmal gekauft
- **Was passiert, wenn** Produkt nur 1x in Daten existiert?
- **Lösung**: Kein Chart, nur aktueller Preis anzeigen

### EC-2: Gleiches Produkt, unterschiedliche Namen
- **Was passiert, wenn** "Bio Milch" und "Bio-Milch" als verschieden erkannt werden?
- **Lösung (MVP)**: Separat behandeln
- **Future**: Produkt-Matching/Merge

### EC-3: Starke Preisschwankungen
- **Was passiert, wenn** Preis von €1 auf €10 springt (Eingabefehler)?
- **Lösung**: Outlier-Erkennung optional, aber Daten bleiben

## UI/UX Spezifikation

### Preis-Detail Screen
```
┌─────────────────────────────┐
│  ← Hafermilch Oatly 1L      │
├─────────────────────────────┤
│                             │
│  Kategorie: Getränke        │
│                             │
│  ┌───────────────────────┐  │
│  │  Durchschnitt: €2.18  │  │
│  │  Günstigster:  €1.99  │  │
│  │  Teuerster:    €2.49  │  │
│  └───────────────────────┘  │
│                             │
│  ─── Preisverlauf ────────  │
│                             │
│  ┌───────────────────────┐  │
│  │  €2.50 ─────┐         │  │
│  │             └──┐      │  │
│  │  €2.00         └───── │  │
│  │  Okt Nov Dez Jan Feb  │  │
│  └───────────────────────┘  │
│                             │
│  ─── Preise pro Store ────  │
│                             │
│  ┌───────────────────────┐  │
│  │ ⭐ LIDL        €1.99  │  │
│  │    Günstigster!       │  │
│  ├───────────────────────┤  │
│  │ REWE           €2.29  │  │
│  │ Zuletzt: 28.01.25     │  │
│  ├───────────────────────┤  │
│  │ EDEKA          €2.49  │  │
│  └───────────────────────┘  │
│                             │
│  ─────────────────────────  │
│  Zuletzt gekauft: 28.01.25  │
│  bei REWE (€2.29)           │
│                             │
└─────────────────────────────┘
```

## Implementation Notes

### Price History View
```sql
-- Preis-Aggregation für Chart
SELECT
  DATE_TRUNC('week', r.date) as period,
  AVG(ri.price / ri.quantity) as avg_price,
  MIN(ri.price / ri.quantity) as min_price,
  MAX(ri.price / ri.quantity) as max_price
FROM receipt_items ri
JOIN receipts r ON ri.receipt_id = r.id
WHERE ri.product_id = $1
  AND r.household_id = $2
  AND r.date >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('week', r.date)
ORDER BY period;
```

## Checklist vor Abschluss

- [x] **User Stories komplett**: 4 User Stories definiert
- [x] **Acceptance Criteria konkret**: 5 Kategorien
- [x] **Edge Cases identifiziert**: 3 Edge Cases
- [x] **Feature-ID vergeben**: PROJ-9
- [x] **Status gesetzt**: 🔵 Planned
- [ ] **User Review**: Warte auf User-Approval

## Tech-Design (Solution Architect)

### Bestehende Architektur (Wiederverwendung)

**Bereits vorhanden und nutzbar:**
- Supabase-Datenbank mit Tabellen: `products`, `receipt_items`, `receipts`, `merchants`
- Supabase Client Setup (Browser + Server)
- UI-Komponenten: Card, Badge, Input, Button, Skeleton, Table, Tabs
- Preis-Daten bereits in `receipt_items` (price_cents, quantity)
- Store-Daten in `merchants` (name, logo_url)

### Component-Struktur

```
Preis-Tracking Feature
│
├── Produkt-Suche Seite (/prices)
│   ├── Suchfeld mit Autocomplete
│   │   └── Produkt-Vorschlaege (aus gekauften Produkten)
│   ├── Recent Searches (letzte 5 Suchen)
│   └── Kategorie-Filter (optional)
│
└── Preis-Detail Seite (/prices/[product-id])
    ├── Zurueck-Navigation
    ├── Produkt-Header
    │   ├── Produktname
    │   └── Kategorie-Badge
    ├── Preis-Statistik Karte
    │   ├── Durchschnittspreis
    │   ├── Guenstigster Preis
    │   └── Teuerster Preis
    ├── Preisverlauf-Chart (Liniengrafik)
    │   └── X-Achse: Monate | Y-Achse: Preis
    ├── Store-Vergleich Liste
    │   ├── Store-Karte (pro Store)
    │   │   ├── Store-Name + Logo
    │   │   ├── Letzter/Durchschnittspreis
    │   │   └── "Guenstigster" Badge (falls zutreffend)
    │   └── [weitere Stores...]
    └── Letzter Kauf Info
        ├── Datum + Store
        └── Link zum Kassenbon
```

### Daten-Model (einfach beschrieben)

**Keine neuen Tabellen noetig!** Alle Daten existieren bereits:

```
Preis-Informationen werden berechnet aus:

Produkte (products):
- Name, Kategorie, Einheit

Kassenbon-Positionen (receipt_items):
- Preis (in Cent), Menge
- Verknuepfung zu Produkt + Kassenbon

Kassenbons (receipts):
- Datum, Store (merchant)

Stores (merchants):
- Name, Logo

Die Preis-Historie wird "on-the-fly" berechnet:
- Durchschnitt, Min, Max werden bei Abruf berechnet
- Gruppierung nach Woche/Monat fuer Chart
- Keine separate Speicherung noetig (MVP)
```

**Lokale Speicherung (Browser):**
- Recent Searches: Letzte 5 Suchbegriffe im Browser-Speicher

### Tech-Entscheidungen

| Entscheidung | Begruendung |
|--------------|-------------|
| **Recharts fuer Charts** | Beliebteste React-Chart-Library, einfach zu nutzen, responsive, gut dokumentiert |
| **Keine neue Datenbank-Tabelle** | Preis-Daten existieren bereits in receipt_items - spart Komplexitaet |
| **On-the-fly Berechnung** | Fuer MVP ausreichend performant, spaeter optional Caching |
| **localStorage fuer Recent Searches** | Einfach, kein Server-Roundtrip, persoenlich pro Geraet |
| **Supabase Abfragen im Frontend** | Bestehende Client-Infrastruktur nutzen, RLS schuetzt Daten |

### Seiten-Struktur

```
/prices                    → Produkt-Suche (Einstiegsseite)
/prices/[productId]        → Preis-Detail fuer ein Produkt
```

### Dependencies

**Neue Packages:**
- `recharts` - Interaktive Charts fuer Preisverlauf

**Bereits vorhanden (keine Installation noetig):**
- `@supabase/ssr` - Datenbank-Zugriff
- Alle shadcn/ui Komponenten

### Aufwand-Schaetzung

| Bereich | Geschaetzter Aufwand |
|---------|---------------------|
| Produkt-Suche Seite | ~4 Stunden |
| Preis-Detail Seite | ~6 Stunden |
| Chart-Integration | ~3 Stunden |
| Store-Vergleich | ~2 Stunden |
| **Gesamt** | **~15 Stunden** |

### Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Performance bei vielen Datenpunkten | Mittel | Aggregation auf Wochen-Ebene, Limit auf 6 Monate |
| Produkt-Matching (gleiche Produkte, andere Namen) | Hoch | MVP: Ignorieren, Future: Merge-Feature |
| Chart auf Mobile zu klein | Niedrig | Responsive Design, Zoom-Geste |

---

## Next Steps
1. **User-Review**: Tech-Design durchlesen und approven
2. **Backend Developer**: Supabase Views/Functions fuer Preis-Aggregation (optional, falls Performance-Probleme)
3. **Frontend Developer**: Preis-Tracking UI + Charts implementieren
4. **Danach**: PROJ-10 (Shopping Insights)
