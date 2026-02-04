# PROJ-14: Data Export

## Status: 🔵 Planned

## Übersicht
User können ihre Daten als CSV (Rohdaten) oder PDF (formatierter Monatsbericht) exportieren. Ermöglicht Datensicherung, Steuerunterlagen und externe Analyse.

## Abhängigkeiten
- Benötigt: PROJ-1 (Database Schema) - für Daten
- Benötigt: PROJ-2 (User Authentication) - für User-Zuordnung
- Benötigt: PROJ-3 (Household Management) - Export pro Haushalt
- Optional: PROJ-7 (Dashboard) - Daten für PDF-Report

## User Stories

### US-1: Receipt-Daten als CSV exportieren
- Als **User** möchte ich **alle meine Receipts als CSV herunterladen**, um **sie in Excel/Google Sheets zu analysieren**
- Als **User** möchte ich **den Export-Zeitraum wählen**, um **nur relevante Daten zu bekommen**

### US-2: Monatsbericht als PDF
- Als **User** möchte ich **einen formatierten Monatsbericht als PDF**, um **ihn auszudrucken oder zu archivieren**
- Als **User** möchte ich **den Bericht für die Steuer nutzen**, um **Ausgaben nachzuweisen**

### US-3: Export-Optionen
- Als **User** möchte ich **wählen welche Daten im Export enthalten sind**, um **nur Relevantes zu exportieren**
- Als **User** möchte ich **den Export per Email erhalten** (optional), um **auf anderen Geräten darauf zuzugreifen**

## Acceptance Criteria

### AC-1: CSV Export
- [ ] Button "Als CSV exportieren" in Settings oder Receipt-Liste
- [ ] Zeitraum wählbar: Monat, Quartal, Jahr, Custom Range
- [ ] CSV enthält: Datum, Store, Einzelposten, Preis, Kategorie, Gesamt
- [ ] UTF-8 Encoding (für Umlaute)
- [ ] Dateiname: `bonalyze-export-YYYY-MM.csv`
- [ ] Download startet sofort (kein Email)

### AC-2: PDF Monatsbericht
- [ ] Button "Monatsbericht (PDF)" in Settings oder Dashboard
- [ ] PDF enthält:
  - Header: Haushalt-Name, Monat, Logo
  - Zusammenfassung: Gesamt-Ausgaben, Anzahl Einkäufe
  - Kategorie-Aufschlüsselung (wie Dashboard)
  - Store-Ranking (Top 5)
  - Liste aller Receipts (Datum, Store, Betrag)
- [ ] Professionelles Layout (A4-Format)
- [ ] Dateiname: `bonalyze-bericht-YYYY-MM.pdf`

### AC-3: Export-Dialog UI
- [ ] Modal/Sheet mit Export-Optionen
- [ ] Format-Auswahl: CSV / PDF
- [ ] Zeitraum-Auswahl: Dropdown oder Datepicker
- [ ] "Exportieren" Button
- [ ] Loading-State während Generierung
- [ ] Erfolg: Download startet automatisch

### AC-4: Performance
- [ ] CSV Export: < 3 Sekunden für 1000 Receipts
- [ ] PDF Generierung: < 5 Sekunden
- [ ] Server-side Generierung (nicht im Browser)

### AC-5: Datenschutz
- [ ] Export nur für eigenen Haushalt
- [ ] Keine sensiblen Daten (Passwörter, API Keys) im Export
- [ ] Download-Link temporär (max. 10 Minuten gültig)

## Edge Cases

### EC-1: Kein Daten im Zeitraum
- **Was passiert, wenn** keine Receipts im gewählten Zeitraum?
- **Lösung**: Warnung "Keine Daten für diesen Zeitraum" + Export-Button disabled

### EC-2: Sehr große Datenmengen
- **Was passiert, wenn** User 5.000+ Receipts exportiert?
- **Lösung**: Server-side Streaming, ggf. ZIP für große Exports

### EC-3: Receipts ohne vollständige Daten
- **Was passiert, wenn** Receipts unvollständig sind (kein Store, kein Datum)?
- **Lösung**: Leere Felder mit "N/A" oder "Unbekannt"

### EC-4: PDF zu lang (100+ Seiten)
- **Was passiert, wenn** Jahresexport sehr viele Seiten hat?
- **Lösung**: Pagination, ggf. nur Summary + "Vollständige Liste im CSV"

