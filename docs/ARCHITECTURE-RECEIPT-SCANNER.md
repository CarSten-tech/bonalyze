# Architecture Design Document: Receipt Scanner & AI Extraction

> PROJ-4: Receipt Scanner & AI | PROJ-5: Receipt Editor UI

**Version:** 1.0
**Erstellt:** Januar 2025
**Status:** Zur Review

---

## 1. System-Komponenten-Diagramm

```
+===========================================================================+
|                              CLIENT (PWA)                                  |
|                           Next.js 16 App Router                            |
+===========================================================================+
|                                                                            |
|  +-------------------+    +---------------------+    +------------------+  |
|  |  ReceiptScanner   |    |   ReceiptEditor     |    |  ReceiptList     |  |
|  |  (Kamera/Upload)  |--->|   (AI-Korrektur)    |--->|  (Uebersicht)    |  |
|  +-------------------+    +---------------------+    +------------------+  |
|           |                        |                         |             |
|           v                        v                         v             |
|  +---------------------------------------------------------------------+   |
|  |                    React State / Context                            |   |
|  |  - scanState (idle|uploading|processing|success|error)              |   |
|  |  - draftReceipt (AI-Ergebnis zum Bearbeiten)                        |   |
|  |  - validationErrors                                                 |   |
|  +---------------------------------------------------------------------+   |
|           |                                                                |
+-----------+----------------------------------------------------------------+
            |
            | HTTPS (fetch / Server Actions)
            v
+===========================================================================+
|                         NEXT.JS API ROUTES                                 |
+===========================================================================+
|                                                                            |
|  +---------------------------------------------------------------------+   |
|  | POST /api/receipts/scan                                             |   |
|  |   1. Bild entgegennehmen (multipart/form-data)                      |   |
|  |   2. Bild zu Supabase Storage hochladen                             |   |
|  |   3. Signed URL generieren                                          |   |
|  |   4. Gemini API aufrufen (mit Bild)                                 |   |
|  |   5. AI-Response parsen & validieren (Zod)                          |   |
|  |   6. Merchant/Product Matching                                      |   |
|  |   7. Draft-Receipt zurueckgeben                                     |   |
|  +---------------------------------------------------------------------+   |
|                                                                            |
|  +---------------------------------------------------------------------+   |
|  | POST /api/receipts                                                  |   |
|  |   - Finalen Receipt speichern (nach User-Korrektur)                 |   |
|  +---------------------------------------------------------------------+   |
|                                                                            |
|  +---------------------------------------------------------------------+   |
|  | GET /api/merchants/search?q=...                                     |   |
|  |   - Autocomplete fuer Merchant-Auswahl                              |   |
|  +---------------------------------------------------------------------+   |
|                                                                            |
|  +---------------------------------------------------------------------+   |
|  | GET /api/products/search?q=...                                      |   |
|  |   - Autocomplete fuer Produkt-Matching                              |   |
|  +---------------------------------------------------------------------+   |
|                                                                            |
+===========================================================================+
            |                              |
            v                              v
+------------------------+    +----------------------------------+
|    SUPABASE BACKEND    |    |      GOOGLE GEMINI API           |
+------------------------+    +----------------------------------+
|                        |    |                                  |
|  +------------------+  |    |  Model: gemini-1.5-flash         |
|  | PostgreSQL       |  |    |                                  |
|  | - receipts       |  |    |  Input:                          |
|  | - receipt_items  |  |    |  - Kassenbon-Bild (base64)       |
|  | - merchants      |  |    |  - Strukturierter Prompt         |
|  | - products       |  |    |                                  |
|  | - profiles       |  |    |  Output:                         |
|  | - households     |  |    |  - JSON mit extrahierten Daten   |
|  +------------------+  |    |  - merchant, date, items, total  |
|                        |    |  - confidence score              |
|  +------------------+  |    |                                  |
|  | Supabase Storage |  |    +----------------------------------+
|  | Bucket: receipts |  |
|  | - Kassenbon-Fotos|  |
|  | - Signed URLs    |  |
|  +------------------+  |
|                        |
|  +------------------+  |
|  | Supabase Auth    |  |
|  | - JWT Tokens     |  |
|  | - Session Mgmt   |  |
|  +------------------+  |
|                        |
|  +------------------+  |
|  | Row Level Sec.   |  |
|  | - User kann nur  |  |
|  |   eigene House-  |  |
|  |   hold-Daten     |  |
|  |   sehen          |  |
|  +------------------+  |
|                        |
+------------------------+
```

---

## 2. API Route Spezifikation

