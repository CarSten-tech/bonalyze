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

## Edge Cases

### EC-1: Unscharfes Foto
- **Was passiert, wenn** das Foto zu unscharf ist?
- **Lösung**: AI versucht trotzdem, bei niedriger Confidence Warnung anzeigen
- **UI**: "Einige Einträge konnten nicht sicher erkannt werden (markiert)"

### EC-2: Kein Kassenbon im Bild
- **Was passiert, wenn** User etwas anderes fotografiert (z.B. Hand)?
- **Lösung**: Gemini erkennt "kein Kassenbon" und gibt Fehler zurück
- **UI**: "Das sieht nicht wie ein Kassenbon aus. Bitte Kassenbon fotografieren."

### EC-3: Langer Kassenbon
- **Was passiert, wenn** der Bon nicht auf ein Foto passt?
- **Lösung**: MVP: User muss scrollen/zoomen für besten Ausschnitt
- **Future**: Multi-Foto-Scan mit Merge

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

### EC-7: Duplikat-Erkennung
- **Was passiert, wenn** User denselben Bon zweimal scannt?
- **Lösung (MVP)**: Kein Check, User muss selbst aufpassen
- **Future**: Hash-basierte Duplikat-Warnung

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
- [x] **User Stories komplett**: 4 User Stories definiert
- [x] **Acceptance Criteria konkret**: 6 Kategorien mit testbaren Kriterien
- [x] **Edge Cases identifiziert**: 8 Edge Cases dokumentiert
- [x] **Feature-ID vergeben**: PROJ-4
- [x] **File gespeichert**: `/features/PROJ-4-receipt-scanner-ai.md`
- [x] **Status gesetzt**: 🔵 Planned
- [ ] **User Review**: Warte auf User-Approval

## Next Steps
1. **User-Review**: Spec durchlesen und approven
2. **Backend Developer**: API Route + Gemini Integration
3. **Frontend Developer**: Kamera UI + Loading States
4. **Danach**: PROJ-5 (Receipt Editor UI)
