# PROJ-12: Offline Scan Queue

## Status: 🔵 Planned

## Übersicht
Wenn die App offline ist, können User trotzdem Kassenbons fotografieren. Die Bilder werden lokal gespeichert und automatisch hochgeladen + verarbeitet, sobald wieder eine Verbindung besteht. Dezenter Offline-Banner informiert über den Status.

## Abhängigkeiten
- Benötigt: PROJ-4 (Receipt Scanner) - das Scan-Feature wird offline-fähig gemacht
- Benötigt: PROJ-11 (PWA Setup) - Service Worker für Offline-Funktionalität

## User Stories

### US-1: Offline scannen
- Als **User** möchte ich **Kassenbons fotografieren auch ohne Internet**, um **nicht warten zu müssen bis ich zuhause bin**
- Als **User** möchte ich **sehen dass mein Scan gespeichert wurde**, um **sicher zu sein dass nichts verloren geht**

### US-2: Automatischer Upload
- Als **User** möchte ich **dass meine offline Scans automatisch hochgeladen werden**, wenn **ich wieder online bin**
- Als **User** möchte ich **nicht manuell synchronisieren müssen**, um **Zeit zu sparen**

### US-3: Queue-Status sehen
- Als **User** möchte ich **sehen wieviele Scans in der Warteschlange sind**, um **den Überblick zu behalten**
- Als **User** möchte ich **einzelne Scans aus der Queue löschen können**, wenn **ich mich geirrt habe**

### US-4: Offline-Status erkennen
- Als **User** möchte ich **sofort sehen wenn ich offline bin**, um **mein Verhalten anzupassen**

## Acceptance Criteria

### AC-1: Offline-Erkennung
- [ ] `navigator.onLine` + `online`/`offline` Events überwachen
- [ ] Auch "schlechte Verbindung" erkennen (Fetch-Timeout > 5s → behandeln wie offline)
- [ ] Status in React Context für globalen Zugriff

### AC-2: Offline Scan Flow
- [ ] Kamera funktioniert auch offline (ist lokal)
- [ ] Foto wird in IndexedDB gespeichert (statt Supabase Upload)
- [ ] Metadaten: Timestamp, Household-ID, Bild-Blob
- [ ] Erfolgs-Meldung: "Scan gespeichert. Wird bei Verbindung verarbeitet."
- [ ] User landet NICHT im Receipt-Editor (da AI nicht verfügbar)

### AC-3: Offline Banner
- [ ] Wenn offline: Banner am oberen Bildschirmrand
- [ ] Text: "📵 Keine Internetverbindung"
- [ ] Farbe: Gelb/Orange (Warning, nicht Error)
- [ ] Sticky (scrollt nicht mit)
- [ ] Verschwindet automatisch wenn online

### AC-4: Queue-Indikator
- [ ] Badge auf FAB oder in Navigation: "3" (Anzahl pending Scans)
- [ ] Tap auf Badge → Queue-Übersicht
- [ ] Queue zeigt: Thumbnail, Timestamp, Status (pending/uploading/failed)

### AC-5: Auto-Sync bei Reconnect
- [ ] `online` Event triggert Sync
- [ ] Sequenzieller Upload (nicht parallel, Server-Last)
- [ ] Pro Scan: Upload → AI Processing → Receipt erstellen
- [ ] Bei Erfolg: Aus IndexedDB löschen
- [ ] Bei Fehler: Retry mit Exponential Backoff (max 3 Versuche)

### AC-6: Queue-Management
- [ ] Swipe-to-Delete auf einzelnen Queue-Items
- [ ] "Alle löschen" Button mit Confirmation
- [ ] Gelöschte Scans sind unwiederbringlich weg (Warnung!)

### AC-7: Persistent Storage
- [ ] IndexedDB für Bilder (bis zu 100MB typisch)
- [ ] Storage-Quota prüfen vor Speichern
- [ ] Bei vollem Storage: Warnung + älteste Scans nicht überschreiben

