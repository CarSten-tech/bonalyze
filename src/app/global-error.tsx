'use client'

import { logger } from "@/lib/logger"

/**
 * Global Error Boundary for the root layout.
 * Catches errors that happen in the root layout or template.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  logger.error('Global Root Error caught', error, { digest: error.digest })

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Kritischer Fehler</h2>
          <p className="mb-6">Die Anwendung konnte nicht geladen werden.</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  )
}
