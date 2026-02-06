import { z } from 'zod'

// Zod Schema für einzelne Positionen (angepasst an neuen Prompt)
export const ReceiptItemAISchema = z.object({
  name: z.string().describe("Sauberer Produktname"),
  raw_name: z.string().optional().describe("Original OCR Text für Debugging"),
  quantity: z.number().default(1),
  unit_price: z.number().describe("Einzelpreis"),
  total_price: z.number().describe("Gesamtpreis der Position"),
  category: z.string(),
  subcategory: z.string(),
  // Neu: Tags für Health-Score & Garantie
  tags: z.array(z.string()).default([]),
  is_warranty_candidate: z.boolean().default(false),
})

// Haupt-Schema für die API Antwort
export const ReceiptAIResponseSchema = z.object({
  merchant: z.string().nullable().describe("Händlername"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(), // Neu: Uhrzeit
  
  items: z.array(ReceiptItemAISchema),
  
  // Neu: Strukturiertes amounts Objekt statt flacher Werte
  amounts: z.object({
    total: z.number(),
    tax: z.number().default(0),
    deposit: z.number().default(0) // Pfand separat
  }),

  // Neu: Metadaten für Vertrauen & Gesundheit
  meta: z.object({
    confidence: z.number().min(0).max(1).default(0.5),
    health_score_impact: z.enum(['positive', 'neutral', 'negative']).optional()
  }).optional()
})

// Type Inference
export type ReceiptAIResponse = z.infer<typeof ReceiptAIResponseSchema>
export type ReceiptItemAI = z.infer<typeof ReceiptItemAISchema>

// API Request/Response types (Bleiben gleich, nutzen aber die neuen Typen oben)
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