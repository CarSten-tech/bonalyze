# PROJ-13: Budget Management

## Status: 🔵 Planned

## Übersicht
User können monatliche (oder wöchentliche) Budgets für den gesamten Haushalt sowie pro Kategorie festlegen. Bei Erreichen von 80% und 100% werden Push-Notifications gesendet. Dashboard zeigt visuell den Budget-Fortschritt.

## Abhängigkeiten
- Benötigt: PROJ-1 (Database Schema) - für Speicherung der Budgets
- Benötigt: PROJ-2 (User Authentication) - für User-Zuordnung
- Benötigt: PROJ-3 (Household Management) - Budgets sind pro Haushalt
- Benötigt: PROJ-7 (Dashboard) - Budget-Anzeige im Dashboard
- Benötigt: PROJ-11 (PWA Setup) - für Push Notifications

## User Stories

### US-1: Gesamt-Budget setzen
- Als **Haushalts-Admin** möchte ich **ein monatliches Gesamt-Budget festlegen** (z.B. 1.500€), um **unsere Ausgaben zu kontrollieren**
- Als **Haushalts-Mitglied** möchte ich **das aktuelle Budget sehen**, um **zu wissen wie viel noch übrig ist**

### US-2: Kategorie-Budgets setzen
- Als **Haushalts-Admin** möchte ich **Budgets pro Kategorie festlegen** (z.B. 500€ Lebensmittel), um **Ausgaben gezielt zu steuern**
- Als **User** möchte ich **sehen welche Kategorien über/unter Budget sind**, um **mein Verhalten anzupassen**

### US-3: Budget-Zeitraum wählen
- Als **Haushalts-Admin** möchte ich **zwischen monatlich und wöchentlich wählen**, um **die für uns passende Periode zu nutzen**
- Als **User** möchte ich **sehen wann das Budget zurückgesetzt wird**, um **planen zu können**

### US-4: Budget-Warnungen erhalten
- Als **User** möchte ich **bei 80% Budget-Auslastung gewarnt werden**, um **rechtzeitig reagieren zu können**
- Als **User** möchte ich **bei Budget-Überschreitung benachrichtigt werden**, um **informiert zu sein**

### US-5: Budget-Verlauf sehen
- Als **User** möchte ich **den Budget-Verlauf der letzten Monate sehen**, um **Trends zu erkennen**

## Acceptance Criteria

### AC-1: Budget-Konfiguration UI
- [ ] Settings-Seite mit "Budget" Tab
- [ ] Toggle: Monatlich / Wöchentlich
- [ ] Input: Gesamt-Budget (in Euro)
- [ ] Liste: Kategorie-Budgets (optional pro Kategorie)
- [ ] "Speichern" Button mit Erfolgsmeldung
- [ ] Nur Haushalts-Admin kann Budgets ändern

### AC-2: Budget-Anzeige im Dashboard
- [ ] Fortschrittsbalken für Gesamt-Budget
- [ ] Farben: Grün (0-60%), Gelb (60-80%), Orange (80-99%), Rot (100%+)
- [ ] Text: "€847 / €1.500 (56%)" oder "€1.620 / €1.500 (108% - Überschritten!)"
- [ ] Countdown: "Noch 12 Tage bis zum Reset"
- [ ] Kategorie-Budgets als Mini-Balken unter Donut-Chart

### AC-3: Budget-Berechnung
- [ ] Monatlich: Startet am 1. des Monats, endet am Letzten
- [ ] Wöchentlich: Startet jeden Montag
- [ ] Summe aller Receipts im Zeitraum = Verbrauch
- [ ] Bei neuer Receipt: Echtzeit-Update des Verbrauchs
- [ ] Bei Receipt-Löschung: Verbrauch reduziert

### AC-4: Push Notifications
- [ ] 80%-Warnung: "Achtung: 80% deines Budgets aufgebraucht"
- [ ] 100%-Warnung: "Budget überschritten! Du hast €120 mehr ausgegeben als geplant."
- [ ] Kategorie-Warnungen: "Lebensmittel-Budget zu 90% aufgebraucht"
- [ ] Notifications nur 1x pro Schwellenwert (nicht bei jedem Scan)
- [ ] User kann Notifications in Settings deaktivieren

### AC-5: Budget ohne Receipts
- [ ] Bei 0 Receipts: "€0 / €1.500 - Los geht's!"
- [ ] Keine Warnungen bei leerem Monat

