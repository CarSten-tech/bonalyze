# PROJ-4: Receipt Scanner & AI Extraction

## Status: 🔵 Planned

## Übersicht
Kern-Feature von Bonalyze: User fotografiert Kassenbon, Gemini Flash 1.5 extrahiert strukturierte Daten (Store, Datum, Items, Preise). Das Ergebnis wird zur Korrektur angezeigt (PROJ-5) und dann gespeichert.

## Abhängigkeiten
- Benötigt: PROJ-1 (Database Schema) - für `receipts`, `receipt_items`, `merchants`, `products`
- Benötigt: PROJ-2 (User Authentication) - User muss eingeloggt sein
- Benötigt: PROJ-3 (Household Management) - Receipt wird einem Haushalt zugeordnet

## User Stories

### US-1: Kassenbon fotografieren
- Als **User** möchte ich **einen Kassenbon mit der Kamera fotografieren**, um **ihn zu erfassen**
- Als **User** möchte ich **ein Foto aus der Galerie wählen**, um **bereits gemachte Fotos zu nutzen**

### US-2: AI-Extraktion
- Als **User** möchte ich **dass die App den Bon automatisch analysiert**, um **nicht alles manuell eintippen zu müssen**
- Als **User** möchte ich **den erkannten Store sehen** (REWE, LIDL, etc.), um **zu prüfen ob es stimmt**
- Als **User** möchte ich **alle erkannten Produkte mit Preisen sehen**, um **Fehler erkennen zu können**

### US-3: AI-Verarbeitung Feedback
- Als **User** möchte ich **einen Loading-State sehen** während die AI arbeitet, um **zu wissen dass etwas passiert**
- Als **User** möchte ich **bei Fehlern eine klare Meldung bekommen**, um **zu verstehen was schiefging**

### US-4: Foto-Qualität
- Als **User** möchte ich **Hinweise zur Foto-Qualität bekommen**, um **bessere Scans zu machen**
- Als **User** möchte ich **das Foto neu aufnehmen können**, wenn **es unscharf ist**

### US-5: Multi-Foto-Scan (NEU)
- Als **User** möchte ich **lange Kassenbons in mehreren Fotos erfassen**, um **den kompletten Bon zu digitalisieren**
- Als **User** möchte ich **sehen dass mehrere Fotos zusammengeführt werden**, um **zu verstehen was passiert**
- Als **User** möchte ich **einzelne Fotos aus dem Multi-Scan entfernen können**, wenn **eines unscharf ist**

### US-6: Duplikat-Warnung (NEU)
- Als **User** möchte ich **gewarnt werden wenn ich einen Bon doppelt scanne**, um **Duplikate zu vermeiden**
- Als **User** möchte ich **die Warnung ignorieren können**, wenn **es tatsächlich zwei separate Bons sind**

## Acceptance Criteria

### AC-1: Kamera-Integration
- [ ] "+" FAB-Button öffnet Kamera oder Galerie-Auswahl
- [ ] Kamera-Vorschau zeigt Overlay-Rahmen für Bon-Positionierung
- [ ] Autofokus auf Bon-Bereich
- [ ] Foto-Aufnahme mit Tap auf Auslöser
- [ ] "Galerie" Option für existierende Fotos
- [ ] Kamera-Permission wird beim ersten Mal angefragt

### AC-2: Bild-Verarbeitung
- [ ] Foto wird auf max. 1920px lange Seite resized (Qualität erhalten)
- [ ] JPEG-Kompression (Quality 80%)
- [ ] Bild wird zu Supabase Storage hochgeladen
- [ ] Signierte URL wird für Gemini-Request verwendet
- [ ] Original-Foto wird für spätere Referenz gespeichert

### AC-3: Gemini AI Integration
- [ ] API-Call zu Gemini Flash 1.5 mit Bild
- [ ] Strukturierter Prompt für konsistentes Output
- [ ] Response-Parsing mit Zod-Validierung
- [ ] Timeout nach 30 Sekunden
- [ ] Retry-Logic bei temporären Fehlern (max. 2 Retries)