### AC-8: Background Sync (PWA)
- [ ] Service Worker Background Sync API nutzen (wenn verfügbar)
- [ ] Sync auch wenn App geschlossen (Browser-Support abhängig)
- [ ] Fallback: Sync beim nächsten App-Start

## Edge Cases

### EC-1: App geschlossen während Sync
- **Was passiert, wenn** User die App schließt während Upload läuft?
- **Lösung**: Scan bleibt in Queue, Sync beim nächsten Öffnen

### EC-2: Scan-Limit erreicht
- **Was passiert, wenn** Queue voll ist (z.B. 50 Scans)?
- **Lösung**: Warnung "Queue voll", User muss online gehen oder alte Scans löschen

### EC-3: AI-Fehler bei Offline-Scan
- **Was passiert, wenn** AI den offline gescannten Bon nicht lesen kann?
- **Lösung**: Receipt trotzdem erstellen mit Bild, User korrigiert manuell

### EC-4: Haushalt gewechselt während offline
- **Was passiert, wenn** User offline scannt, dann Haushalt wechselt?
- **Lösung**: Scan geht an den Haushalt der zum Scan-Zeitpunkt aktiv war (in Metadaten gespeichert)

### EC-5: Lange offline (Wochen)
- **Was passiert, wenn** Queue wochenlang nicht synced?
- **Lösung**: Kein automatischer Cleanup, Scans bleiben erhalten

### EC-6: Private/Incognito Modus
- **Was passiert, wenn** Browser keinen persistenten Storage erlaubt?
- **Lösung**: Warnung bei App-Start, Offline-Scan disabled

## UI/UX Spezifikation

### Offline Banner
```
┌─────────────────────────────┐
│ 📵 Keine Internetverbindung │
└─────────────────────────────┘
│                             │
│       [Rest der App]        │
│                             │
```

### Offline Scan Success
```
┌─────────────────────────────┐
│                             │
│           ✅                │
│                             │
│   Scan gespeichert!         │
│                             │
│   Wird verarbeitet sobald   │
│   du wieder online bist.    │
│                             │
│   📷 3 Scans in Warteschlange│
│                             │
│  [   Weitere scannen   ]    │
│                             │
└─────────────────────────────┘
```

### Queue-Übersicht
```
┌─────────────────────────────┐
│  Warteschlange (3)      ×   │
├─────────────────────────────┤
│                             │
│  ┌──────────────────────┐   │
│  │ 🖼️ │ 14:32 · Pending │ × │
│  └──────────────────────┘   │
│                             │
│  ┌──────────────────────┐   │
│  │ 🖼️ │ 14:28 · Pending │ × │
│  └──────────────────────┘   │
│                             │
│  ┌──────────────────────┐   │
│  │ 🖼️ │ 13:45 · Fehler  │ ↻ │
│  └──────────────────────┘   │
│                             │
│  [ Alle löschen ]           │
│                             │
└─────────────────────────────┘
```

### Queue Badge auf FAB
```
     ┌───┐
     │ 3 │  ← Badge mit Anzahl
     └───┘
    ┌─────┐
    │  +  │  ← FAB
    └─────┘
```

## Technische Anforderungen

### IndexedDB Schema
```typescript
interface OfflineScan {
  id: string           // UUID
  household_id: string
  image_blob: Blob
  created_at: string   // ISO timestamp
  status: 'pending' | 'uploading' | 'failed'
  retry_count: number
  last_error?: string
}
```

### Service Worker
```typescript
// Background Sync registrieren
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scans') {
    event.waitUntil(syncOfflineScans())
  }
})
```

### React Context
```typescript
const OfflineContext = createContext<{
  isOnline: boolean
  queueCount: number
  syncQueue: () => Promise<void>
}>()
```

### Storage Limits
- Max Queue Size: 50 Scans oder 200MB (was zuerst erreicht wird)
- Pro Scan: ~2-4MB (komprimiertes JPEG)

## Checklist vor Abschluss