### AC-6: Datenbank-Schema
- [ ] Neue Tabelle: `budgets`
  - `id` (UUID, PK)
  - `household_id` (FK)
  - `period_type` (enum: 'monthly', 'weekly')
  - `total_amount_cents` (integer)
  - `created_at`, `updated_at`
- [ ] Neue Tabelle: `category_budgets`
  - `id` (UUID, PK)
  - `budget_id` (FK)
  - `category` (text)
  - `amount_cents` (integer)
- [ ] Neue Tabelle: `budget_alerts`
  - `id` (UUID, PK)
  - `household_id` (FK)
  - `alert_type` (enum: 'warning_80', 'exceeded_100')
  - `period_start` (date)
  - `sent_at` (timestamp)

### AC-7: RLS Policies
- [ ] Budget: Nur Household-Mitglieder können lesen
- [ ] Budget: Nur Household-Admin kann schreiben
- [ ] Alerts: Nur Household-Mitglieder können lesen

## Edge Cases

### EC-1: Kein Budget gesetzt
- **Was passiert, wenn** kein Budget konfiguriert wurde?
- **Lösung**: Keine Budget-Anzeige im Dashboard, Settings zeigt "Budget nicht aktiviert"

### EC-2: Nur Gesamt-Budget, keine Kategorien
- **Was passiert, wenn** nur Gesamt-Budget ohne Kategorie-Budgets?
- **Lösung**: Dashboard zeigt nur Gesamt-Fortschritt, keine Kategorie-Balken

### EC-3: Kategorie-Summe > Gesamt-Budget
- **Was passiert, wenn** Kategorie-Budgets zusammen mehr als Gesamt-Budget?
- **Lösung**: Warnung in Settings, aber erlaubt (User weiß was er tut)

### EC-4: Budget-Wechsel mitten im Monat
- **Was passiert, wenn** User Budget von 1.500€ auf 1.000€ ändert?
- **Lösung**: Sofort wirksam, evtl. sofort über Budget (mit Warnung)

### EC-5: Monatlich → Wöchentlich wechseln
- **Was passiert, wenn** User den Zeitraum wechselt?
- **Lösung**: Ab sofort neuer Zeitraum, alter Verlauf bleibt für Historie

### EC-6: Receipts aus Vergangenheit erfasst
- **Was passiert, wenn** ein alter Bon nachträglich gescannt wird?
- **Lösung**: Receipt-Datum zählt, nicht Scan-Datum (Budget der Vergangenheit betroffen)

## UI/UX Spezifikation

### Budget-Anzeige im Dashboard
```
┌─────────────────────────────┐
│  Budget Januar 2025         │
│                             │
│  ███████████░░░░░  €847     │
│                    / €1.500 │
│                             │
│  56% verbraucht             │
│  Noch €653 · 12 Tage übrig  │
│                             │
│  ─── Kategorien ────────── │
│                             │
│  Lebensmittel               │
│  ████████████████░░ €420/€500 │
│                             │
│  Haushalt                   │
│  ██████░░░░░░░░░░░ €87/€200 │
│                             │
└─────────────────────────────┘
```

### Budget bei Überschreitung
```
┌─────────────────────────────┐
│  ⚠️ Budget überschritten!   │
│                             │
│  ████████████████████ €1.620│
│                    / €1.500 │
│                             │
│  108% · €120 über Budget    │
│                             │
└─────────────────────────────┘
```

### Budget Settings
```
┌─────────────────────────────┐
│  Budget einrichten          │
├─────────────────────────────┤
│                             │
│  Zeitraum:                  │
│  (●) Monatlich  ( ) Wöchentl.│
│                             │
│  Gesamt-Budget:             │
│  [      1500      ] €       │
│                             │
│  ─── Kategorien (optional)───│
│                             │
│  Lebensmittel               │
│  [       500      ] €       │
│                             │
│  Haushalt                   │
│  [       200      ] €       │
│                             │
│  + Kategorie hinzufügen     │
│                             │
│  ─── Benachrichtigungen ─── │
│  [✓] Warnung bei 80%        │
│  [✓] Warnung bei 100%       │
│                             │
│  [      Speichern      ]    │
│                             │
└─────────────────────────────┘
```

### Push Notification Examples
```
┌─────────────────────────────┐
│ 🏠 Familie Müller           │
│                             │
│ ⚠️ Budget-Warnung           │
│                             │
│ 80% deines monatlichen      │
│ Budgets aufgebraucht.       │
│ Noch €300 für 8 Tage.       │
│                             │
└─────────────────────────────┘
```

## Technische Anforderungen