## UI/UX Spezifikation

### Export-Dialog
```
┌─────────────────────────────┐
│  Daten exportieren      ×   │
├─────────────────────────────┤
│                             │
│  Format:                    │
│  (●) CSV - Rohdaten         │
│  ( ) PDF - Monatsbericht    │
│                             │
│  Zeitraum:                  │
│  [ Januar 2025          ▼ ] │
│                             │
│  Vorschau:                  │
│  📄 23 Kassenbons           │
│  💰 €1.247,32 gesamt        │
│                             │
│  [ Exportieren ↓ ]          │
│                             │
└─────────────────────────────┘
```

### PDF Monatsbericht (A4)
```
┌─────────────────────────────────────┐
│                                     │
│  BONALYZE         Familie Müller    │
│  ─────────────────────────────────  │
│                                     │
│  Monatsbericht Januar 2025          │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ Zusammenfassung                │ │
│  │                                │ │
│  │ Ausgaben gesamt:    €1.247,32 │ │
│  │ Anzahl Einkäufe:    23        │ │
│  │ Durchschnitt:       €54,23    │ │
│  └────────────────────────────────┘ │
│                                     │
│  Nach Kategorie                     │
│  ─────────────────────────────────  │
│  Lebensmittel         €812,45  65% │
│  Haushalt             €234,87  19% │
│  Getränke             €200,00  16% │
│                                     │
│  Top Stores                         │
│  ─────────────────────────────────  │
│  1. REWE              €512,34      │
│  2. LIDL              €398,21      │
│  3. ALDI              €336,77      │
│                                     │
│  ─────────────────────────────────  │
│  Detaillierte Auflistung            │
│  (Seite 2-4)                        │
│                                     │
└─────────────────────────────────────┘
```

### CSV Format
```csv
datum;store;position;menge;einzelpreis;gesamtpreis;kategorie;bon_summe
2025-01-28;REWE;Bio Vollmilch 1L;2;1.29;2.58;Lebensmittel;47.32
2025-01-28;REWE;Butter 250g;1;2.49;2.49;Lebensmittel;47.32
2025-01-27;LIDL;Mineralwasser 6x1.5L;2;3.99;7.98;Getränke;23.45
```

## Technische Anforderungen

### API Design
```typescript
// POST /api/export/csv
// Body: { household_id, start_date, end_date }
// Returns: { download_url: "https://..." }

// POST /api/export/pdf
// Body: { household_id, year, month }
// Returns: { download_url: "https://..." }
```

### PDF Generierung
```typescript
// Option 1: @react-pdf/renderer (Server-side)
// Option 2: puppeteer (HTML → PDF)
// Empfehlung: @react-pdf/renderer (weniger Dependencies)
```

### Supabase Storage
- Export-Files temporär in Supabase Storage
- Auto-Cleanup nach 10 Minuten
- Signierte URLs für Download

## Checklist vor Abschluss

- [x] **Fragen gestellt**: Formate und Inhalte geklärt
- [x] **User Stories komplett**: 3 User Stories definiert
- [x] **Acceptance Criteria konkret**: 5 Kategorien mit testbaren Kriterien
- [x] **Edge Cases identifiziert**: 4 Edge Cases dokumentiert
- [x] **Feature-ID vergeben**: PROJ-14
- [x] **File gespeichert**: `/features/PROJ-14-data-export.md`
- [x] **Status gesetzt**: 🔵 Planned
- [x] **User Review**: Approved (02.02.2025)

## Tech-Design (Solution Architect)

### Bestehende Architektur (Wiederverwendung)

**Bereits vorhanden:**
- Alle Receipt-Daten in Supabase (receipts, receipt_items, merchants, products)
- Dashboard-Aggregationen (aus PROJ-7) - koennen fuer PDF-Summary wiederverwendet werden
- Supabase Storage (fuer temporaere Export-Dateien)
- shadcn/ui Components: Dialog, Select, Button, RadioGroup, Calendar, Toast
- Settings-Seite Grundstruktur

**Wird neu erstellt:**
- Export-Dialog Komponente
- API-Routes fuer CSV/PDF Generierung
- PDF-Template

---

### Component-Struktur