### 2.1 POST /api/receipts/scan

**Zweck:** Kassenbon-Bild hochladen und AI-Extraktion durchfuehren

#### Request Schema

```
Content-Type: multipart/form-data

Felder:
- image: File (required)
    - Erlaubte Typen: image/jpeg, image/png, image/webp
    - Max. Groesse: 10 MB
- household_id: string (required)
    - UUID des Haushalts
```

**Zod-Validierung (Request):**
```
ReceiptScanRequestSchema:
  - image: File
      - Validierung: instanceof File
      - Max Size: 10 * 1024 * 1024 (10 MB)
      - Allowed Types: ['image/jpeg', 'image/png', 'image/webp']
  - household_id: string
      - Format: UUID
```

#### Response Schema (Erfolg - 200)

```json
{
  "success": true,
  "data": {
    "draft_id": "uuid-v4",
    "image_url": "https://supabase.co/.../receipts/household_id/timestamp.jpg",
    "ai_result": {
      "merchant": "REWE",
      "date": "2025-01-28",
      "items": [
        {
          "name": "Bio Vollmilch 1L",
          "quantity": 2,
          "unit_price": 1.29,
          "total_price": 2.58,
          "confidence": 0.95
        },
        {
          "name": "Haferflocken 500g",
          "quantity": 1,
          "unit_price": 1.49,
          "total_price": 1.49,
          "confidence": 0.88
        }
      ],
      "subtotal": 4.07,
      "total": 4.07,
      "confidence": 0.92
    },
    "merchant_match": {
      "id": "uuid-or-null",
      "name": "REWE",
      "matched": true,
      "is_new": false
    },
    "product_matches": [
      {
        "ai_name": "Bio Vollmilch 1L",
        "product_id": "uuid-or-null",
        "product_name": "Bio Vollmilch",
        "matched": true,
        "confidence": 0.85
      }
    ]
  }
}
```

**Zod-Validierung (Response):**
```
ReceiptScanResponseSchema:
  - success: boolean
  - data: object
      - draft_id: string (UUID)
      - image_url: string (URL)
      - ai_result: ReceiptAIResultSchema
      - merchant_match: MerchantMatchSchema (optional)
      - product_matches: array of ProductMatchSchema
```

#### Response Schema (Fehler - 400/500)

```json
{
  "success": false,
  "error": {
    "code": "NO_RECEIPT_DETECTED",
    "message": "Das sieht nicht wie ein Kassenbon aus.",
    "details": null
  }
}
```

**Fehler-Codes:**
| Code | HTTP Status | Beschreibung |
|------|-------------|--------------|
| INVALID_IMAGE | 400 | Ungültiges Bildformat oder zu gross |
| NO_RECEIPT_DETECTED | 400 | Kein Kassenbon im Bild erkannt |
| AI_EXTRACTION_FAILED | 500 | AI konnte Daten nicht extrahieren |
| AI_TIMEOUT | 504 | AI-Verarbeitung Timeout (30s) |
| STORAGE_ERROR | 500 | Supabase Storage Upload fehlgeschlagen |
| UNAUTHORIZED | 401 | User nicht eingeloggt |
| FORBIDDEN | 403 | User nicht Mitglied des Haushalts |

---

### 2.2 POST /api/receipts

**Zweck:** Finalen Receipt speichern (nach User-Korrektur)

#### Request Schema

```json
{
  "household_id": "uuid",
  "merchant_id": "uuid-or-null",
  "merchant_name": "REWE",
  "date": "2025-01-28",
  "paid_by": "uuid",
  "image_url": "https://...",
  "items": [
    {
      "product_name": "Bio Vollmilch 1L",
      "product_id": "uuid-or-null",
      "quantity": 2,
      "price_cents": 258
    }
  ],
  "total_amount_cents": 407,
  "ai_confidence": 0.92,
  "ai_raw_response": { ... }
}
```

#### Response Schema (Erfolg - 201)

```json
{
  "success": true,
  "data": {
    "receipt_id": "uuid",
    "created_at": "2025-01-28T14:30:00Z"
  }
}
```

---

## 3. Gemini Integration

### 3.1 Prompt Engineering

#### System Prompt

```
Du bist ein Experte fuer das Lesen und Analysieren deutscher Kassenbons
und Einkaufsbelege. Deine Aufgabe ist es, strukturierte Daten aus
Kassenbon-Fotos zu extrahieren.

Wichtige Regeln:
1. Antworte IMMER und AUSSCHLIESSLICH mit validem JSON
2. Keine Erklaerungen, kein Markdown, nur JSON
3. Bei unlesbaren Feldern: setze null
4. Preise immer als Dezimalzahl (Punkt als Trenner, z.B. 2.58)
5. Rabatte als negative Zahlen
6. Pfand als separater Artikel
7. Datum im ISO-Format: YYYY-MM-DD
```

