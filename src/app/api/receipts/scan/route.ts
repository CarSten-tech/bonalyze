import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@/lib/supabase-server'
import { ReceiptAIResponseSchema } from '@/types/receipt-ai'

const RECEIPT_PROMPT = `Du bist ein Experte für das Lesen deutscher Kassenbons und die Kategorisierung von Produkten.

Analysiere diesen Kassenbon und extrahiere folgende Informationen als JSON:

1. Store/Geschäft Name
2. Datum des Einkaufs (Format: YYYY-MM-DD)
3. Alle Artikel mit:
   - Produktname (wie auf Bon gedruckt)
   - Menge (default: 1)
   - Einzelpreis in Euro
   - Gesamtpreis für diese Position
   - Kategorie (Hauptkategorie)
   - Unterkategorie (Subcategory)
   - is_warranty_candidate (boolean): true wenn es sich um Elektronik, Haushaltsgeräte oder teure Werkzeuge handelt (z.B. Toaster, Smartphone, Bohrmaschine). Sonst false.
4. Gesamtsumme des Einkaufs

**KATEGORISIERUNG**: Ordne JEDEM Artikel EXAKT eine Hauptkategorie und Unterkategorie aus dieser Liste zu:

ERLAUBTE KATEGORIEN:
- Lebensmittel: Obst & Gemüse, Brot & Backwaren, Milchprodukte & Eier, Fleisch & Fisch, Wurstwaren, Getränke (alkoholfrei), Alkohol & Tabak, Süßigkeiten & Snacks, Tiefkühlkost, Fertiggerichte & Konserven, Grundnahrungsmittel, Vegan & Vegetarisch
- Drogerie & Gesundheit: Körperpflege, Gesundheit & Medikamente, Kosmetik & Make-up, Hygieneartikel, Babybedarf
- Haushalt: Reinigung & Putzmittel, Wäschepflege, Küche & Zubehör, Bad & WC, Schreibwaren & Büro, Wohnen & Deko, Garten & Pflanzen, Elektro & Technik
- Tierbedarf: Tierfutter, Tierpflege & Zubehör
- Freizeit & Lifestyle: Restaurants & Lieferdienste, Unterhaltung, Hobby & Basteln, Sport & Fitness, Zeitungen & Bücher
- Kleidung & Schuhe: Damenmode, Herrenmode, Kindermode, Schuhe & Accessoires
- Mobilität: Tanken & Laden, Öffentliche Verkehrsmittel, Fahrzeugpflege
- Sonstiges (Fallback, wenn nichts passt)

WICHTIG: Erfinde KEINE neuen Kategorien! Nutze nur die obige Liste.

**WARRANTY CHECK**: Setze \`is_warranty_candidate\` auf true für:
- Alle Elektrogeräte (Toaster, Föhn, TV, Laptop, Kabel, Kopfhörer)
- Teure Haushaltswaren (> 50 EUR)
- Werkzeuge
- NICHT für: Lebensmittel, Verbrauchsgüter, billigen Kleinkram

Antworte NUR mit validem JSON in diesem Format:
{
  "merchant": "REWE",
  "date": "2025-01-28",
  "items": [
    {
      "name": "Bio Vollmilch 1L",
      "quantity": 2,
      "unit_price": 1.29,
      "total_price": 2.58,
      "category": "Lebensmittel",
      "subcategory": "Milchprodukte & Eier",
      "is_warranty_candidate": false
    },
    {
      "name": "Philips Haartrockner",
      "quantity": 1,
      "unit_price": 39.99,
      "total_price": 39.99,
      "category": "Haushalt",
      "subcategory": "Elektro & Technik",
      "is_warranty_candidate": true
    },
    {
      "name": "Spülmittel 500ml",
      "quantity": 1,
      "unit_price": 1.99,
      "total_price": 1.99,
      "category": "Haushalt",
      "subcategory": "Reinigung & Putzmittel",
      "is_warranty_candidate": false
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
- Bei Pfand: Als separater Artikel, Kategorie "Sonstiges"
- confidence: Schätzung 0-1 wie sicher du bist
- Kategorie und Subcategory MÜSSEN immer gesetzt sein!`

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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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
      console.error('Parse error:', parseError, 'Response:', responseText)
      return NextResponse.json(
        {
          success: false,
          error: 'PARSE_FAILED',
          message: 'Kassenbon konnte nicht analysiert werden. Bitte erneut versuchen.',
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