### Performance
- Budget-Check bei jedem Receipt-Scan: < 100ms
- Dashboard-Anzeige: Bereits in `get_dashboard_summary` enthalten

### API Design
```typescript
// GET /api/budgets?household_id=xxx
// Returns current budget configuration + current usage

// POST /api/budgets
// Body: { household_id, period_type, total_amount_cents, categories: [...] }

// GET /api/budgets/history?household_id=xxx&months=6
// Returns budget vs actual for last 6 months
```

### Supabase Function
```sql
CREATE OR REPLACE FUNCTION check_budget_alert(
  p_household_id UUID,
  p_new_total_cents INTEGER
) RETURNS JSONB AS $$
  -- Returns { should_alert: boolean, alert_type: 'warning_80' | 'exceeded_100' | null }
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Checklist vor Abschluss

- [x] **Fragen gestellt**: Budget-Ebene, Zeitraum, Warnungen geklärt
- [x] **User Stories komplett**: 5 User Stories definiert
- [x] **Acceptance Criteria konkret**: 7 Kategorien mit testbaren Kriterien
- [x] **Edge Cases identifiziert**: 6 Edge Cases dokumentiert
- [x] **Feature-ID vergeben**: PROJ-13
- [x] **File gespeichert**: `/features/PROJ-13-budget-management.md`
- [x] **Status gesetzt**: 🔵 Planned
- [x] **User Review**: Approved (02.02.2025)

## Tech-Design (Solution Architect)

### Bestehende Architektur (Wiederverwendung)

**Bereits vorhanden:**
- Dashboard mit Ausgaben-Uebersicht (PROJ-7)
- Haushalt-Kontext (aktiver Haushalt bekannt)
- Settings-Seite Grundstruktur
- shadcn/ui Components: Card, Progress, Input, Select, Switch, Tabs, Form, Toast
- Supabase Client + RLS-Patterns aus anderen Features
- Push Notification Infrastruktur (aus PROJ-11 PWA)

**Wird erweitert:**
- Dashboard um Budget-Anzeige
- Settings um Budget-Konfiguration

---

### Component-Struktur

```
Budget-System
│
├── Dashboard Budget-Anzeige (neuer Bereich im Dashboard)
│   ├── Budget-Header
│   │   ├── "Budget Januar 2025"
│   │   └── Countdown: "Noch 12 Tage bis Reset"
│   ├── Gesamt-Budget Fortschritt
│   │   ├── Fortschrittsbalken (farbcodiert)
│   │   ├── Verbraucht / Gesamt (z.B. "€847 / €1.500")
│   │   ├── Prozent-Anzeige
│   │   └── Ueberschreitungs-Warnung (falls > 100%)
│   └── Kategorie-Budgets (optional, wenn konfiguriert)
│       └── Mini-Fortschrittsbalken pro Kategorie
│
├── Budget-Settings Seite (/settings/budget)
│   ├── Budget aktivieren/deaktivieren Toggle
│   ├── Zeitraum-Auswahl (Monatlich / Woechentlich)
│   ├── Gesamt-Budget Eingabe (Euro)
│   ├── Kategorie-Budgets Bereich
│   │   ├── Kategorie-Budget Zeile (pro Kategorie)
│   │   │   ├── Kategorie-Name
│   │   │   └── Budget-Eingabe
│   │   └── "Kategorie hinzufuegen" Button
│   ├── Benachrichtigungs-Einstellungen
│   │   ├── Toggle: Warnung bei 80%
│   │   └── Toggle: Warnung bei 100%
│   └── Speichern-Button
│
├── Budget-Warnungen (Push Notifications)
│   ├── 80%-Warnung
│   └── 100%-Ueberschreitungs-Warnung
│
└── Budget-Verlauf (optional, spaetere Erweiterung)
    └── Historische Ansicht der letzten Monate