#### User Prompt Template

```
Analysiere diesen Kassenbon und extrahiere alle Informationen als JSON.

Extrahiere:
1. merchant: Name des Geschaefts (REWE, LIDL, ALDI, etc.)
2. date: Einkaufsdatum (Format: YYYY-MM-DD)
3. items: Array aller Artikel mit:
   - name: Produktname wie gedruckt
   - quantity: Menge (default 1)
   - unit_price: Einzelpreis in Euro
   - total_price: Gesamtpreis fuer Position
   - confidence: Wie sicher du bei diesem Artikel bist (0.0-1.0)
4. subtotal: Zwischensumme (ohne MwSt-Details)
5. total: Endsumme
6. confidence: Gesamte Konfidenz der Extraktion (0.0-1.0)

Antwort-Format:
{
  "merchant": "REWE",
  "date": "2025-01-28",
  "items": [
    {
      "name": "Bio Vollmilch 1L",
      "quantity": 2,
      "unit_price": 1.29,
      "total_price": 2.58,
      "confidence": 0.95
    }
  ],
  "subtotal": 23.47,
  "total": 23.47,
  "confidence": 0.92
}

Sonderfaelle:
- Rabatte: {"name": "Rabatt Coupon", "quantity": 1, "unit_price": -2.00, ...}
- Pfand: {"name": "Pfand Flaschen", "quantity": 6, "unit_price": 0.25, ...}
- Unlesbarer Preis: "unit_price": null, "total_price": null
- Unlesbares Datum: "date": null
```

### 3.2 AI Response Validierung

**Zod Schema fuer AI Response:**

```
ReceiptAIItemSchema:
  - name: string (min 1 Zeichen)
  - quantity: number (default 1, min 0)
  - unit_price: number oder null
  - total_price: number
  - confidence: number (0-1, default 0.5)

ReceiptAIResponseSchema:
  - merchant: string oder null
  - date: string (Regex: YYYY-MM-DD) oder null
  - items: Array von ReceiptAIItemSchema (min 0 Items)
  - subtotal: number oder null
  - total: number
  - confidence: number (0-1, default 0.5)
```

### 3.3 Error Handling

| Fehler-Typ | Erkennung | Behandlung |
|------------|-----------|------------|
| Ungültiges JSON | JSON.parse Fehler | Retry mit vereinfachtem Prompt |
| Schema-Validierung fehlgeschlagen | Zod parse Error | Partial Data + Warning |
| Kein Kassenbon erkannt | confidence < 0.3 oder merchant=null + items=[] | User-Feedback: "Kein Bon erkannt" |
| API Rate Limit | 429 Response | Exponential Backoff Retry |
| API Timeout | Timeout nach 30s | User-Feedback + Retry Option |
| API Auth Fehler | 401/403 Response | Log + Internal Error |

### 3.4 Retry Logic

```
Retry-Strategie:
  - Max Retries: 2
  - Retry Delay: exponential backoff
      - 1. Retry: 1000ms
      - 2. Retry: 2000ms
  - Retry bei:
      - Network Timeout
      - 429 (Rate Limit)
      - 500/502/503 (Server Error)
  - KEIN Retry bei:
      - 400 (Bad Request - Bild ungueltig)
      - 401/403 (Auth Error)
```

**Ablauf:**
```
1. Versuch --> Fehler?
   |             |
   | Erfolg      v
   |         Retry-faehig?
   v             |
Response    Ja   |   Nein
            |    |     |
            v    |     v
        Wait     |  Fehler zurueck
            |    |
            v    |
       Retry 1 --+
            |
            v
       Retry 2 --> Fehler zurueck
```

---

## 4. Supabase Storage Integration

### 4.1 Storage Bucket Konfiguration

```
Bucket: receipts
  - Public: Nein (nur Signed URLs)
  - File Size Limit: 10 MB
  - Allowed MIME Types: image/jpeg, image/png, image/webp
  - RLS: Enabled
```

**RLS Policies fuer Storage:**
```
Policy: "Users can upload to their household folder"
  - Operation: INSERT
  - Check: bucket_id = 'receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )

Policy: "Users can read their household images"
  - Operation: SELECT
  - Check: bucket_id = 'receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
```

### 4.2 Upload Flow