- [x] **Fragen gestellt**: Offline-Scope und UX geklärt
- [x] **User Stories komplett**: 4 User Stories definiert
- [x] **Acceptance Criteria konkret**: 8 Kategorien mit testbaren Kriterien
- [x] **Edge Cases identifiziert**: 6 Edge Cases dokumentiert
- [x] **Feature-ID vergeben**: PROJ-12
- [x] **File gespeichert**: `/features/PROJ-12-offline-scan-queue.md`
- [x] **Status gesetzt**: 🔵 Planned
- [x] **User Review**: Approved (02.02.2025)

## Tech-Design (Solution Architect)

### Bestehende Architektur (Wiederverwendung)

**Bereits vorhanden:**
- Service Worker Grundstruktur (aus PROJ-11 PWA Setup)
- Receipt Scanner Komponente (`src/components/receipts/receipt-scanner.tsx`)
- Supabase Client fuer Upload und AI-Verarbeitung
- shadcn/ui Components: Button, Card, Badge, Sheet, Progress, Toast

**Wird erweitert:**
- Service Worker um Background Sync
- Scanner-Flow um Offline-Erkennung

---

### Component-Struktur

```
App-weite Offline-Erkennung
├── Offline-Banner (sticky oben, wenn offline)
│   ├── Offline-Icon
│   ├── Text: "Keine Internetverbindung"
│   └── Verschwindet automatisch wenn online

Scan-Flow (erweitert)
├── Kamera (funktioniert immer, auch offline)
├── Nach Foto-Aufnahme:
│   ├── ONLINE: Normaler Flow (Upload → AI → Editor)
│   └── OFFLINE: Neuer Flow
│       ├── Bild lokal speichern
│       ├── Erfolgs-Meldung anzeigen
│       └── Queue-Badge aktualisieren

Queue-Uebersicht (neues Sheet/Modal)
├── Header: "Warteschlange (X Scans)"
├── Scan-Liste
│   └── Scan-Karte (pro gespeichertem Scan)
│       ├── Thumbnail des Bildes
│       ├── Zeitpunkt der Aufnahme
│       ├── Status: Wartend / Wird hochgeladen / Fehler
│       └── Loeschen-Button
├── "Alle loeschen" Button (mit Bestaetigung)
└── Leerer Zustand: "Keine Scans in Warteschlange"

Queue-Badge (auf FAB oder Navigation)
├── Anzahl wartender Scans
└── Tap oeffnet Queue-Uebersicht

Hintergrund-Synchronisation (unsichtbar)
├── Erkennt wenn Internet zurueck
├── Laedt Scans nacheinander hoch
├── Aktualisiert Status in Queue
└── Loescht erfolgreich verarbeitete Scans
```

---

### Daten-Model (einfach beschrieben)

**Lokal gespeicherte Scans (im Browser):**

Jeder offline Scan speichert:
- Eindeutige ID
- Das fotografierte Bild (als Datei-Blob)
- Aktiver Haushalt zum Zeitpunkt des Scans
- Zeitpunkt der Aufnahme
- Status: Wartend / Wird hochgeladen / Fehlgeschlagen
- Anzahl der Versuche (bei Fehlern)
- Letzte Fehlermeldung (falls vorhanden)

**Speicherort:** IndexedDB im Browser (nicht Supabase!)
- Bleibt erhalten auch wenn App geschlossen wird
- Bis zu 50 Scans oder 200MB (was zuerst erreicht wird)
- Wird automatisch geloescht nach erfolgreichem Upload

**Kein Server-Speicher fuer Queue:**
Die Warteschlange existiert nur lokal. Erst nach erfolgreicher Verarbeitung landen die Daten in Supabase.

---

### Tech-Entscheidungen

