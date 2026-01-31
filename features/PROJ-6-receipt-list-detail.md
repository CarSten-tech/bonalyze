# PROJ-6: Receipt List & Detail View

## Status: 🔵 Planned

## Übersicht
Übersicht aller erfassten Receipts des Haushalts mit Filtermöglichkeiten und Detail-Ansicht für einzelne Receipts.

## Abhängigkeiten
- Benötigt: PROJ-1 (Database Schema) - für `receipts`, `receipt_items`
- Benötigt: PROJ-2 (User Authentication) - User muss eingeloggt sein
- Benötigt: PROJ-3 (Household Management) - für Haushalt-Filter
- Benötigt: PROJ-4/5 (Receipt Scanner/Editor) - zum Erstellen von Receipts

## User Stories

### US-1: Receipts anzeigen
- Als **User** möchte ich **alle Receipts meines Haushalts sehen**, um **einen Überblick zu haben**
- Als **User** möchte ich **die neuesten Receipts zuerst sehen**, um **aktuelle Einkäufe schnell zu finden**

### US-2: Receipts filtern
- Als **User** möchte ich **nach Store filtern**, um **nur Einkäufe bei einem bestimmten Laden zu sehen**
- Als **User** möchte ich **nach Zeitraum filtern**, um **z.B. nur diesen Monat zu sehen**
- Als **User** möchte ich **nach Käufer filtern**, um **zu sehen wer was gekauft hat**

### US-3: Receipt-Details
- Als **User** möchte ich **einen Receipt öffnen**, um **die einzelnen Produkte zu sehen**
- Als **User** möchte ich **das Original-Foto sehen**, um **bei Unklarheiten nachschauen zu können**

### US-4: Receipt bearbeiten/löschen
- Als **User** möchte ich **einen Receipt nachträglich bearbeiten**, um **Fehler zu korrigieren**
- Als **User** möchte ich **einen Receipt löschen**, um **Fehl-Erfassungen zu entfernen**

## Acceptance Criteria

### AC-1: Receipt-Liste
- [ ] Liste zeigt: Store, Datum, Summe, Käufer
- [ ] Sortierung: Neueste zuerst (Default)
- [ ] Gruppierung nach Monat (optional)
- [ ] Pull-to-Refresh für Aktualisierung
- [ ] Infinite Scroll oder "Mehr laden" Button
- [ ] Leerer State: "Noch keine Kassenbons. Scanne deinen ersten!"

### AC-2: Filter
- [ ] Filter-Bar oben (Pills oder Dropdown)
- [ ] Store-Filter: Multi-Select aus allen Merchants
- [ ] Zeitraum-Filter: "Dieser Monat", "Letzter Monat", "Letzte 3 Monate", "Custom"
- [ ] Käufer-Filter: Household-Mitglieder
- [ ] Filter kombinierbar
- [ ] "Filter zurücksetzen" Button

### AC-3: Receipt-Card (List Item)
- [ ] Store-Name + Logo/Icon
- [ ] Datum (formatiert: "28. Jan 2025")
- [ ] Gesamtsumme prominent
- [ ] Käufer-Avatar/Initial
- [ ] Item-Count ("12 Produkte")
- [ ] Tap → Detail View

### AC-4: Detail View
- [ ] Header: Store, Datum, Käufer
- [ ] Item-Liste: Produkt, Menge, Preis
- [ ] Summen-Anzeige
- [ ] "Foto anzeigen" Button
- [ ] "Bearbeiten" Button
- [ ] "Löschen" Button (mit Bestätigung)

### AC-5: Foto-Ansicht
- [ ] Original-Receipt-Foto in Full-Screen
- [ ] Pinch-to-Zoom
- [ ] Swipe zum Schließen

### AC-6: Receipt bearbeiten
- [ ] Öffnet Receipt Editor (PROJ-5) mit bestehenden Daten
- [ ] Änderungen werden gespeichert
- [ ] Zurück zur Detail-Ansicht nach Speichern

### AC-7: Receipt löschen
- [ ] Bestätigungs-Dialog: "Receipt wirklich löschen?"
- [ ] Soft-Delete oder Hard-Delete (MVP: Hard-Delete)
- [ ] Zurück zur Liste nach Löschen
- [ ] Toast: "Receipt gelöscht"

## Edge Cases

### EC-1: Viele Receipts (Performance)
- **Was passiert, wenn** 1000+ Receipts existieren?
- **Lösung**: Pagination (20 pro Seite) oder Infinite Scroll
- **Performance**: Index auf `receipts(household_id, date DESC)`

### EC-2: Receipt ohne Foto
- **Was passiert, wenn** das Original-Foto fehlt/gelöscht wurde?
- **Lösung**: "Foto nicht verfügbar" Placeholder
- **Future**: Foto bleibt immer erhalten

### EC-3: Filter ohne Ergebnisse
- **Was passiert, wenn** Filter-Kombination 0 Ergebnisse liefert?
- **Lösung**: "Keine Receipts gefunden" + Filter-Reset-Button