```
+------------------+     +---------------------+     +------------------+
|  Client          |     |  API Route          |     |  Supabase        |
|  (Browser)       |     |  /api/receipts/scan |     |  Storage         |
+------------------+     +---------------------+     +------------------+
        |                         |                         |
        | 1. POST image +         |                         |
        |    household_id         |                         |
        |------------------------>|                         |
        |                         |                         |
        |                         | 2. Resize Image         |
        |                         |    (max 1920px)         |
        |                         |    Compress (80%)       |
        |                         |                         |
        |                         | 3. Generate filename    |
        |                         |    {household_id}/      |
        |                         |    {timestamp}-         |
        |                         |    {uuid}.jpg           |
        |                         |                         |
        |                         | 4. Upload to Storage    |
        |                         |------------------------>|
        |                         |                         |
        |                         | 5. Receive path         |
        |                         |<------------------------|
        |                         |                         |
        |                         | 6. Create Signed URL    |
        |                         |    (Gültigkeit: 1h)     |
        |                         |------------------------>|
        |                         |                         |
        |                         | 7. Receive Signed URL   |
        |                         |<------------------------|
        |                         |                         |
        |                         | 8. Call Gemini API      |
        |                         |    (mit Signed URL)     |
        |                         |                         |
        | 9. Return draft_id +    |                         |
        |    ai_result +          |                         |
        |    image_url            |                         |
        |<------------------------|                         |
        |                         |                         |
```

### 4.3 Signed URLs

```
Konfiguration:
  - Gültigkeit: 3600 Sekunden (1 Stunde)
  - Zweck: Temporärer Zugriff für:
      - Gemini API (Bild-Analyse)
      - Frontend (Vorschau während Bearbeitung)
  - Nach Speichern: Permanente URL in DB speichern
```

**URL-Generierung:**
```
Funktion: createSignedUrl(path, expiresIn)
  Input:
    - path: "{household_id}/{timestamp}-{uuid}.jpg"
    - expiresIn: 3600 (Sekunden)
  Output:
    - signedUrl: "https://{project}.supabase.co/storage/v1/object/sign/..."
```

---

## 5. Frontend Components

### 5.1 Component Hierarchy

```
App (Layout)
|
+-- ReceiptScannerPage (/receipts/new)
    |
    +-- ScanMethodSelector
    |   |
    |   +-- CameraButton ("Foto aufnehmen")
    |   +-- GalleryButton ("Aus Galerie")
    |
    +-- CameraCapture (fullscreen overlay)
    |   |
    |   +-- CameraPreview (Kamera-Feed)
    |   +-- ScanOverlay (Rahmen-Guide)
    |   +-- CaptureButton (Ausloeser)
    |   +-- CancelButton
    |   +-- TipBanner ("Gutes Licht hilft")
    |
    +-- ProcessingState
    |   |
    |   +-- Spinner
    |   +-- ProgressText ("Analysiere Kassenbon...")
    |   +-- ProgressBar (optional)
    |
    +-- ErrorState
    |   |
    |   +-- ErrorIcon
    |   +-- ErrorMessage
    |   +-- RetryButton
    |   +-- CancelButton
    |
    +-- ReceiptEditor (/receipts/edit)
        |
        +-- ReceiptHeader
        |   |
        |   +-- BackButton
        |   +-- Title ("Kassenbon bearbeiten")
        |
        +-- MerchantSelector
        |   |
        |   +-- MerchantDisplay (aktueller Wert)
        |   +-- MerchantAutocomplete (Modal/Dropdown)
        |   +-- AddMerchantDialog
        |
        +-- DateSelector
        |   |
        |   +-- DateDisplay
        |   +-- DatePicker (Calendar Modal)
        |
        +-- PayerSelector
        |   |
        |   +-- PayerDisplay
        |   +-- PayerDropdown (Household Members)
        |
        +-- ItemList
        |   |
        |   +-- ItemCard (wiederholend)
        |   |   |
        |   |   +-- ProductNameInput
        |   |   +-- QuantityInput
        |   |   +-- PriceInput
        |   |   +-- DeleteButton
        |   |   +-- ConfidenceIndicator (gelb bei <0.7)
        |   |
        |   +-- AddItemButton
        |
        +-- TotalSection
        |   |
        |   +-- SubtotalDisplay
        |   +-- TotalDisplay
        |   +-- MismatchWarning (bei Differenz)
        |
        +-- ActionButtons
            |
            +-- SaveButton (primary)
            +-- CancelButton (secondary)
```

### 5.2 State Management

**Scan Flow State:**