| Entscheidung | Begruendung |
|--------------|-------------|
| **IndexedDB fuer Bilder** | Einzige Browser-Technologie die grosse Dateien (Bilder 2-4MB) zuverlaessig speichert. localStorage ist auf 5MB begrenzt. |
| **React Context fuer Online-Status** | Ermoeglicht allen Komponenten Zugriff auf isOnline. Einmal implementiert, ueberall nutzbar. |
| **Background Sync API** | Browser-Standard fuer "sync wenn online". Funktioniert sogar wenn App geschlossen ist (Chrome/Edge). |
| **Sequenzieller Upload** | Nacheinander statt parallel. Verhindert Server-Ueberlastung, einfacher Fortschritt zu zeigen. |
| **Haushalt-ID im Scan speichern** | Falls User offline scannt und spaeter Haushalt wechselt: Scan geht an den richtigen Haushalt. |
| **Kein automatischer Cleanup** | Scans bleiben in Queue bis User online geht. Kein Datenverlust durch Zeitablauf. |

---

### Ablauf der Offline-Synchronisation

```
1. User macht Foto (offline)
   → Bild wird in IndexedDB gespeichert
   → Erfolgs-Nachricht: "Scan gespeichert!"
   → Badge zeigt: "1 Scan wartet"

2. User macht weitere Fotos
   → Jedes wird zur Queue hinzugefuegt
   → Badge aktualisiert: "2", "3", ...

3. Internet kommt zurueck
   → App erkennt "online" Event
   → Background Sync startet automatisch

4. Fuer jeden Scan in der Queue:
   → Status wird "Wird hochgeladen"
   → Bild wird zu Supabase hochgeladen
   → AI verarbeitet das Bild
   → Receipt wird erstellt (im Draft-Status)
   → Bei Erfolg: Scan aus Queue entfernen
   → Bei Fehler: Erneut versuchen (max 3x)

5. Alle Scans verarbeitet
   → Badge verschwindet
   → Toast: "3 Scans wurden verarbeitet"
   → User findet Receipts im Editor/Dashboard
```

---

### Grenzen und Einschraenkungen

| Aspekt | Limit | Begruendung |
|--------|-------|-------------|
| Maximale Queue-Groesse | 50 Scans | Verhindert Speicher-Probleme |
| Maximaler Speicher | 200 MB | Browser-Limits respektieren |
| Retry-Versuche | 3x pro Scan | Nicht endlos bei dauerhaften Fehlern |
| Browser-Support | Moderne Browser | IE11 nicht unterstuetzt |

---

### Dependencies

**Neue Packages:**
| Package | Zweck |
|---------|-------|
| `idb` | Einfache IndexedDB-API (kleiner Wrapper, ~2KB) |

**Bereits vorhanden (keine Installation):**
- Service Worker (aus PROJ-11)
- Supabase Client
- shadcn/ui (Sheet, Badge, Button, Progress, Toast)

---

### Abhaengigkeiten zu anderen Features

| Feature | Beziehung |
|---------|-----------|
| PROJ-4 (Receipt Scanner) | Wird erweitert um Offline-Erkennung |
| PROJ-11 (PWA Setup) | Service Worker wird wiederverwendet |

---

### Risiken und Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Privater Modus blockiert IndexedDB | Mittel | Warnung anzeigen, Offline-Scan deaktivieren |
| Browser-Storage voll | Niedrig | Quota pruefen vor Speichern, Warnung anzeigen |
| Scans nie synchronisiert (User immer offline) | Niedrig | Kein automatischer Cleanup, Daten bleiben |
| AI-Fehler bei alten Scans | Mittel | Receipt trotzdem erstellen, User korrigiert manuell |

---

## Next Steps
1. **User-Review**: Tech-Design durchlesen und approven
2. **Frontend Developer**: IndexedDB + Service Worker + UI implementieren
3. **Integration mit PROJ-4**: Offline-Branch im Scan-Flow

## Anmerkung zur Priorisierung

Dieses Feature hat niedrigere Prioritaet, da:
1. Die meisten Scans passieren zuhause (WLAN)
2. Technisch komplex (Service Worker, IndexedDB)
3. Geringer ROI im Vergleich zu Budget-Management

Empfehlung: Implementieren wenn Core-Features stabil sind.
