import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@/lib/supabase-server'
import { ReceiptAIResponseSchema } from '@/types/receipt-ai'

const RECEIPT_PROMPT = `
ROLE:
Du bist ein hochspezialisiertes KI-System für die Analyse deutscher Kassenbons (OCR-Correction & Semantic Extraction). Deine Aufgabe ist es, aus rohen, fehlerhaften Textdaten strukturierte, analytisch wertvolle Datensätze zu erstellen.

INPUT CONTEXT:
Du erhältst OCR-Text oder Bilddaten eines deutschen Kassenbons (Rewe, Lidl, dm, etc.). Die Daten sind oft unvollständig, enthalten Tippfehler ("land1" statt "Landliebe") oder Abkürzungen ("KFav").

INSTRUCTIONS:

1. **ANALYSE & KORREKTUR (Mental Step)**:
   - Identifiziere den Händler und das Datum/Uhrzeit zuerst.
   - Gehe Zeile für Zeile durch. Suche nach Mustern wie "Menge x Preis".
   - KORRIGIERE OCR-Fehler aggressiv basierend auf deutschem Supermarkt-Kontext:
     - "Spargel dl" -> "Spargel dtsch."
     - "Bio Gurken Stck" -> "Bio Gurken Stück"
     - "KFav." -> "Kaufland Favorites"
     - "Land1." -> "Landliebe"
   - Löse Abkürzungen auf, damit die Suche später funktioniert.

2. **EXTRAKTION & LOGIK**:
   - **Mengen**: Suche explizit nach Multiplikatoren ("2 x", "3 Stk"). Wenn nichts steht, ist Menge = 1.
   - **Preise**: Preise sind immer positiv. Rabatte ("-0,50") müssen entweder vom Artikelpreis abgezogen oder als negativer "Discount"-Artikel gelistet werden.
   - **Pfand**: Pfand ("Leergut", "Pfand") gehört NICHT in die Artikelliste "items", sondern in das Feld "amounts.deposit".
   - **Health-Tags**: Analysiere den Produktnamen auf Gesundheits-Indikatoren. Setze Tags: "bio", "vegan", "sugar_free", "processed" (für Fertigessen), "alcohol".

3. **KATEGORISIERUNG**:
   - Ordne JEDEN Artikel einer Haupt- und Unterkategorie zu.
   - Nutze "Elektro & Technik" für ALLE Geräte (wichtig für Garantie!).
   - Nutze "Pfand & Leergut" nur, wenn es nicht in "amounts.deposit" verschoben werden kann.

4. **WARRANTY CHECK**:
   - Setze "is_warranty_candidate": true NUR für langlebige Non-Food Artikel > 10€ (Elektronik, Pfannen, Werkzeug).

5. **NUTRITION ESTIMATION (Nur fuer Lebensmittel)**:
   - Schaetze fuer JEDEN Lebensmittel-Artikel:
     - "estimated_calories_kcal": Gesamtkalorien fuer die gekaufte Menge (Nettofuellmenge * kcal pro 100g / 100). Beispiel: 500g Magerquark mit ~66kcal/100g = 330 kcal.
     - "estimated_weight_g": Geschaetzte Nettofuellmenge in Gramm (z.B. "500g Magerquark" -> 500, "1L Milch" -> 1030, "6 Eier" -> 360)
     - "estimated_protein_g": Geschaetzte Protein-Gramm gesamt
     - "estimated_carbs_g": Geschaetzte Kohlenhydrate-Gramm gesamt
     - "estimated_fat_g": Geschaetztes Fett-Gramm gesamt
     - "is_food_item": true fuer Lebensmittel/Getraenke, false fuer Non-Food (Putzmittel, Toilettenpapier, Zeitschriften, etc.)
   - Nutze allgemeines Ernaehrungswissen fuer typische deutsche Supermarkt-Produkte.
   - Bei Unklarheit (z.B. Markenprodukt ohne Gewichtsangabe) schaetze konservativ basierend auf typischer Packungsgroesse.
   - Fuer Non-Food Artikel: Alle Nutrition-Werte auf 0 und is_food_item auf false.

JSON OUTPUT STRUCTURE (Strict):
{
  "merchant": "String (Korrigierter Name, z.B. 'Rewe City')",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (oder null)",
  "items": [
    {
      "name": "String (Sauberer, lesbarer Produktname)",
      "raw_name": "String (Original OCR Text für Debugging)",
      "quantity": Number (Integer oder Decimal),
      "unit_price": Number (Einzelpreis),
      "total_price": Number (Zeilensumme),
      "category": "String (Hauptkategorie)",
      "subcategory": "String (Unterkategorie)",
      "tags": ["String", "String"], // z.B. ["bio", "vegetarisch"]
      "is_warranty_candidate": Boolean,
      "estimated_calories_kcal": Number, // Gesamtkalorien fuer gekaufte Menge (0 fuer Non-Food)
      "estimated_weight_g": Number, // Nettofuellmenge in Gramm (0 fuer Non-Food)
      "estimated_protein_g": Number, // Protein gesamt in Gramm
      "estimated_carbs_g": Number, // Kohlenhydrate gesamt in Gramm
      "estimated_fat_g": Number, // Fett gesamt in Gramm
      "is_food_item": Boolean // true = Lebensmittel, false = Non-Food
    }
  ],
  "amounts": {
    "total": Number (Endsumme Bon),
    "tax": Number (MwSt Summe),
    "deposit": Number (Summe aller Pfand-Zeilen, positiv)
  },
  "meta": {
    "confidence": Number (0.0 - 1.0),
    "health_score_impact": String ("positive" | "neutral" | "negative") // Schätzung für den ganzen Einkauf
  }
}

CATEGORIES (Nutze nur diese):
- Lebensmittel (Obst & Gemüse, Brot & Backwaren, Milch & Eier, Fleisch & Fisch, Getränke, Alkohol & Tabak, Süß & Salzig, Fertiggerichte, Grundnahrungsmittel)
- Drogerie (Körperpflege, Haushalt & Putzen, Gesundheit, Baby, Tier)
- Home & Living (Küche, Technik, Wohnen, Garten, Büro)
- Fashion (Kleidung, Schuhe)
- Mobilität (Tanken, Ticket)
- Sonstiges

WICHTIG: Antworte NUR mit dem JSON. Kein Markdown, kein Text.
`;