```
ScanState (enum):
  - idle: Warte auf User-Aktion
  - selecting: Methode waehlen (Kamera/Galerie)
  - capturing: Kamera aktiv
  - uploading: Bild wird hochgeladen
  - processing: AI analysiert
  - success: Extraktion erfolgreich
  - error: Fehler aufgetreten

ScanContext:
  - state: ScanState
  - error: ScanError oder null
  - progress: number (0-100, optional)
  - imageFile: File oder null
  - actions:
      - startCapture()
      - captureImage(file)
      - retry()
      - cancel()
```

**Draft Receipt State:**

```
DraftReceiptContext:
  - draft: DraftReceipt oder null
  - isDirty: boolean (aenderungen vorhanden)
  - validationErrors: ValidationError[]
  - actions:
      - setDraft(draft)
      - updateMerchant(name, id?)
      - updateDate(date)
      - updatePayer(userId)
      - updateItem(index, changes)
      - addItem()
      - removeItem(index)
      - save()
      - discard()

DraftReceipt:
  - draft_id: string
  - image_url: string
  - merchant_id: string oder null
  - merchant_name: string
  - date: string (YYYY-MM-DD)
  - paid_by: string (user_id)
  - items: DraftItem[]
  - ai_total: number
  - ai_confidence: number

DraftItem:
  - temp_id: string (fuer React key)
  - name: string
  - product_id: string oder null
  - quantity: number
  - unit_price: number
  - total_price: number
  - confidence: number
```

### 5.3 UI States Visualisierung

**Loading State:**
```
+----------------------------------+
|                                  |
|                                  |
|           [Spinner]              |
|                                  |
|    Analysiere Kassenbon...       |
|                                  |
|    [=========>          ] 60%    |
|                                  |
|                                  |
+----------------------------------+
```

**Error State:**
```
+----------------------------------+
|                                  |
|            [!]                   |
|                                  |
|   Kassenbon nicht lesbar         |
|                                  |
|   Das Foto ist zu unscharf       |
|   oder der Kassenbon ist nicht   |
|   vollstaendig sichtbar.         |
|                                  |
|   [  Neues Foto aufnehmen  ]     |
|                                  |
|   [      Abbrechen         ]     |
+----------------------------------+
```

**Success State (Editor):**
```
+----------------------------------+
|  <  Kassenbon bearbeiten         |
+----------------------------------+
|                                  |
|  +----------------------------+  |
|  | [Store] REWE              v|  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | [Kalender] 28.01.2025     v|  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | [Person] Max bezahlt      v|  |
|  +----------------------------+  |
|                                  |
|  -------- Produkte --------      |
|                                  |
|  +----------------------------+  |
|  | Bio Vollmilch 1L           |  |
|  | 2x  1.29 EUR  = 2.58 EUR   |  |
|  |                        [X] |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | [!] Broetchen (unsicher)   |  |
|  | 6x  0.35 EUR  = 2.10 EUR   |  |
|  |                        [X] |  |
|  +----------------------------+  |
|                                  |
|  [  + Produkt hinzufuegen  ]     |
|                                  |
|  -----------------------------   |
|  Zwischensumme:     4.68 EUR     |
|  GESAMT:            4.68 EUR     |
|                                  |
|  [      Speichern      ]         |
|                                  |
+----------------------------------+
```

---

## 6. Sequenzdiagramm: Kompletter Scan-Flow

