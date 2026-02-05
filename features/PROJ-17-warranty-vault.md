# PROJ-17: Warranty Vault & Tech-Protection

## Status: 🔵 Planned

## Übersicht

Ein intelligentes Feature für Bonalyze, das teure Anschaffungen und Elektronikgeräte auf Kassenbons automatisch erkennt und als "Garantie-Dokumente" sichert. Nutzer werden vor Ablauf der Gewährleistung erinnert, um Ansprüche nicht zu verpassen.

## Abhängigkeiten

- Benötigt: PROJ-1 (Database Schema) - Erweiterung der `receipt_items` Table
- Benötigt: PROJ-4 (Receipt Scanner AI) - Anpassung des Gemini Prompts
- Benötigt: PROJ-7 (Dashboard) - Neues Widget "Warranty Vault"

## User Stories

### US-1: Automatische Garantie-Erkennung

- Als **User** möchte ich **dass die App erkennt, wenn ich Elektronik oder teure Geräte scanne**, um **sie automatisch in den Warranty Vault zu legen**
- Als **User** möchte ich **einen vorgeschlagenen Garantiezeitraum (z.B. 2 Jahre)** sehen, der **automatisch berechnet wird**

### US-2: Review & Manuelles Flagging

- Als **User** möchte ich **beim Bearbeiten des Bons manuell Items als "Garantie-relevant" markieren** können, falls **die KI es übersehen hat**
- Als **User** möchte ich **das Ablaufdatum der Garantie manuell anpassen** können, falls **es abweicht (z.B. 3 Jahre Garantie)**

### US-3: Warranty Vault (Übersicht)

- Als **User** möchte ich **eine Liste aller meiner aktiven Garantien sehen**, um **einen Überblick über meine valuables zu haben**
- Als **User** möchte ich **sehen, wie lange die Garantie noch läuft**, um **rechtzeitig handeln zu können**

### US-4: Erinnerungen (MVP)

- Als **User** möchte ich **im Dashboard sehen, welche Garantien bald ablaufen**, um **noch letzte Ansprüche prüfen zu können**
- Als **User** möchte ich **abgelaufene Garantien archiviert sehen**, aber **trotzdem noch Zugriff auf den Bon haben**

## Acceptance Criteria

### AC-1: Database Schema Extension

- [ ] `receipt_items` Table erweitern:
  - [ ] `warranty_period_months` (int, nullable, default 24)
  - [ ] `warranty_end_date` (date, nullable)
  - [ ] `is_warranty_item` (boolean, default false)

### AC-2: AI Prompt Erweiterung

- [ ] Gemini Prompt anpassen:
  - [ ] Instruktion: "Markiere teure Elektronik, Haushaltsgeräte und Werkzeuge als `is_warranty_candidate: true`"
  - [ ] Instruktion: "Setze Default-Garantie auf 24 Monate für diese Items (EU Standard)"
- [ ] JSON Response Schema erweitern um `is_warranty_candidate` Flag pro Item

### AC-3: UI Updates (Receipt Editor)

- [ ] Toggle-Switch "Garantie / Wichtig" pro Item im Editor
- [ ] Bei Aktivierung: Date-Picker für "Garantie bis" (Default: Kaufdatum + 2 Jahre)
- [ ] Visual Highlighting für AI-detected Warranty Items

### AC-4: Dashboard Widget "Warranty Vault"

- [ ] Neue Section "Meine Geräte & Garantien"
- [ ] Listet Items mit `is_warranty_item = true`
- [ ] Sortierung nach Ablaufdatum (Bald ablaufend zuerst)
- [ ] Status-Badge: "Aktiv", "Läuft bald ab (< 30 Tage)", "Abgelaufen"

## Edge Cases

### EC-1: Gemischter Warenkorb

- **Szenario**: User kauft Milch, Brot und einen Toaster.
- **Lösung**: Nur der Toaster wird als Warranty-Item geflaggt. Das Receipt bleibt das "Master-Dokument".

### EC-2: Unterschiedliche Garantiezeiten

- **Szenario**: User kauft AppleCare (3 Jahre) oder extended Warranty.
- **Lösung**: User muss Datum im Editor manuell anpassen können.

### EC-3: Rückgabe/Umtausch

- **Szenario**: Item wird zurückgegeben.
- **Lösung**: User löscht Receipt oder Item -> Garantie verschwindet aus Vault.

## Technische Anforderungen

### AI-Tuning

- Prompt muss "Schrott" (USB-Kabel für 2€) von "Assets" (MacBook für 2000€) unterscheiden.
- Threshold für Auto-Detection: Items > 50€ (als Heuristik im Prompt oder Code).

### Data Migration

- Existierende Receipts werden beim Anzeigen nicht automatisch nach-geflaggt (zu teuer/komplex für MVP). Nur neue Scans.
- User kann alte Items manuell nach-flaggen.

## Checklist vor Abschluss

- [ ] Database Migration erstellt
- [ ] AI Prompt angepasst und getestet
- [ ] Receipt Editor UI erweitert
- [ ] Dashboard Widget implementiert

## Mockups

### Warranty Card (Dashboard)

```
┌─────────────────────────────────────┐
│ 🛡️ Warranty Vault                   │
│                                     │
│  [📱 iPhone 15 Pro ]  1 Jahr übrig  │
│  Kauf: 20.01.2025 • MediaMarkt      │
│  ─────────────────────────────────  │
│  [🎧 Sony WH-1000 ]  ⚠️ 14 Tage     │
│  Kauf: 15.02.2024 • Amazon          │
│                                     │
│  [ Alle anzeigen → ]                │
└─────────────────────────────────────┘
```
