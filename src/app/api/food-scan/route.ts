import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@/lib/supabase-server'

const FOOD_SCAN_PROMPT = `
ROLE:
Du bist ein hochspezialisiertes KI-System für die Analyse von Essensfotos. Du erkennst Lebensmittel, schätzt Portionsgrößen und berechnest Nährwerte mit hoher Genauigkeit.

INPUT:
Ein Foto einer Mahlzeit oder eines Lebensmittels. Das Essen kann auf einem Teller, in einer Schüssel, als Snack oder als Verpackung dargestellt sein.

INSTRUCTIONS:

1. **IDENTIFIKATION**:
   - Erkenne JEDES einzelne Lebensmittel/Zutat auf dem Foto.
   - Sei spezifisch: Nicht "Salat", sondern "Gemischter Blattsalat mit Tomaten, Gurken und Feta".
   - Trenne zusammengesetzte Gerichte in einzelne Komponenten auf (z.B. "Pasta Bolognese" → "Spaghetti", "Bolognese-Sauce mit Hackfleisch").

2. **PORTIONSSCHÄTZUNG**:
   - Schätze die Portionsgröße in Gramm so präzise wie möglich.
   - Nutze visuelle Hinweise: Tellergröße (~26cm Standard), Besteck, Handgröße.
   - Typische Referenzwerte:
     - Ein gehäufter Esslöffel = ~15g
     - Ein Stück Brot = ~40-50g
     - Ein Hähnchenbrustfilet = ~150-200g
     - Ein Teller Pasta = ~200-250g (gekocht)
     - Ein Glas Wasser = ~250ml

3. **NÄHRWERTBERECHNUNG**:
   - Berechne für JEDES Item: Kalorien, Protein, Kohlenhydrate, Fett.
   - Basierend auf der geschätzten Portionsgröße.
   - Nutze deutsche Lebensmittel-Durchschnittswerte (BLS-Datenbank Referenz).

4. **CONFIDENCE**:
   - Gib für jedes Item einen Confidence-Wert (0.0-1.0):
     - 0.9+: Klar erkennbar, Menge gut schätzbar
     - 0.7-0.9: Erkennbar, Menge geschätzt
     - 0.5-0.7: Unsicher bei Zutat oder Menge
     - <0.5: Sehr unsicher

JSON OUTPUT (Strict):
{
  "items": [
    {
      "name": "String (Deutscher Name, klar und lesbar)",
      "quantity_g": Number (Geschätzte Menge in Gramm),
      "calories_kcal": Number (Kalorien für die geschätzte Menge),
      "protein_g": Number (Protein in Gramm),
      "carbs_g": Number (Kohlenhydrate in Gramm),
      "fat_g": Number (Fett in Gramm),
      "calories_per_100g": Number (kcal pro 100g - für Neuberechnung bei Mengenänderung),
      "protein_per_100g": Number,
      "carbs_per_100g": Number,
      "fat_per_100g": Number,
      "confidence": Number (0.0 - 1.0)
    }
  ],
  "meal_description": "String (Kurze Beschreibung der Mahlzeit, z.B. 'Pasta Bolognese mit Salat')",
  "total_calories": Number,
  "confidence": Number (0.0 - 1.0, Gesamtvertrauen)
}

WICHTIG:
- Antworte NUR mit dem JSON. Kein Markdown, kein Text drumherum.
- Wenn kein Essen erkennbar ist, antworte mit: {"items": [], "meal_description": "Kein Essen erkannt", "total_calories": 0, "confidence": 0}
- Gib die per_100g Werte IMMER mit an, damit der User die Menge ändern und die Nährwerte automatisch neu berechnen kann.
`

export async function POST(request: NextRequest) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: 'MISSING_API_KEY', message: 'AI API Key nicht konfiguriert' },
        { status: 500 }
      )
    }

    // Auth check
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Nicht eingeloggt' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { image, mimeType } = body as { image?: string; mimeType?: string }

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'NO_IMAGE', message: 'Kein Bild übergeben' },
        { status: 400 }
      )
    }

    // Call Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const result = await model.generateContent([
      FOOD_SCAN_PROMPT,
      {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: image,
        },
      },
    ])

    const responseText = result.response.text()

    // Extract JSON
    let jsonText = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    // Parse response
    let aiResult
    try {
      aiResult = JSON.parse(jsonText)
    } catch {
      console.error('AI Parse error. Raw:', responseText)
      return NextResponse.json(
        {
          success: false,
          error: 'PARSE_FAILED',
          message: 'Das Foto konnte nicht analysiert werden. Bitte versuche es erneut.',
        },
        { status: 422 }
      )
    }

    // Validate structure
    if (!aiResult.items || !Array.isArray(aiResult.items)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_RESPONSE',
          message: 'Die AI-Antwort hat ein unerwartetes Format.',
        },
        { status: 422 }
      )
    }

    // No food detected
    if (aiResult.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_FOOD_DETECTED',
          message: 'Kein Essen auf dem Foto erkannt. Bitte fotografiere dein Essen deutlich.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: aiResult,
    })
  } catch (error) {
    console.error('Food scan error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.',
      },
      { status: 500 }
    )
  }
}