```
+--------+    +--------+    +--------+    +--------+    +--------+    +--------+
| User   |    | Scanner|    | API    |    | Storage|    | Gemini |    | DB     |
| (App)  |    | (React)|    | Route  |    | Supab. |    | API    |    | Supab. |
+--------+    +--------+    +--------+    +--------+    +--------+    +--------+
    |             |             |             |             |             |
    | 1. Tap "+"  |             |             |             |             |
    |------------>|             |             |             |             |
    |             |             |             |             |             |
    | 2. Waehle   |             |             |             |             |
    |    Kamera   |             |             |             |             |
    |------------>|             |             |             |             |
    |             |             |             |             |             |
    |    3. Kamera|             |             |             |             |
    |<------------|             |             |             |             |
    |    oeffnet  |             |             |             |             |
    |             |             |             |             |             |
    | 4. Foto     |             |             |             |             |
    |    aufnehmen|             |             |             |             |
    |------------>|             |             |             |             |
    |             |             |             |             |             |
    |             | 5. Resize + |             |             |             |
    |             |    Compress |             |             |             |
    |             |------------>|             |             |             |
    |             |             |             |             |             |
    |    "Uploading..."         |             |             |             |
    |<------------|             |             |             |             |
    |             |             |             |             |             |
    |             |             | 6. Upload   |             |             |
    |             |             |    Image    |             |             |
    |             |             |------------>|             |             |
    |             |             |             |             |             |
    |             |             | 7. Path     |             |             |
    |             |             |<------------|             |             |
    |             |             |             |             |             |
    |             |             | 8. Create   |             |             |
    |             |             |    Signed   |             |             |
    |             |             |    URL      |             |             |
    |             |             |------------>|             |             |
    |             |             |             |             |             |
    |             |             | 9. URL      |             |             |
    |             |             |<------------|             |             |
    |             |             |             |             |             |
    |    "Analysiere..."        |             |             |             |
    |<--------------------------|             |             |             |
    |             |             |             |             |             |
    |             |             | 10. Fetch   |             |             |
    |             |             |     Image   |             |             |
    |             |             |------------>|             |             |
    |             |             |             |             |             |
    |             |             | 11. Image   |             |             |
    |             |             |     Data    |             |             |
    |             |             |<------------|             |             |
    |             |             |             |             |             |
    |             |             | 12. Generate|             |             |
    |             |             |     Content |             |             |
    |             |             |     (Prompt |             |             |
    |             |             |     + Image)|             |             |
    |             |             |---------------------------->             |
    |             |             |             |             |             |
    |             |             | 13. JSON    |             |             |
    |             |             |     Response|             |             |
    |             |             |<----------------------------|             |
    |             |             |             |             |             |
    |             |             | 14. Validate|             |             |
    |             |             |     (Zod)   |             |             |
    |             |             |             |             |             |
    |             |             | 15. Match   |             |             |
    |             |             |     Merchant|             |             |
    |             |             |------------------------------------------->
    |             |             |             |             |             |
    |             |             | 16. Merchant|             |             |
    |             |             |     Result  |             |             |
    |             |             |<-------------------------------------------|
    |             |             |             |             |             |
    |             | 17. Draft   |             |             |             |
    |             |     Receipt |             |             |             |
    |             |<------------|             |             |             |
    |             |             |             |             |             |
    | 18. Editor  |             |             |             |             |
    |     Screen  |             |             |             |             |
    |<------------|             |             |             |             |
    |             |             |             |             |             |
    | 19. User    |             |             |             |             |
    |     editiert|             |             |             |             |
    |------------>|             |             |             |             |
    |             |             |             |             |             |
    | 20. "Speichern"           |             |             |             |
    |------------>|             |             |             |             |
    |             |             |             |             |             |
    |             | 21. POST    |             |             |             |
    |             |     /receipts             |             |             |
    |             |------------>|             |             |             |
    |             |             |             |             |             |
    |             |             | 22. Create  |             |             |
    |             |             |     Merchant|             |             |
    |             |             |     (if new)|             |             |
    |             |             |------------------------------------------->
    |             |             |             |             |             |
    |             |             | 23. Create  |             |             |
    |             |             |     Receipt |             |             |
    |             |             |------------------------------------------->
    |             |             |             |             |             |
    |             |             | 24. Create  |             |             |
    |             |             |     Items   |             |             |
    |             |             |------------------------------------------->
    |             |             |             |             |             |
    |             |             | 25. Success |             |             |
    |             |             |<-------------------------------------------|
    |             |             |             |             |             |
    |             | 26. Receipt |             |             |             |
    |             |     ID      |             |             |             |
    |             |<------------|             |             |             |
    |             |             |             |             |             |
    | 27. Redirect|             |             |             |             |
    |     zu Liste|             |             |             |             |
    |<------------|             |             |             |             |
    |             |             |             |             |             |
```

---

## 7. Error Handling Matrix