### AC-4: AI Output Format
- [ ] Store/Merchant Name extrahiert
- [ ] Datum extrahiert (ISO 8601)
- [ ] Line Items: Produktname, Menge, Einzelpreis, Gesamtpreis
- [ ] Gesamtsumme extrahiert
- [ ] Confidence Score pro Feld (wenn verfügbar)

### AC-5: Loading & Feedback
- [ ] Loading-State mit Animation während AI-Verarbeitung
- [ ] Fortschritts-Hinweis: "Analysiere Kassenbon..."
- [ ] Erfolg: Weiterleitung zu Receipt Editor (PROJ-5)
- [ ] Fehler: Klare Meldung + "Erneut versuchen" Button

### AC-6: Fehler-Handling
- [ ] Kein Text erkannt → "Kassenbon nicht lesbar. Bitte neues Foto."
- [ ] API-Fehler → "Verbindungsfehler. Bitte erneut versuchen."
- [ ] Timeout → "Verarbeitung dauert zu lange. Bitte erneut versuchen."
- [ ] Leeres Bild → Validierung vor Upload

### AC-7: Multi-Foto-Scan (NEU)
- [ ] "Weiteres Foto hinzufügen" Button nach erstem Scan
- [ ] Alle Fotos werden als Batch an Gemini gesendet
- [ ] AI erhält erweiterten Prompt: "Diese Bilder zeigen denselben Kassenbon"
- [ ] AI merged die Daten intelligent (keine Duplikate, richtige Reihenfolge)
- [ ] Vorschau zeigt Thumbnails aller Fotos
- [ ] Einzelne Fotos können per Swipe/X entfernt werden
- [ ] Maximum: 5 Fotos pro Bon (Kostenschutz)
- [ ] Loading-State zeigt: "Analysiere 3 Bilder..."

### AC-8: Duplikat-Erkennung (NEU)
- [ ] Vor dem Speichern: Check auf bestehende Bons mit gleichem Store + Datum + Total (±5%)
- [ ] Warnung-Dialog bei potenziellem Duplikat: "Ähnlicher Bon gefunden"
- [ ] Dialog zeigt: Datum, Store, Betrag des existierenden Bons
- [ ] User-Optionen: "Trotzdem speichern" oder "Abbrechen"
- [ ] Bei "Trotzdem speichern": Normal fortfahren
- [ ] Check passiert server-side (Supabase Query)

## Edge Cases

### EC-1: Unscharfes Foto
- **Was passiert, wenn** das Foto zu unscharf ist?
- **Lösung**: AI versucht trotzdem, bei niedriger Confidence Warnung anzeigen
- **UI**: "Einige Einträge konnten nicht sicher erkannt werden (markiert)"

### EC-2: Kein Kassenbon im Bild
- **Was passiert, wenn** User etwas anderes fotografiert (z.B. Hand)?
- **Lösung**: Gemini erkennt "kein Kassenbon" und gibt Fehler zurück
- **UI**: "Das sieht nicht wie ein Kassenbon aus. Bitte Kassenbon fotografieren."

### EC-3: Langer Kassenbon (Multi-Foto-Scan) ✅ ERWEITERT
- **Was passiert, wenn** der Bon nicht auf ein Foto passt?
- **Lösung**: Multi-Foto-Scan mit AI-Merge (siehe US-5 und AC-7)

### EC-4: Fremdsprache auf Bon
- **Was passiert, wenn** der Bon in anderer Sprache ist (Urlaub)?
- **Lösung**: Gemini ist multilingual, sollte funktionieren
- **UI**: Keine spezielle Behandlung im MVP

### EC-5: Handgeschriebene Bons
- **Was passiert, wenn** ein handgeschriebener Beleg eingescannt wird?
- **Lösung**: AI versucht es, wahrscheinlich niedrige Confidence
- **UI**: "Handschrift schwer lesbar. Bitte manuell korrigieren."