### EC-4: Concurrent Edit
- **Was passiert, wenn** zwei Household-Member gleichzeitig editieren?
- **Lösung (MVP)**: Last-Write-Wins
- **Future**: Optimistic Locking mit Conflict-Resolution

## UI/UX Spezifikation

### Receipt List Screen
```
┌─────────────────────────────┐
│  Kassenbons                 │
├─────────────────────────────┤
│                             │
│  [Alle Stores▼] [Januar▼]   │
│  [Alle Käufer▼] [✕ Reset]   │
│                             │
│  ─────── Januar 2025 ────── │
│                             │
│  ┌───────────────────────┐  │
│  │ 🛒 REWE               │  │
│  │ 28. Jan 2025  • Max   │  │
│  │ 12 Produkte           │  │
│  │              €47.32 → │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ 🛒 LIDL               │  │
│  │ 25. Jan 2025  • Anna  │  │
│  │ 8 Produkte            │  │
│  │              €23.15 → │  │
│  └───────────────────────┘  │
│                             │
│  ─────── Dezember 2024 ──── │
│                             │
│  ...                        │
│                             │
│  [   Mehr laden...   ]      │
│                             │
└─────────────────────────────┘

     [+] FAB: Neuer Scan
```

### Receipt Detail Screen
```
┌─────────────────────────────┐
│  ← REWE            [📷][✏️] │
├─────────────────────────────┤
│                             │
│  28. Januar 2025            │
│  Bezahlt von: Max           │
│                             │
│  ─────── Produkte ───────── │
│                             │
│  Bio Vollmilch 1L           │
│  2x €1.29            €2.58  │
│                             │
│  Bananen 1kg                │
│  1x €1.99            €1.99  │
│                             │
│  Vollkornbrot               │
│  1x €2.49            €2.49  │
│                             │
│  ... (8 weitere)            │
│                             │
│  ─────────────────────────  │
│                             │
│  Zwischensumme:     €45.32  │
│  Rabatt Coupon:     -€2.00  │
│  ─────────────────────────  │
│  GESAMT:            €43.32  │
│                             │
│  ─────────────────────────  │
│                             │
│  [    🗑️ Receipt löschen   ]│
│                             │
└─────────────────────────────┘
```

## Checklist vor Abschluss

- [x] **User Stories komplett**: 4 User Stories definiert
- [x] **Acceptance Criteria konkret**: 7 Kategorien mit testbaren Kriterien
- [x] **Edge Cases identifiziert**: 4 Edge Cases dokumentiert
- [x] **Feature-ID vergeben**: PROJ-6
- [x] **File gespeichert**: `/features/PROJ-6-receipt-list-detail.md`
- [x] **Status gesetzt**: 🔵 Planned
- [ ] **User Review**: Warte auf User-Approval

## Tech-Design (Solution Architect)

### Component-Struktur

```
Kassenbons-Seite (/receipts)
├── Seiten-Header
│   └── Titel "Kassenbons"
│
├── Filter-Bereich
│   ├── Store-Filter (Dropdown: Alle Stores, REWE, LIDL, ...)
│   ├── Zeitraum-Filter (Dropdown: Dieser Monat, Letzter Monat, ...)
│   ├── Kaeufer-Filter (Dropdown: Alle Mitglieder, Max, Anna, ...)
│   └── "Filter zuruecksetzen" Button
│
├── Receipt-Liste (scrollbar)
│   ├── Monats-Trenner ("Januar 2025")
│   ├── Receipt-Karte (klickbar)
│   │   ├── Store-Name + Icon
│   │   ├── Datum (formatiert)
│   │   ├── Anzahl Produkte
│   │   ├── Kaeufer-Avatar
│   │   └── Gesamtsumme (prominent)
│   ├── Receipt-Karte ...
│   ├── Monats-Trenner ("Dezember 2024")
│   └── ...
│
├── Leerer-Zustand (wenn keine Receipts)
│   └── "Noch keine Kassenbons. Scanne deinen ersten!"
│
├── "Mehr laden" Button (Pagination)
│
└── FAB (Floating Action Button)
    └── "Neuen Bon scannen" (+)


Receipt-Detail-Seite (/receipts/[id])
├── Header
│   ├── Zurueck-Button
│   ├── Store-Name
│   ├── Foto-Button (oeffnet Foto-Ansicht)
│   └── Bearbeiten-Button (oeffnet Receipt-Editor)
│
├── Meta-Informationen
│   ├── Datum (formatiert)
│   └── Bezahlt von (Kaeufer-Name)
│
├── Produkt-Liste
│   ├── Produkt-Zeile
│   │   ├── Produkt-Name
│   │   ├── Menge x Einzelpreis
│   │   └── Gesamtpreis
│   └── ...
│
├── Summen-Bereich
│   ├── Zwischensumme
│   ├── Rabatte (falls vorhanden)
│   └── Gesamtsumme (fett)
│
└── Loeschen-Button
    └── "Receipt loeschen" (mit Bestaetigung)


Foto-Ansicht (Modal/Overlay)
├── Vollbild-Foto des Kassenbons
├── Zoom-Funktion (Pinch-to-Zoom)
└── Schliessen-Button
```