| Phase | Fehler | Code | User-Message | Aktion |
|-------|--------|------|--------------|--------|
| **Kamera** | Keine Berechtigung | CAM_DENIED | "Kamera-Zugriff verweigert. Bitte in Einstellungen erlauben." | Settings Link |
| **Kamera** | Kamera nicht verfuegbar | CAM_UNAVAIL | "Kamera nicht verfuegbar. Bitte Foto aus Galerie waehlen." | Galerie oeffnen |
| **Upload** | Datei zu gross | FILE_TOO_LARGE | "Bild zu gross. Max. 10 MB erlaubt." | - |
| **Upload** | Falsches Format | INVALID_FORMAT | "Ungültiges Bildformat. Bitte JPEG oder PNG." | - |
| **Upload** | Netzwerk-Fehler | NETWORK_ERROR | "Keine Verbindung. Bitte Internetverbindung prüfen." | Retry Button |
| **Upload** | Storage Fehler | STORAGE_ERROR | "Upload fehlgeschlagen. Bitte erneut versuchen." | Retry Button |
| **AI** | Kein Bon erkannt | NO_RECEIPT | "Das sieht nicht wie ein Kassenbon aus. Bitte Kassenbon fotografieren." | Neues Foto |
| **AI** | Bon nicht lesbar | LOW_QUALITY | "Kassenbon nicht lesbar. Bitte schärferes Foto machen." | Neues Foto |
| **AI** | Timeout (30s) | AI_TIMEOUT | "Verarbeitung dauert zu lange. Bitte erneut versuchen." | Retry Button |
| **AI** | API Error | AI_ERROR | "Fehler bei der Analyse. Bitte erneut versuchen." | Retry Button |
| **AI** | Rate Limit | RATE_LIMIT | "Zu viele Anfragen. Bitte kurz warten." | Auto-Retry |
| **Speichern** | Validierung | VALIDATION | "Bitte alle Pflichtfelder ausfüllen." | Felder markieren |
| **Speichern** | DB Error | SAVE_ERROR | "Speichern fehlgeschlagen. Bitte erneut versuchen." | Retry Button |
| **Auth** | Session abgelaufen | SESSION_EXPIRED | "Sitzung abgelaufen. Bitte erneut anmelden." | Login Redirect |
| **Auth** | Nicht autorisiert | FORBIDDEN | "Keine Berechtigung fuer diesen Haushalt." | Dashboard Redirect |

---

## 8. Performance Considerations

### 8.1 Bild-Optimierung

| Schritt | Methode | Ziel |
|---------|---------|------|
| Client-Side Resize | Canvas API | Max 1920px lange Seite |
| Kompression | JPEG Quality 80% | < 500 KB typisch |
| Format | JPEG (immer) | Beste Kompression fuer Fotos |

**Implementierung:**
```
Funktion: optimizeImage(file)
  1. Lese Bild in Canvas
  2. Berechne neue Dimensionen (max 1920px)
  3. Zeichne skaliertes Bild
  4. Exportiere als JPEG (quality: 0.8)
  5. Konvertiere zu Blob
  Return: optimizedFile
```

### 8.2 API Response Zeiten

| Schritt | Target | Max |
|---------|--------|-----|
| Bild-Upload | < 2s | 5s |
| Gemini API | < 5s | 10s |
| Post-Processing | < 1s | 2s |
| **Gesamt** | **< 8s** | **15s** |

### 8.3 Caching-Strategie

```
Merchant-Liste:
  - Cache: React Query / SWR
  - Stale Time: 5 Minuten
  - Refetch: Bei Focus

Product-Suche:
  - Debounce: 300ms
  - Min. Query Length: 2 Zeichen
  - Cache: Per-Query, 1 Minute

Signed URLs:
  - Gültigkeit: 1 Stunde
  - Kein Client-Cache (URLs sind temporaer)
```

### 8.4 Bundle Size Optimierung

| Package | Verwendung | Lazy Load? |
|---------|------------|------------|
| @google/generative-ai | Server-only | Nein (Server) |
| sharp / Canvas | Image Resize | Server-only |
| react-datepicker | Date Input | Ja |
| Autocomplete | Merchant/Product Search | Ja |

### 8.5 Mobile Performance

```
Optimierungen:
  - Touch-optimierte Buttons (min 44x44px)
  - Skeleton Loading States
  - Optimistic UI Updates
  - Virtualisierte Listen (bei 50+ Items)
  - Lazy Loading fuer Bilder
```

---

## 9. Security Considerations

### 9.1 API Key Handling

```
GEMINI_API_KEY:
  - Nur Server-Side (ENV Variable)
  - Nie im Client Bundle
  - Rotieren bei Kompromittierung

SUPABASE_SERVICE_ROLE_KEY:
  - Nur fuer Admin-Operationen
  - Nie in API Routes (nur fuer Migrations)
```

### 9.2 Input Validation

```
Alle API Routes:
  - Zod Validation fuer Request Body
  - File Type Validation (MIME + Magic Bytes)
  - File Size Limits
  - Rate Limiting pro User

Supabase RLS:
  - User kann nur eigene Household-Daten sehen
  - Storage: Folder-basierte Zugriffskontrolle
```

### 9.3 Datenschutz

```
Kassenbon-Daten:
  - Gespeichert in Supabase (EU-Region)
  - Nur Household-Mitglieder haben Zugriff
  - Bilder: Signed URLs (temporaer)
  - AI Response: Optional speichern fuer Debugging
  - Keine Weitergabe an Dritte

GDPR Compliance:
  - Daten-Export auf Anfrage
  - Daten-Loeschung auf Anfrage
  - Keine automatische Profilerstellung
```