export async function POST(request: NextRequest) {
  const debug: Record<string, unknown> = { timestamp: new Date().toISOString() }

  try {
    // Check for Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY
    debug.hasGeminiKey = !!geminiApiKey
    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: 'MISSING_API_KEY', message: 'Gemini API key nicht konfiguriert', debug },
        { status: 500 }
      )
    }

    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    debug.userId = user?.id || null
    debug.authError = authError?.message || null

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Nicht eingeloggt', debug },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const image = formData.get('image') as File | null
    const householdId = formData.get('household_id') as string | null

    debug.hasImage = !!image
    debug.imageType = image?.type || null
    debug.imageSize = image?.size || null
    debug.imageName = image?.name || null
    debug.householdId = householdId

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'NO_IMAGE', message: 'Kein Bild hochgeladen', debug },
        { status: 400 }
      )
    }

    if (!householdId) {
      return NextResponse.json(
        { success: false, error: 'NO_HOUSEHOLD', message: 'Kein Haushalt angegeben', debug },
        { status: 400 }
      )
    }

    // Verify user is member of household
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single()

    debug.hasMembership = !!membership
    debug.membershipError = membershipError?.message || null

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'NOT_MEMBER', message: 'Kein Zugriff auf diesen Haushalt', debug },
        { status: 403 }
      )
    }

    // Upload image to Supabase Storage
    const mimeType = image.type || 'image/jpeg'
    const extension = mimeType.split('/')[1]?.replace('heif', 'heic') || 'jpg'
    const fileName = `${householdId}/${Date.now()}-receipt.${extension}`
    debug.fileName = fileName
    debug.mimeType = mimeType
    debug.extension = extension

    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    debug.bufferSize = buffer.length

    console.log('[SCAN DEBUG] Before upload:', JSON.stringify(debug, null, 2))

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
      })

    debug.uploadSuccess = !!uploadData
    debug.uploadError = uploadError ? { message: uploadError.message, name: uploadError.name, cause: uploadError.cause } : null
    debug.uploadPath = uploadData?.path || null

    console.log('[SCAN DEBUG] After upload:', JSON.stringify({ uploadSuccess: debug.uploadSuccess, uploadError: debug.uploadError }, null, 2))

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'UPLOAD_FAILED', message: 'Bild konnte nicht hochgeladen werden', debug },
        { status: 500 }
      )
    }

    // Get signed URL for Gemini (valid for 1 hour)
    const { data: signedUrlData } = await supabase.storage
      .from('receipts')
      .createSignedUrl(uploadData.path, 3600)

    if (!signedUrlData?.signedUrl) {
      return NextResponse.json(
        { success: false, error: 'URL_FAILED', message: 'Konnte keine URL für das Bild erstellen' },
        { status: 500 }
      )
    }

    // Call Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    // Convert image to base64 for Gemini
    const base64Image = buffer.toString('base64')

    const result = await model.generateContent([
      RECEIPT_PROMPT,
      {
        inlineData: {
          mimeType: image.type || 'image/jpeg',
          data: base64Image,
        },
      },
    ])

    const responseText = result.response.text()

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    // Parse and validate response
    let aiResult
    try {
      const parsed = JSON.parse(jsonText)
      aiResult = ReceiptAIResponseSchema.parse(parsed)
    } catch (parseError) {
      console.error('AI Parse error:', parseError)
      console.log('Raw AI Response:', responseText)
      
      const debugInfo = {
         error: parseError instanceof Error ? parseError.message : String(parseError),
         rawResponse: responseText,
         parsedJson: jsonText
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'PARSE_FAILED',
          message: 'Kassenbon konnte nicht analysiert werden. (Format-Fehler)',
          debug: debugInfo
        },
        { status: 422 }
      )
    }

    // Check if it looks like a receipt
    if (!aiResult.items || aiResult.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_RECEIPT_DETECTED',
          message: 'Das sieht nicht wie ein Kassenbon aus. Bitte einen Kassenbon fotografieren.',
        },
        { status: 400 }
      )
    }

    // Try to match merchant
    let merchantMatch = undefined
    if (aiResult.merchant) {
      const { data: existingMerchant } = await supabase
        .from('merchants')
        .select('id, name')
        .ilike('name', `%${aiResult.merchant}%`)
        .limit(1)
        .single()

      if (existingMerchant) {
        merchantMatch = {
          id: existingMerchant.id,
          name: existingMerchant.name,
          matched: true,
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        image_path: uploadData.path,
        ai_result: aiResult,
        merchant_match: merchantMatch,
      },
    })
  } catch (error) {
    console.error('Scan error:', error)
    const errorInfo = error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack?.split('\n').slice(0, 5) }
      : { raw: String(error) }
    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.',
        debug: { ...debug, errorInfo },
      },
      { status: 500 }
    )
  }
}
