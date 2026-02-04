import { z } from 'zod'

// Zod Schema for Gemini AI Response
export const ReceiptItemAISchema = z.object({
  name: z.string(),
  quantity: z.number().default(1),
  unit_price: z.number().nullable(),
  total_price: z.number(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
})

export const ReceiptAIResponseSchema = z.object({
  merchant: z.string().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  items: z.array(ReceiptItemAISchema),
  subtotal: z.number().nullable(),
  total: z.number(),
  confidence: z.number().min(0).max(1).default(0.5),
})

export type ReceiptAIResponse = z.infer<typeof ReceiptAIResponseSchema>
export type ReceiptItemAI = z.infer<typeof ReceiptItemAISchema>

// API Request/Response types
export interface ScanReceiptRequest {
  image: File
  household_id: string
}

export interface ScanReceiptResponse {
  success: boolean
  data?: {
    image_path: string
    ai_result: ReceiptAIResponse
    merchant_match?: {
      id: string
      name: string
      matched: boolean
    }
  }
  error?: string
  message?: string
}
