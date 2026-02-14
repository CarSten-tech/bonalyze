import crypto, { X509Certificate } from 'crypto'

const CERT_CACHE = new Map<string, { pem: string; expiresAt: number }>()
const CERT_CACHE_TTL_MS = 60 * 60 * 1000
const MAX_TIMESTAMP_DRIFT_MS = 150 * 1000

function assertValidCertUrl(urlString: string): URL {
  const certUrl = new URL(urlString)

  if (certUrl.protocol !== 'https:') {
    throw new Error('Alexa cert URL must use https.')
  }

  if (certUrl.hostname !== 's3.amazonaws.com') {
    throw new Error('Alexa cert URL must be hosted on s3.amazonaws.com.')
  }

  if (!certUrl.pathname.startsWith('/echo.api/')) {
    throw new Error('Alexa cert URL path must start with /echo.api/.')
  }

  if (certUrl.port && certUrl.port !== '443') {
    throw new Error('Alexa cert URL must use port 443.')
  }

  return certUrl
}

async function fetchCertificate(certUrl: string): Promise<string> {
  const cached = CERT_CACHE.get(certUrl)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.pem
  }

  const response = await fetch(certUrl)
  if (!response.ok) {
    throw new Error('Failed to download Alexa certificate.')
  }

  const pem = await response.text()
  CERT_CACHE.set(certUrl, {
    pem,
    expiresAt: Date.now() + CERT_CACHE_TTL_MS,
  })

  return pem
}

function validateCertificate(pem: string): X509Certificate {
  const cert = new X509Certificate(pem)

  const now = Date.now()
  const notBefore = new Date(cert.validFrom).getTime()
  const notAfter = new Date(cert.validTo).getTime()

  if (Number.isNaN(notBefore) || Number.isNaN(notAfter) || now < notBefore || now > notAfter) {
    throw new Error('Alexa certificate is expired or not yet valid.')
  }

  const sans = cert.subjectAltName || ''
  if (!sans.includes('echo-api.amazon.com')) {
    throw new Error('Alexa certificate SAN does not include echo-api.amazon.com.')
  }

  return cert
}

function verifyRequestSignature(payload: string, signatureBase64: string, cert: X509Certificate): boolean {
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(payload)
  verifier.end()

  return verifier.verify(cert.publicKey, Buffer.from(signatureBase64, 'base64'))
}

function verifyTimestamp(timestamp: string): boolean {
  const ts = new Date(timestamp).getTime()
  if (Number.isNaN(ts)) {
    return false
  }

  return Math.abs(Date.now() - ts) <= MAX_TIMESTAMP_DRIFT_MS
}

export async function verifyAlexaRequest(rawBody: string, headers: Headers, timestamp: string): Promise<void> {
  const certChainUrl = headers.get('signaturecertchainurl')
  const signature = headers.get('signature-256')

  if (!certChainUrl || !signature) {
    throw new Error('Missing Alexa signature headers.')
  }

  const parsedUrl = assertValidCertUrl(certChainUrl)
  const pem = await fetchCertificate(parsedUrl.toString())
  const cert = validateCertificate(pem)

  if (!verifyRequestSignature(rawBody, signature, cert)) {
    throw new Error('Alexa signature verification failed.')
  }

  if (!verifyTimestamp(timestamp)) {
    throw new Error('Alexa request timestamp is out of range.')
  }
}
