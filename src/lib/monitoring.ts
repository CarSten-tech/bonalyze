interface CaptureExceptionOptions {
  context?: Record<string, unknown>
  tags?: Record<string, string>
}

interface ParsedSentryDsn {
  storeUrl: string
}

function parseSentryDsn(dsn: string): ParsedSentryDsn | null {
  try {
    const url = new URL(dsn)
    const publicKey = url.username
    if (!publicKey) return null

    const pathSegments = url.pathname.split('/').filter(Boolean)
    const projectId = pathSegments[pathSegments.length - 1]
    if (!projectId) return null

    const basePath = pathSegments.slice(0, -1).join('/')
    const normalizedBasePath = basePath ? `/${basePath}` : ''
    const storeUrl = `${url.protocol}//${url.host}${normalizedBasePath}/api/${projectId}/store/?sentry_version=7&sentry_key=${encodeURIComponent(publicKey)}`

    return { storeUrl }
  } catch {
    return null
  }
}

function randomEventId(): string {
  return crypto.randomUUID().replaceAll('-', '')
}

function resolveReleaseTag(): string | undefined {
  return (
    process.env.SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  )
}

function resolveEnvironmentTag(): string {
  return (
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.NODE_ENV ||
    'unknown'
  )
}

function getSentryDsn(): string | undefined {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
}

export async function captureException(
  error: unknown,
  options: CaptureExceptionOptions = {}
): Promise<void> {
  const dsn = getSentryDsn()
  if (!dsn) return

  const parsedDsn = parseSentryDsn(dsn)
  if (!parsedDsn) return

  const err = error instanceof Error ? error : new Error(String(error))
  const release = resolveReleaseTag()
  const environment = resolveEnvironmentTag()

  const payload = {
    event_id: randomEventId(),
    platform: 'javascript',
    level: 'error',
    timestamp: new Date().toISOString(),
    logger: 'bonalyze',
    release,
    environment,
    tags: options.tags || {},
    extra: {
      ...(options.context || {}),
      stack: err.stack,
    },
    exception: {
      values: [
        {
          type: err.name || 'Error',
          value: err.message,
        },
      ],
    },
  }

  try {
    await fetch(parsedDsn.storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // Swallow monitoring errors to avoid recursive failures.
  }
}