---

## 10. Dependencies

### 10.1 Neue NPM Packages

| Package | Zweck | Version |
|---------|-------|---------|
| @google/generative-ai | Gemini API Client | ^0.21.0 |
| sharp (optional) | Server-side Image Processing | ^0.33.0 |
| zod | Schema Validation | ^3.23.0 |
| uuid | Draft ID Generierung | ^10.0.0 |

### 10.2 Bestehende Infrastruktur (wiederverwendet)

- Supabase Client (`@supabase/ssr`)
- shadcn/ui Components
- Tailwind CSS
- React Hook Form (fuer Editor)
- TypeScript Types (database.types.ts)

---

## 11. Abhaengigkeiten & Voraussetzungen

### Vorausgesetzte Features (must be done first)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| PROJ-1: Database Schema | Done | Tables: receipts, receipt_items, merchants, products |
| PROJ-2: User Authentication | Planned | Login, Session Management |
| PROJ-3: Household Management | Planned | Household erstellen/beitreten |

### Neue Infrastruktur

| Komponente | Beschreibung | Owner |
|------------|--------------|-------|
| Supabase Storage Bucket | "receipts" Bucket konfigurieren | Backend Dev |
| Gemini API Key | Google Cloud Setup | DevOps |
| ENV Variables | GEMINI_API_KEY hinzufuegen | DevOps |

---

## 12. Offene Fragen / Entscheidungen

| Frage | Optionen | Empfehlung | Entscheidung |
|-------|----------|------------|--------------|
| Bild-Resize Location | Client vs. Server | Client (Canvas API) | TBD |
| Camera Library | Native Input vs. react-webcam | Native Input (einfacher) | TBD |
| Merchant Matching | Exact vs. Fuzzy | Fuzzy (Levenshtein) | TBD |
| Draft Persistence | Memory vs. localStorage | Memory (MVP) | TBD |
| AI Response Caching | Ja vs. Nein | Nein (MVP) | TBD |

---

## 13. Implementation Roadmap

### Sprint 1: Fundament (3-4 Tage)
- [ ] Storage Bucket Setup + RLS Policies
- [ ] API Route Grundstruktur
- [ ] Zod Schemas definieren
- [ ] Gemini Client Setup

### Sprint 2: Scan Flow (3-4 Tage)
- [ ] POST /api/receipts/scan implementieren
- [ ] Bild-Upload + Resize
- [ ] Gemini Integration + Prompt
- [ ] Error Handling + Retry Logic

### Sprint 3: Frontend Scanner (2-3 Tage)
- [ ] ReceiptScanner Component
- [ ] Camera/Gallery Selection
- [ ] Processing States
- [ ] Error States

### Sprint 4: Receipt Editor (3-4 Tage)
- [ ] ReceiptEditor Component
- [ ] Merchant Autocomplete
- [ ] Item List + Inline Editing
- [ ] Validation + Save Flow

### Sprint 5: Integration (2 Tage)
- [ ] End-to-End Testing
- [ ] Performance Optimierung
- [ ] Bug Fixes
- [ ] Documentation

---

## Anhang A: Gemini API Konfiguration

```
Model: gemini-1.5-flash
Generation Config:
  - temperature: 0.1 (niedrig fuer konsistente Extraktion)
  - topP: 0.95
  - topK: 40
  - maxOutputTokens: 8192

Safety Settings:
  - HARM_CATEGORY_HARASSMENT: BLOCK_NONE
  - HARM_CATEGORY_HATE_SPEECH: BLOCK_NONE
  - HARM_CATEGORY_SEXUALLY_EXPLICIT: BLOCK_NONE
  - HARM_CATEGORY_DANGEROUS_CONTENT: BLOCK_NONE
  (Kassenbons enthalten keine schaedlichen Inhalte)
```

---

## Anhang B: Supabase Storage Bucket Setup

```
Bucket erstellen:
  Name: receipts
  Public: false
  File Size Limit: 10485760 (10 MB)
  Allowed MIME Types: image/jpeg, image/png, image/webp

RLS Policy (Upload):
  CREATE POLICY "Users can upload to household folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  );

RLS Policy (Read):
  CREATE POLICY "Users can read household images"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT household_id
      FROM household_members
      WHERE user_id = auth.uid()
    )
  );
```

---

*Dokument erstellt von: Solution Architect*
*Review Status: Zur Freigabe*
