import { NextResponse } from 'next/server'

export const CORRELATION_ID_HEADER = 'x-correlation-id'

function isValidCorrelationId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{8,128}$/.test(value)
}

export function resolveCorrelationId(headers: Headers): string {
  const candidate = headers.get(CORRELATION_ID_HEADER)?.trim()
  if (candidate && isValidCorrelationId(candidate)) {
    return candidate
  }
  return crypto.randomUUID()
}

export function withCorrelationId<T extends NextResponse>(response: T, correlationId: string): T {
  response.headers.set(CORRELATION_ID_HEADER, correlationId)
  return response
}

export function getRouteLogMeta(route: string, correlationId: string): Record<string, string> {
  return {
    route,
    correlation_id: correlationId,
  }
}