```

---

### Daten-Model (einfach beschrieben)

**Neue Datenbank-Tabellen (Backend Developer erstellt):**

**Budget-Konfiguration:**
- Eindeutige ID
- Haushalt-Zugehoerigkeit
- Zeitraum-Typ: Monatlich oder Woechentlich
- Gesamt-Budget (in Cent, z.B. 150000 = €1.500)
- Erstellungs- und Aenderungszeitpunkt

**Kategorie-Budgets:**
- Eindeutige ID
- Gehoert zu welchem Budget
- Kategorie-Name (z.B. "Lebensmittel")
- Budget-Betrag (in Cent)

**Versendete Warnungen (verhindert Mehrfach-Benachrichtigung):**
- Eindeutige ID
- Haushalt-Zugehoerigkeit
- Warnungs-Typ: 80% oder 100%
- Perioden-Start (z.B. 1. Januar 2025)
- Gesendet am (Zeitstempel)

**Berechnung (nicht gespeichert, live berechnet):**
- Aktueller Verbrauch = Summe aller Receipts im aktuellen Zeitraum
- Prozent verbraucht = Verbrauch / Budget × 100
- Verbleibend = Budget - Verbrauch

---

### Tech-Entscheidungen

| Entscheidung | Begruendung |
|--------------|-------------|
| **Betraege in Cent speichern** | Vermeidet Rundungsfehler bei Berechnungen. €1.500 = 150000 Cent. |
| **Live-Berechnung statt Caching** | Verbrauch aendert sich bei jedem Receipt. Immer aktuell, keine Sync-Probleme. |
| **Warnungs-Tracking in DB** | Verhindert dass User 10x die gleiche "80% erreicht" Warnung bekommt. |
| **Kategorie-Budgets optional** | Nicht jeder User will so granular planen. Simpler Start moeglich. |
| **Nur Admin kann Budget aendern** | Verhindert Konflikte in Mehrpersonen-Haushalten. Alle koennen sehen, einer konfiguriert. |
| **Zeitraum sofort wirksam** | Bei Aenderung von 1.500€ auf 1.000€: Sofortige Anpassung, evtl. sofort ueber Budget. |

---

### Ablauf der Budget-Pruefung

```
1. User scannt neuen Kassenbon
   → Receipt wird gespeichert
   → Budget-Check wird getriggert

2. Budget-Check (Backend)
   → Lade aktuelle Budget-Konfiguration
   → Berechne Summe aller Receipts im Zeitraum
   → Vergleiche mit Budget

3. Falls Schwellenwert erreicht:
   → Pruefe: Wurde diese Warnung schon gesendet?
   → Falls Nein: Sende Push Notification
   → Speichere dass Warnung gesendet wurde

4. Dashboard aktualisiert
   → Zeigt neuen Verbrauchsstand
   → Fortschrittsbalken aktualisiert
   → Farbe wechselt wenn noetig (gruen → gelb → rot)
```

---

### Farb-Schema fuer Fortschrittsbalken

| Verbrauch | Farbe | Bedeutung |
|-----------|-------|-----------|
| 0-60% | Gruen | Alles gut |
| 60-80% | Gelb | Aufpassen |
| 80-99% | Orange | Fast erreicht |
| 100%+ | Rot | Ueberschritten |

---

### Push Notification Texte

**80%-Warnung:**
```
🏠 Familie Mueller
⚠️ Budget-Warnung
80% deines monatlichen Budgets aufgebraucht.
Noch €300 fuer 8 Tage.
```

**100%-Warnung:**
```
🏠 Familie Mueller
🚨 Budget ueberschritten!
Du hast €120 mehr ausgegeben als geplant.
```

---

### Dependencies

**Neue Packages:**
Keine! Alles wird mit vorhandenen Tools umgesetzt.

**Bereits vorhanden:**
- Supabase Client (Datenbank)
- shadcn/ui (Progress, Input, Switch, Card, Form)
- Push Notifications (aus PROJ-11)
- React Hook Form + Zod (Formular-Validierung)

---

### Abhaengigkeiten zu anderen Features

| Feature | Beziehung |
|---------|-----------|
| PROJ-1 (Database Schema) | Neue Tabellen werden hinzugefuegt |
| PROJ-3 (Household Management) | Budget gehoert zum Haushalt |
| PROJ-7 (Dashboard) | Budget-Anzeige wird integriert |
| PROJ-11 (PWA Setup) | Push Notifications werden genutzt |

---

### Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| User setzt unrealistisches Budget | Mittel | Keine Einschraenkung, User lernt durch Erfahrung |
| Kategorie-Summe > Gesamt-Budget | Niedrig | Warnung in UI, aber erlaubt |
| Alte Receipts aendern Budget rueckwirkend | Mittel | Receipt-Datum zaehlt, klar dokumentiert |
| Push Notifications deaktiviert im Browser | Mittel | In-App Warnung als Fallback |

---

## Next Steps
1. **User-Review**: Tech-Design durchlesen und approven
2. **Backend Developer**: Budget-Tabellen + RLS + Check-Funktion erstellen
3. **Frontend Developer**: Settings UI + Dashboard Integration
4. **Danach**: PROJ-14 (Data Export)
