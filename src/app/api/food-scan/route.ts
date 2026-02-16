import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

const FOOD_SCAN_PROMPT = `
ROLE:
Du bist ein hochspezialisiertes KI-System für die Analyse von Essensfotos. Du erkennst Lebensmittel, schätzt Portionsgrößen und berechnest Nährwerte mit hoher Genauigkeit.

INPUT:
Ein Foto einer Mahlzeit oder eines Lebensmittels. Das Essen kann auf einem Teller, in einer Schüssel, als Snack oder als Verpackung dargestellt sein.

INSTRUCTIONS:

1. **ANALYSE & IDENTIFIKATION (Chain of Thought)**:
   - Analysiere das Bild schrittweise. Was siehst du?
   - Identifiziere JEDES einzelne Lebensmittel/Zutat.
   - Suche nach visuellen Referenzen für die Größe (Teller, Besteck, Hand, Verpackungsgröße).
   - Schätze die Dimensionen (z.B. "Der Teller wirkt wie ein Standard-Essteller (26cm), die Nudeln bedecken ca. die Hälfte").

2. **PORTIONSSCHÄTZUNG (Kritisch!)**:
   - Schätze die Portionsgröße in Gramm basierend auf deiner Analyse.
   - **WARNUNG:** Unterscheide zwischen voluminösen (Salat) und dichten Lebensmitteln (Reis, Pasta, Fleisch).
   - Referenzwerte:
     - Ein gehäufter Esslöffel gekochter Reis/Pasta = ~20-25g
     - Eine Handvoll Nüsse = ~30g
     - Ein Stück Fleisch (handtellergroß) = ~150g
     - Eine Portion Pasta als Hauptgericht = ~100-125g (roh) / ~200-300g (gekocht)
   - Sei konservativ bei kalorienreichen Lebensmitteln (Öl, Nüsse, Käse).

3. **NÄHRWERTBERECHNUNG**:
   - Berechne für JEDES Item: Kalorien, Protein, Kohlenhydrate, Fett.
   - Nutze deutsche Standardwerte (BLS).

4. **OUTPUT GENERIERUNG**:
   - Gib NUR das JSON zurück.

JSON OUTPUT (Strict):
{
  "items": [
    {
      "name": "String (Deutscher Name, z.B. 'Spaghetti Bolognese')",
      "quantity_g": Number (z.B. 250),
      "calories_kcal": Number,
      "protein_g": Number,
      "carbs_g": Number,
      "fat_g": Number,
      "calories_per_100g": Number,
      "protein_per_100g": Number,
      "carbs_per_100g": Number,
      "fat_per_100g": Number,
      "confidence": Number (0.0 - 1.0)
    }
  ],
  "meal_description": "String (Kurze Zusammenfassung)",
  "total_calories": Number,
  "confidence": Number
}

WICHTIG:
- Antworte NUR mit dem JSON.
- Wenn kein Essen erkennbar ist, gib ein leeres Array zurück.
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
    // Upgrade to 'gemini-2.5-flash' for better visual reasoning capabilities
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for more factual/deterministic output
      }
    })

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
      logger.error('[food-scan] AI Parse error', undefined, { rawResponse: responseText })
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
    logger.error('[food-scan] Food scan error', error)
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