```
Export-System
│
├── Export-Button (in Settings oder Receipt-Liste)
│   └── Oeffnet Export-Dialog
│
├── Export-Dialog (Modal)
│   ├── Dialog-Header: "Daten exportieren"
│   ├── Format-Auswahl
│   │   ├── Option: CSV (Rohdaten fuer Excel/Sheets)
│   │   └── Option: PDF (Formatierter Monatsbericht)
│   ├── Zeitraum-Auswahl
│   │   ├── Schnellauswahl: Aktueller Monat, Letzter Monat, Quartal, Jahr
│   │   └── Custom: Von-Bis Datepicker
│   ├── Vorschau-Info
│   │   ├── Anzahl Kassenbons im Zeitraum
│   │   └── Gesamt-Betrag
│   ├── Exportieren-Button
│   │   └── Loading-State waehrend Generierung
│   └── Fehler-Anzeige (falls keine Daten)
│
├── CSV-Generierung (Backend)
│   ├── Sammelt alle Receipts + Items im Zeitraum
│   ├── Formatiert als CSV mit Semikolon-Trennung
│   ├── UTF-8 Encoding (fuer Umlaute)
│   └── Gibt Download-Link zurueck
│
└── PDF-Generierung (Backend)
    ├── Sammelt Daten wie Dashboard
    ├── Generiert formatiertes PDF (A4)
    │   ├── Deckblatt: Logo, Haushalt, Zeitraum
    │   ├── Zusammenfassung: Gesamt, Anzahl, Durchschnitt
    │   ├── Kategorie-Aufschluesselung
    │   ├── Top Stores
    │   └── Detaillierte Receipt-Liste
    └── Gibt Download-Link zurueck
```

---

### Daten-Model (einfach beschrieben)

**Keine neuen Datenbank-Tabellen!**

Alle Export-Daten kommen aus bestehenden Tabellen:
- Kassenbons (receipts): Datum, Store, Gesamtbetrag
- Positionen (receipt_items): Einzelne Produkte mit Preis
- Stores (merchants): Store-Namen
- Produkte (products): Produktnamen, Kategorien

**Temporaere Dateien (Supabase Storage):**
- Generierte CSV/PDF Dateien
- Automatisch geloescht nach 10 Minuten
- Signierte Download-URLs (sicher, zeitlich begrenzt)

---

### CSV-Format

```
Dateiname: bonalyze-export-2025-01.csv
Encoding: UTF-8 mit BOM (Excel-kompatibel)
Trennzeichen: Semikolon (;) - Standard in DE

Spalten:
datum;store;position;menge;einzelpreis;gesamtpreis;kategorie;bon_summe

Beispiel:
2025-01-28;REWE;Bio Vollmilch 1L;2;1,29;2,58;Lebensmittel;47,32
2025-01-28;REWE;Butter 250g;1;2,49;2,49;Lebensmittel;47,32
2025-01-27;LIDL;Mineralwasser 6x1.5L;2;3,99;7,98;Getraenke;23,45
```

**Warum Semikolon?**
Deutsche Excel-Versionen erwarten Semikolon als Trennzeichen. Komma wuerde zu Problemen fuehren.

---

### PDF-Struktur

```
Seite 1: Deckblatt + Zusammenfassung
┌────────────────────────────────────┐
│  BONALYZE           Familie Mueller│
│  ──────────────────────────────────│
│  Monatsbericht Januar 2025         │
│                                    │
│  Zusammenfassung                   │
│  • Ausgaben gesamt:    €1.247,32   │
│  • Anzahl Einkaeufe:   23          │
│  • Durchschnitt:       €54,23      │
│                                    │
│  Nach Kategorie                    │
│  ──────────────────────────────────│
│  Lebensmittel         €812,45  65% │
│  Haushalt             €234,87  19% │
│  Getraenke            €200,00  16% │
│                                    │
│  Top Stores                        │
│  ──────────────────────────────────│
│  1. REWE              €512,34      │
│  2. LIDL              €398,21      │
│  3. ALDI              €336,77      │
└────────────────────────────────────┘

Seite 2+: Detaillierte Auflistung
┌────────────────────────────────────┐
│  Detaillierte Auflistung           │
│  ──────────────────────────────────│
│                                    │
│  28.01.2025 - REWE        €47,32   │
│    • Bio Vollmilch 1L  2x  €2,58   │
│    • Butter 250g       1x  €2,49   │
│    • ... weitere Positionen        │
│                                    │
│  27.01.2025 - LIDL        €23,45   │
│    • Mineralwasser     2x  €7,98   │
│    • ... weitere Positionen        │
│                                    │
└────────────────────────────────────┘
```