### EC-6: Rabatte & Sonderposten
- **Was passiert, wenn** der Bon Rabatte, Coupons, Pfand enthält?
- **Lösung**: Als separate Line Items erfassen
- **Prompt**: "Erfasse auch Rabatte und Pfand als separate Positionen"

### EC-7: Duplikat-Erkennung ✅ IMPLEMENTIERT
- **Was passiert, wenn** User denselben Bon zweimal scannt?
- **Lösung**: Check auf Store + Datum + Total (±5%) vor Speichern
- **UI**: Warnung-Dialog mit Option "Trotzdem speichern" oder "Abbrechen"

### EC-8: Network-Fehler während Upload
- **Was passiert, wenn** die Verbindung während des Uploads abbricht?
- **Lösung**: Fehler-Handling mit "Erneut versuchen"
- **Future**: Offline-Queue

## Technische Anforderungen

### Performance
- Kamera-Öffnung: < 1 Sekunde
- Bild-Upload: < 3 Sekunden (je nach Verbindung)
- AI-Extraktion: < 10 Sekunden (typisch 3-5s)
- Gesamter Scan-Flow: < 15 Sekunden

### AI-Kosten
- Gemini Flash 1.5: ~$0.00025 pro Bild
- Budget: ~$1/Monat für Family-Use (4000 Scans)

### Security
- GEMINI_API_KEY nur Server-side (ENV Variable)
- Bild-URLs sind signiert und temporär (1h)
- Keine sensiblen Daten in Client-Side Logs

## Gemini Prompt Spezifikation

### System Prompt
```
Du bist ein Experte für das Lesen deutscher Kassenbons. Analysiere das Bild und extrahiere alle relevanten Informationen.
```

### User Prompt
```
Analysiere diesen Kassenbon und extrahiere folgende Informationen als JSON:

1. Store/Geschäft Name
2. Datum des Einkaufs (Format: YYYY-MM-DD)
3. Alle Artikel mit:
   - Produktname (wie auf Bon gedruckt)
   - Menge (default: 1)
   - Einzelpreis in Euro
   - Gesamtpreis für diese Position
4. Gesamtsumme des Einkaufs

Antworte NUR mit validem JSON in diesem Format:
{
  "merchant": "REWE",
  "date": "2025-01-28",
  "items": [
    {
      "name": "Bio Vollmilch 1L",
      "quantity": 2,
      "unit_price": 1.29,
      "total_price": 2.58
    }
  ],
  "subtotal": 23.47,
  "total": 23.47,
  "confidence": 0.92
}

Regeln:
- Wenn etwas nicht lesbar ist, setze null
- Preise immer als Dezimalzahl (z.B. 2.58, nicht "2,58")
- Bei Rabatten: Negativer Preis
- Bei Pfand: Als separater Artikel
- confidence: Schätzung 0-1 wie sicher du bist
```

### Multi-Foto Prompt (NEU)
```
Analysiere diese [N] Bilder desselben Kassenbons. Die Bilder zeigen verschiedene Abschnitte eines langen Bons.

WICHTIG:
1. Erkenne überlappende Bereiche und vermeide Duplikate
2. Sortiere Items in der richtigen Reihenfolge (wie auf dem Bon)
3. Der Header (Store, Datum) ist typisch auf dem ersten Bild
4. Die Summe ist typisch auf dem letzten Bild
5. Merged die Items aus allen Bildern

Antworte NUR mit validem JSON im gleichen Format wie oben, plus:
{
  ...
  "images_processed": 3,
  "merge_confidence": 0.85
}
```

### Response Schema (Zod)
```typescript
const ReceiptAIResponseSchema = z.object({
  merchant: z.string().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().default(1),
    unit_price: z.number().nullable(),
    total_price: z.number()
  })),
  subtotal: z.number().nullable(),
  total: z.number(),
  confidence: z.number().min(0).max(1).default(0.5)
})
```

## API Design

