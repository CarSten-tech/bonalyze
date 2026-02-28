import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

import { ReceiptAIResponseSchema, type ReceiptAIResponse, type ReceiptItemAI } from '@/types/receipt-ai'
import { logger } from '@/lib/logger'
import { sendOperationalAlert } from '@/lib/alerting'
import {
  enforceContentLength,
  mbToBytes,
  requireAuthenticatedUser,
  requireHouseholdMembership,
  uuidParamSchema,
} from '@/lib/api-guards'
import { getRouteLogMeta, resolveCorrelationId, withCorrelationId } from '@/lib/request-tracing'
import { trackAiQualityMetric } from '@/lib/ai-quality-metrics'

const MULTI_RECEIPT_PROMPT = `
ROLE:
Du analysierst mehrere Fotos desselben deutschen Kassenbons.

KONTEXT:
- Die Bilder zeigen unterschiedliche Abschnitte eines EINZIGEN langen Bons.
- Bilder koennen ueberlappen.
- Header ist meistens im ersten Bild, Gesamtsumme meistens im letzten Bild.

AUFGABE:
1. Extrahiere einen einzigen zusammengefuehrten Bon.
2. Erkenne ueberlappende Zeilen und vermeide Duplikate.
3. Behalte die Reihenfolge der Positionen entlang des Bons bei.
4. Wenn Angaben widerspruechlich sind, nutze den plausibelsten Wert und setze Confidence etwas niedriger.
5. Antwort nur als JSON im unten vorgegebenen Schema.

JSON OUTPUT STRUCTURE (Strict):
{
  "merchant": "String (Korrigierter Name, z.B. 'Rewe City')",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (oder null)",
  "items": [
    {
      "name": "String (Sauberer, lesbarer Produktname)",
      "raw_name": "String (Original OCR Text fuer Debugging)",
      "quantity": Number,
      "unit_price": Number,
      "total_price": Number,
      "category": "String",
      "subcategory": "String",
      "tags": ["String", "String"],
      "is_warranty_candidate": Boolean,
      "estimated_calories_kcal": Number,
      "estimated_weight_g": Number,
      "estimated_protein_g": Number,
      "estimated_carbs_g": Number,
      "estimated_fat_g": Number,
      "is_food_item": Boolean
    }
  ],
  "amounts": {
    "total": Number,
    "tax": Number,
    "deposit": Number
  },
  "meta": {
    "confidence": Number (0.0 - 1.0),
    "health_score_impact": String ("positive" | "neutral" | "negative")
  }
}

WICHTIG:
- Nur JSON, kein Markdown.
- Keine doppelten Items aus Ueberlappungen.
- Preise immer positiv; Pfand in amounts.deposit.
`

const MAX_RECEIPT_MULTI_IMAGES = 5
const MAX_RECEIPT_MULTI_PAYLOAD_BYTES = mbToBytes(36)
const MAX_RECEIPT_IMAGE_BYTES = mbToBytes(10)
const AI_TIMEOUT_MS = 30_000
const AI_MAX_RETRIES = 2
const AI_RETRY_BASE_DELAY_MS = 500
const RETRYABLE_AI_ERROR_PATTERN = /(timeout|timed out|deadline|429|500|502|503|504|unavailable|overloaded|rate limit|network|fetch failed|socket|econnreset|enotfound|aborted)/i
const ALLOWED_RECEIPT_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

interface DedupeResult {
  items: ReceiptItemAI[]
  removedCount: number
}

type GeminiPart = string | { inlineData: { mimeType: string; data: string } }

class AiTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Gemini request timed out after ${timeoutMs}ms`)
    this.name = 'AiTimeoutError'
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new AiTimeoutError(timeoutMs)), timeoutMs)
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId)
      })
  })
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function isRetryableAiError(error: unknown): boolean {
  if (error instanceof AiTimeoutError) return true
  return RETRYABLE_AI_ERROR_PATTERN.test(getErrorMessage(error))
}

async function generateGeminiContentWithRetry(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  parts: GeminiPart[],
  logMeta: Record<string, unknown>
) {
  let lastError: unknown

  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt += 1) {
    try {
      return await withTimeout(model.generateContent(parts), AI_TIMEOUT_MS)
    } catch (error) {
      lastError = error
      const retryable = isRetryableAiError(error)
      const shouldRetry = retryable && attempt < AI_MAX_RETRIES

      if (!shouldRetry) {
        throw error
      }

      const waitMs = AI_RETRY_BASE_DELAY_MS * (2 ** attempt) + Math.floor(Math.random() * 200)
      logger.warn('[receipts/scan-multi] Gemini attempt failed, retrying', {
        ...logMeta,
        attempt: attempt + 1,
        waitMs,
        error: getErrorMessage(error),
      })
      await delay(waitMs)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini request failed')
}

export async function POST(request: NextRequest) {
  const correlationId = resolveCorrelationId(request.headers)
  const route = 'api/receipts/scan-multi'
  const logMeta = getRouteLogMeta(route, correlationId)
  const respond = (body: unknown, init?: ResponseInit) =>
    withCorrelationId(NextResponse.json(body, init), correlationId)
  const debug: Record<string, unknown> = { timestamp: new Date().toISOString() }

  try {
    const tooLarge = enforceContentLength(
      request,
      MAX_RECEIPT_MULTI_PAYLOAD_BYTES,
      'Upload ist zu gross.'
    )
    if (tooLarge) {
      return respond(
        { success: false, error: 'PAYLOAD_TOO_LARGE', message: 'Upload ist zu gross.' },
        { status: 413 }
      )
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    debug.hasGeminiKey = !!geminiApiKey
    if (!geminiApiKey) {
      await sendOperationalAlert({
        route,
        severity: 'critical',
        message: 'Gemini API key missing for receipts scan-multi',
        correlationId,
      })
      return respond(
        { success: false, error: 'MISSING_API_KEY', message: 'Gemini API key nicht konfiguriert', debug },
        { status: 500 }
      )
    }

    const auth = await requireAuthenticatedUser('receipts/scan-multi')
    if (!auth.ok) {
      return respond(
        { success: false, error: 'UNAUTHORIZED', message: 'Nicht eingeloggt' },
        { status: 401 }
      )
    }
    const { supabase, userId } = auth.context
    debug.userId = userId

    const formData = await request.formData()
    const householdId = formData.get('household_id') as string | null
    const uploadedImages = formData
      .getAll('images')
      .filter((value): value is File => value instanceof File)

    if (uploadedImages.length === 0) {
      const fallbackSingleImage = formData.get('image')
      if (fallbackSingleImage instanceof File) {
        uploadedImages.push(fallbackSingleImage)
      }
    }

    debug.householdId = householdId
    debug.imageCount = uploadedImages.length

    if (!householdId) {
      return respond(
        { success: false, error: 'NO_HOUSEHOLD', message: 'Kein Haushalt angegeben', debug },
        { status: 400 }
      )
    }

    const parsedHouseholdId = uuidParamSchema.safeParse(householdId)
    if (!parsedHouseholdId.success) {
      return respond(
        { success: false, error: 'INVALID_HOUSEHOLD', message: 'Ungueltige Household-ID', debug },
        { status: 400 }
      )
    }
    const normalizedHouseholdId = parsedHouseholdId.data

    if (uploadedImages.length === 0) {
      return respond(
        { success: false, error: 'NO_IMAGE', message: 'Keine Bilder hochgeladen', debug },
        { status: 400 }
      )
    }

    if (uploadedImages.length > MAX_RECEIPT_MULTI_IMAGES) {
      return respond(
        {
          success: false,
          error: 'TOO_MANY_IMAGES',
          message: `Maximal ${MAX_RECEIPT_MULTI_IMAGES} Bilder erlaubt.`,
          debug,
        },
        { status: 400 }
      )
    }

    const membershipResponse = await requireHouseholdMembership(
      supabase,
      userId,
      normalizedHouseholdId,
      'receipts/scan-multi'
    )
    if (membershipResponse) {
      return respond(
        { success: false, error: 'NOT_MEMBER', message: 'Kein Zugriff auf diesen Haushalt', debug },
        { status: membershipResponse.status }
      )
    }

    const uploadedPaths: string[] = []
    const geminiParts: GeminiPart[] = [MULTI_RECEIPT_PROMPT, `Anzahl Bilder: ${uploadedImages.length}`]

    for (const [index, image] of uploadedImages.entries()) {
      const requestedMimeType = (image.type || 'image/jpeg').toLowerCase()
      if (!ALLOWED_RECEIPT_IMAGE_MIME_TYPES.has(requestedMimeType)) {
        return respond(
          {
            success: false,
            error: 'INVALID_IMAGE_TYPE',
            message: `Nicht unterstuetztes Bildformat in Bild ${index + 1}.`,
            debug: { ...debug, imageIndex: index, mimeType: requestedMimeType },
          },
          { status: 400 }
        )
      }

      if (image.size > MAX_RECEIPT_IMAGE_BYTES) {
        return respond(
          {
            success: false,
            error: 'IMAGE_TOO_LARGE',
            message: `Bild ${index + 1} ist zu gross (max. 10 MB).`,
            debug: { ...debug, imageIndex: index, imageSize: image.size },
          },
          { status: 413 }
        )
      }

      const extension = requestedMimeType.split('/')[1]?.replace('heif', 'heic') || 'jpg'
      const fileName = `${normalizedHouseholdId}/${Date.now()}-receipt-${index + 1}.${extension}`
      const buffer = Buffer.from(await image.arrayBuffer())

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, buffer, {
          contentType: requestedMimeType,
          cacheControl: '3600',
        })

      if (uploadError || !uploadData?.path) {
        logger.error('[receipts/scan-multi] Upload error', uploadError, {
          ...logMeta,
          imageIndex: index,
        })
        await sendOperationalAlert({
          route,
          severity: 'critical',
          message: 'Receipt multi image upload failed',
          correlationId,
        })
        return respond(
          { success: false, error: 'UPLOAD_FAILED', message: 'Bild konnte nicht hochgeladen werden', debug },
          { status: 500 }
        )
      }

      uploadedPaths.push(uploadData.path)
      geminiParts.push(`BILD ${index + 1} VON ${uploadedImages.length}`)
      geminiParts.push({
        inlineData: {
          mimeType: requestedMimeType,
          data: buffer.toString('base64'),
        },
      })
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    let result
    try {
      result = await generateGeminiContentWithRetry(model, geminiParts, logMeta)
    } catch (aiError) {
      const timeoutError = aiError instanceof AiTimeoutError
      logger.error('[receipts/scan-multi] Gemini request failed', aiError, logMeta)
      await sendOperationalAlert({
        route,
        severity: 'critical',
        message: timeoutError ? 'Receipt scan-multi AI timeout' : 'Receipt scan-multi AI failed',
        correlationId,
      })
      return respond(
        {
          success: false,
          error: timeoutError ? 'AI_TIMEOUT' : 'AI_FAILED',
          message: timeoutError
            ? 'Analyse dauert zu lange. Bitte erneut versuchen.'
            : 'Kassenbon konnte nicht analysiert werden. Bitte erneut versuchen.',
        },
        { status: timeoutError ? 504 : 502 }
      )
    }
    const responseText = result.response.text()

    let jsonText = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    let aiResult: ReceiptAIResponse
    try {
      const parsed = JSON.parse(jsonText)
      aiResult = ReceiptAIResponseSchema.parse(parsed)
    } catch (parseError) {
      logger.error('[receipts/scan-multi] AI Parse error', parseError, { rawResponse: responseText, ...logMeta })

      return respond(
        {
          success: false,
          error: 'PARSE_FAILED',
          message: 'Kassenbon konnte nicht analysiert werden. (Format-Fehler)',
          debug: {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            rawResponse: responseText,
            parsedJson: jsonText,
          },
        },
        { status: 422 }
      )
    }

    if (!aiResult.items || aiResult.items.length === 0) {
      return respond(
        {
          success: false,
          error: 'NO_RECEIPT_DETECTED',
          message: 'Das sieht nicht wie ein Kassenbon aus. Bitte einen Kassenbon fotografieren.',
        },
        { status: 400 }
      )
    }

    const dedupe = dedupeMergedItems(aiResult.items)
    if (dedupe.removedCount > 0) {
      aiResult = {
        ...aiResult,
        items: dedupe.items,
      }
    }

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

    await trackAiQualityMetric({
      metricType: 'receipt_scan',
      householdId: normalizedHouseholdId,
      userId,
      confidence: typeof aiResult.meta?.confidence === 'number' ? aiResult.meta.confidence : null,
      model: 'gemini-2.5-flash-lite',
      metadata: {
        imageCount: uploadedImages.length,
        itemCount: aiResult.items.length,
        dedupeRemovedCount: dedupe.removedCount,
        merchant: aiResult.merchant,
        healthScoreImpact: aiResult.meta?.health_score_impact ?? null,
      },
    })

    return respond({
      success: true,
      data: {
        image_path: uploadedPaths[0],
        image_paths: uploadedPaths,
        ai_result: aiResult,
        merchant_match: merchantMatch,
      },
      debug: {
        imageCount: uploadedImages.length,
        dedupeRemovedCount: dedupe.removedCount,
      },
    })
  } catch (error) {
    logger.error('[receipts/scan-multi] Scan error', error, logMeta)
    await sendOperationalAlert({
      route,
      severity: 'critical',
      message: 'Unhandled receipts scan-multi failure',
      correlationId,
    })

    const errorInfo = error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack?.split('\n').slice(0, 5) }
      : { raw: String(error) }

    return respond(
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

function dedupeMergedItems(items: ReceiptItemAI[]): DedupeResult {
  const deduped: ReceiptItemAI[] = []
  const seen = new Map<string, number>()
  let removedCount = 0

  items.forEach((item, index) => {
    const fingerprint = createItemFingerprint(item)
    if (!fingerprint) {
      deduped.push(item)
      return
    }

    const previousIndex = seen.get(fingerprint)
    const isNearbyDuplicate = previousIndex !== undefined && index - previousIndex <= 1

    if (isNearbyDuplicate) {
      removedCount += 1
      return
    }

    seen.set(fingerprint, index)
    deduped.push(item)
  })

  return {
    items: deduped,
    removedCount,
  }
}

function createItemFingerprint(item: ReceiptItemAI): string | null {
  const normalizedRawName = normalizeToken(item.raw_name || '')
  if (!normalizedRawName) {
    return null
  }

  const normalizedName = normalizeToken(item.name)
  const quantity = safeNumber(item.quantity)
  const unitPriceCents = Math.round(safeNumber(item.unit_price) * 100)
  const totalPriceCents = Math.round(safeNumber(item.total_price) * 100)

  return `${normalizedName}|${normalizedRawName}|${quantity}|${unitPriceCents}|${totalPriceCents}`
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0
}