---

### Tech-Entscheidungen

| Entscheidung | Begruendung |
|--------------|-------------|
| **Server-Side Generierung** | Browser kann keine PDFs generieren. CSV koennte im Browser, aber einheitlich auf Server. |
| **@react-pdf/renderer fuer PDF** | React-basiert, keine externen Abhaengigkeiten wie Puppeteer/Chrome. Leichtgewichtig. |
| **Supabase Storage fuer Downloads** | Temporaere Dateien mit signierten URLs. Kein eigener File-Server noetig. |
| **10 Minuten Link-Gültigkeit** | Sicherheit: Links verfallen schnell. User kann jederzeit neu exportieren. |
| **Semikolon-Trennung (CSV)** | Deutsche Excel-Versionen erwarten Semikolon. Komma fuehrt zu Fehldarstellung. |
| **UTF-8 mit BOM** | Excel erkennt dadurch automatisch die Kodierung. Umlaute funktionieren. |
| **Kein Email-Versand (MVP)** | Komplexitaet vermeiden. Direkter Download reicht fuer MVP. |

---

### API-Endpunkte

**CSV Export:**
```
POST /api/export/csv
Body: {
  household_id: "...",
  start_date: "2025-01-01",
  end_date: "2025-01-31"
}
Response: {
  download_url: "https://...",
  expires_at: "2025-01-28T15:10:00Z",
  file_name: "bonalyze-export-2025-01.csv",
  receipt_count: 23,
  total_amount: 124732
}
```

**PDF Export:**
```
POST /api/export/pdf
Body: {
  household_id: "...",
  year: 2025,
  month: 1
}
Response: {
  download_url: "https://...",
  expires_at: "2025-01-28T15:10:00Z",
  file_name: "bonalyze-bericht-2025-01.pdf",
  receipt_count: 23,
  total_amount: 124732
}
```

---

### Dependencies

**Neue Packages:**
| Package | Zweck |
|---------|-------|
| `@react-pdf/renderer` | PDF-Generierung mit React-Komponenten |

**Bereits vorhanden:**
- Supabase Client + Storage
- shadcn/ui (Dialog, Select, Button, RadioGroup)
- date-fns (Datumsformatierung)

---

### Abhaengigkeiten zu anderen Features

| Feature | Beziehung |
|---------|-----------|
| PROJ-1 (Database Schema) | Liest alle Receipt-Daten |
| PROJ-7 (Dashboard) | Wiederverwendet Aggregations-Logik |
| PROJ-3 (Household Management) | Export nur fuer eigenen Haushalt |

---

### Performance-Ziele

| Operation | Ziel | Wie erreicht |
|-----------|------|--------------|
| CSV mit 1000 Receipts | < 3 Sekunden | Streaming, keine vollstaendige Speicherung im RAM |
| PDF Monatsbericht | < 5 Sekunden | Optimierte Queries, einfaches Layout |
| Download-Start | < 1 Sekunde | Signed URL sofort verfuegbar |

---

### Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Sehr grosse Exports (5000+ Receipts) | Niedrig | Zeitraum-Limit empfehlen, Server-Timeout erhoehen |
| PDF zu lang (100+ Seiten) | Niedrig | Summary + "Details in CSV" ab Seite 20 |
| Speicher voll auf Supabase Storage | Sehr niedrig | Auto-Cleanup nach 10 Minuten |
| Excel oeffnet CSV falsch | Mittel | UTF-8 BOM + Semikolon + Hinweis in UI |

---

### Sicherheit

| Aspekt | Umsetzung |
|--------|-----------|
| Nur eigene Daten | RLS-Policy: Export nur fuer Haushalt-Mitglieder |
| Keine sensiblen Daten | Keine Passwoerter, Keys, User-IDs im Export |
| Temporaere Links | URLs verfallen nach 10 Minuten |
| Keine Direktzugriffe | Signierte URLs, keine ratebare File-Pfade |

---

## Next Steps
1. **User-Review**: Tech-Design durchlesen und approven
2. **Backend Developer**: Export-APIs + PDF-Template erstellen
3. **Frontend Developer**: Export-Dialog UI implementieren
4. **Danach**: PROJ-12 (Offline Mode)