### POST /api/receipts/scan
```typescript
// Request
Content-Type: multipart/form-data
Body: {
  image: File,
  household_id: string
}

// Response 200
{
  "success": true,
  "data": {
    "draft_id": "uuid",
    "image_url": "https://...",
    "ai_result": {
      "merchant": "REWE",
      "date": "2025-01-28",
      "items": [...],
      "total": 23.47,
      "confidence": 0.92
    },
    "merchant_match": {
      "id": "uuid",
      "name": "REWE",
      "matched": true
    },
    "product_matches": [...]
  }
}

// Response 400
{
  "success": false,
  "error": "NO_RECEIPT_DETECTED",
  "message": "Das sieht nicht wie ein Kassenbon aus."
}
```

### POST /api/receipts/scan-multi (NEU)
```typescript
// Request - Multi-Foto-Scan
Content-Type: multipart/form-data
Body: {
  images: File[],        // 2-5 Bilder
  household_id: string
}

// Response 200
{
  "success": true,
  "data": {
    "draft_id": "uuid",
    "image_urls": ["https://...", "https://..."],
    "ai_result": {
      "merchant": "REWE",
      "date": "2025-01-28",
      "items": [...],      // Merged items from all images
      "total": 123.47,
      "confidence": 0.88,
      "images_processed": 3
    }
  }
}
```

### POST /api/receipts/check-duplicate (NEU)
```typescript
// Request - Duplikat-Check
{
  "household_id": "uuid",
  "merchant_name": "REWE",
  "date": "2025-01-28",
  "total_cents": 4732
}

// Response 200 - Potentielles Duplikat gefunden
{
  "is_duplicate": true,
  "existing_receipt": {
    "id": "uuid",
    "merchant_name": "REWE",
    "date": "2025-01-28",
    "total_cents": 4732,
    "scanned_at": "2025-01-28T14:30:00Z"
  }
}

// Response 200 - Kein Duplikat
{
  "is_duplicate": false,
  "existing_receipt": null
}
```

## UI/UX Spezifikation

### Screens

#### 1. Scan-Auswahl (Modal/Sheet)
```
┌─────────────────────────────┐
│     Kassenbon erfassen      │
│                             │
│  ┌─────────────────────┐    │
│  │  📷 Foto aufnehmen  │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │  🖼️ Aus Galerie     │    │
│  └─────────────────────┘    │
│                             │
│  [     Abbrechen      ]     │
└─────────────────────────────┘
```

#### 2. Kamera-Vorschau
```
┌─────────────────────────────┐
│  ×                          │
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │    Kassenbon hier   │    │
│  │    positionieren    │    │
│  │                     │    │
│  │    ┌───────────┐    │    │
│  │    │           │    │    │
│  │    │  [BON]    │    │    │
│  │    │           │    │    │
│  │    └───────────┘    │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│        [ ◉ ]                │
│                             │
│  💡 Tipp: Gutes Licht hilft │
└─────────────────────────────┘
```

#### 3. Processing State
```
┌─────────────────────────────┐
│                             │
│                             │
│                             │
│         [Spinner]           │
│                             │
│    Analysiere Kassenbon...  │
│                             │
│    🧾 ━━━━━━━━━░░░░ 60%     │
│                             │
│                             │
│                             │
└─────────────────────────────┘
```

#### 4. Fehler-State
```
┌─────────────────────────────┐
│                             │
│           ⚠️                │
│                             │
│   Kassenbon nicht lesbar    │
│                             │
│   Das Foto ist zu unscharf  │
│   oder der Kassenbon ist    │
│   nicht vollständig         │
│   sichtbar.                 │
│                             │
│  [ Neues Foto aufnehmen ]   │
│                             │
│  [     Abbrechen      ]     │
└─────────────────────────────┘
```

#### 5. Multi-Foto Vorschau (NEU)
```
┌─────────────────────────────┐
│  ×          Multi-Scan      │
├─────────────────────────────┤
│                             │
│  Fotos für diesen Bon:      │
│                             │
│  ┌─────┐ ┌─────┐ ┌─────┐    │
│  │ 📷1 │ │ 📷2 │ │ +   │    │
│  │  ×  │ │  ×  │ │ Foto│    │
│  └─────┘ └─────┘ └─────┘    │
│                             │
│  💡 Max. 5 Fotos            │
│                             │
│  [ Alle analysieren → ]     │
│                             │
└─────────────────────────────┘
```