### Daten-Model

**Was wird angezeigt:**

Jeder Kassenbon (Receipt) hat:
- Eindeutige ID
- Haushalt (zu welcher Familie/WG gehoert er)
- Store/Merchant (REWE, LIDL, etc.)
- Kaeufer (wer hat bezahlt)
- Datum des Einkaufs
- Gesamtsumme in Cent (fuer Praezision)
- Foto-URL (optional)
- Notizen (optional)

Jede Position (Receipt Item) hat:
- Produkt-Name
- Menge (z.B. 2 Stueck, 0.5 kg)
- Einheit (kg, L, Stueck)
- Preis in Cent

**Beziehungen:**
- Ein Receipt gehoert zu einem Haushalt
- Ein Receipt hat einen Merchant (Store)
- Ein Receipt hat einen Kaeufer (Profile)
- Ein Receipt hat mehrere Items (Positionen)

**Gespeichert in:** Supabase PostgreSQL-Datenbank (bereits vorhanden via PROJ-1)

### Wiederverwendbare Komponenten (bereits vorhanden)

Folgende shadcn/ui Komponenten koennen wiederverwendet werden:
- **Card** - fuer Receipt-Karten in der Liste
- **Select** - fuer Filter-Dropdowns
- **Button** - fuer Aktionen (Loeschen, Bearbeiten, etc.)
- **Dialog** - fuer Loesch-Bestaetigung
- **Avatar** - fuer Kaeufer-Anzeige
- **Badge** - fuer Tags/Status
- **Skeleton** - fuer Lade-Zustaende
- **Separator** - fuer Monats-Trenner
- **Toast/Sonner** - fuer Erfolgs-/Fehler-Meldungen

### Tech-Entscheidungen

**Warum Supabase fuer Daten?**
- Bereits eingerichtet (PROJ-1)
- Echtzeit-Sync moeglich (wenn zwei Nutzer gleichzeitig schauen)
- Eingebaute Sicherheit (RLS Policies)
- Schnelle Abfragen durch vorhandene Indizes

**Warum Server Components + Client Components Mix?**
- Server Components: Initiales Laden der Receipt-Liste (schnell, SEO-freundlich)
- Client Components: Filter-Interaktion, Infinite Scroll, Modals

**Warum Pagination statt alle Daten laden?**
- Performance bei vielen Receipts (1000+)
- "Mehr laden" Button ist einfacher als Infinite Scroll (MVP)
- Datenbank-Index auf (household_id, date DESC) bereits vorhanden

**Warum separater Detail-View statt Modal?**
- Bessere URL-Teilbarkeit (/receipts/123)
- Mehr Platz fuer Produkt-Liste
- Zurueck-Navigation mit Browser-History

**Warum Foto in Modal statt eigener Seite?**
- Schneller Zugriff ohne Navigation
- Zoom-Funktion direkt verfuegbar
- Einfaches Schliessen

### API-Endpunkte (Was der Backend braucht)

Der Frontend Developer braucht folgende Daten-Abfragen:

1. **Receipts laden**
   - Filter: Haushalt-ID (Pflicht), Store (optional), Zeitraum (optional), Kaeufer (optional)
   - Sortierung: Datum absteigend
   - Pagination: 20 pro Seite

2. **Einzelnen Receipt laden**
   - Receipt mit allen Items
   - Merchant-Details (Name, Logo)
   - Kaeufer-Details (Name, Avatar)

3. **Receipt loeschen**
   - Loescht Receipt und alle zugehoerigen Items

4. **Filter-Optionen laden**
   - Liste aller Merchants im Haushalt
   - Liste aller Haushalt-Mitglieder

### Dependencies

**Keine neuen Packages notwendig!**

Alle benoetigen Funktionen sind bereits verfuegbar:
- shadcn/ui Komponenten (bereits installiert)
- Supabase Client (bereits eingerichtet)
- Tailwind CSS (bereits konfiguriert)
- Lucide Icons (bereits verfuegbar)

**Optional fuer Foto-Zoom:**
- Falls Pinch-to-Zoom gewuenscht: `react-zoom-pan-pinch` (leichtgewichtig)
- Alternativ: CSS transform mit Touch-Events (keine zusaetzliche Library)

### Routing-Struktur

```
/receipts              -> Receipt-Liste (Hauptseite)
/receipts/[id]         -> Receipt-Detail-Ansicht
/receipts/[id]/edit    -> Receipt bearbeiten (nutzt PROJ-5 Editor)
```

### Naechste Schritte fuer Frontend Developer

1. Receipt-Liste Seite bauen (/receipts)
2. Filter-Komponente implementieren
3. Receipt-Card Komponente bauen
4. Receipt-Detail Seite bauen (/receipts/[id])
5. Foto-Modal implementieren
6. Loesch-Dialog mit Bestaetigung
7. Lade-Zustaende und Fehlerbehandlung

---

## Next Steps
1. **User-Review**: Spec durchlesen und approven
2. **Frontend Developer**: List + Detail Views bauen
3. **Danach**: PROJ-7 (Dashboard & Analytics)