#### 6. Duplikat-Warnung Dialog (NEU)
```
┌─────────────────────────────┐
│                             │
│           ⚠️                │
│                             │
│   Ähnlicher Bon gefunden    │
│                             │
│  ┌───────────────────────┐  │
│  │ REWE · 28.01.2025     │  │
│  │ €47,32                │  │
│  │ Vor 2 Stunden gescannt│  │
│  └───────────────────────┘  │
│                             │
│   Ist das ein Duplikat?     │
│                             │
│  [ Trotzdem speichern ]     │
│                             │
│  [     Abbrechen      ]     │
└─────────────────────────────┘
```

## Implementation Notes

### Kamera-Integration (React)
```typescript
// Optionen:
// 1. Native <input type="file" accept="image/*" capture="environment">
// 2. react-webcam für mehr Kontrolle
// 3. MediaDevices API für Custom UI

// Empfehlung für MVP: Native Input (einfachste Lösung)
<input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handleImageCapture}
/>
```

### Supabase Storage Upload
```typescript
const uploadReceiptImage = async (file: File, householdId: string) => {
  const fileName = `${householdId}/${Date.now()}-receipt.jpg`

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(fileName, file, {
      contentType: 'image/jpeg',
      cacheControl: '3600'
    })

  if (error) throw error

  const { data: { signedUrl } } = await supabase.storage
    .from('receipts')
    .createSignedUrl(fileName, 3600) // 1h valid

  return { path: data.path, signedUrl }
}
```

### Gemini API Call (Server-side)
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function extractReceiptData(imageUrl: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

  // Fetch image as base64
  const imageResponse = await fetch(imageUrl)
  const imageBuffer = await imageResponse.arrayBuffer()
  const base64Image = Buffer.from(imageBuffer).toString('base64')

  const result = await model.generateContent([
    RECEIPT_PROMPT,
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image
      }
    }
  ])

  const text = result.response.text()
  const json = JSON.parse(text)

  return ReceiptAIResponseSchema.parse(json)
}
```

## Checklist vor Abschluss

- [x] **Fragen gestellt**: AI-Flow (Foto + Korrektur) geklärt
- [x] **User Stories komplett**: 6 User Stories definiert (inkl. Multi-Foto + Duplikat)
- [x] **Acceptance Criteria konkret**: 8 Kategorien mit testbaren Kriterien
- [x] **Edge Cases identifiziert**: 8 Edge Cases dokumentiert (EC-3, EC-7 jetzt implementiert)
- [x] **Feature-ID vergeben**: PROJ-4
- [x] **File gespeichert**: `/features/PROJ-4-receipt-scanner-ai.md`
- [x] **Status gesetzt**: 🔵 Planned
- [x] **User Review**: Approved (02.02.2025)

## Changelog

### v1.1 (02.02.2025)
- ✅ **NEU**: US-5 Multi-Foto-Scan (lange Kassenbons in mehreren Fotos)
- ✅ **NEU**: US-6 Duplikat-Warnung (Store + Datum + Total Check)
- ✅ **NEU**: AC-7 Multi-Foto-Scan Acceptance Criteria
- ✅ **NEU**: AC-8 Duplikat-Erkennung Acceptance Criteria
- ✅ **NEU**: API Endpoints `/api/receipts/scan-multi` und `/api/receipts/check-duplicate`
- ✅ **NEU**: Multi-Foto Gemini Prompt
- ✅ **NEU**: UI Screens für Multi-Foto Vorschau und Duplikat-Dialog
- ✅ **UPDATED**: EC-3 und EC-7 von "Future" zu "Implementiert"

## Next Steps
1. **User-Review**: Spec durchlesen und approven
2. **Backend Developer**: API Route + Gemini Integration
3. **Frontend Developer**: Kamera UI + Loading States
4. **Danach**: PROJ-5 (Receipt Editor UI)
