/**
 * Generate PWA icons from SVG source
 *
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ICONS_DIR = join(__dirname, '..', 'public', 'icons')
const SVG_SOURCE = join(ICONS_DIR, 'icon.svg')

// Standard PWA icon sizes
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

// Ensure icons directory exists
if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true })
}

async function generateIcons() {
  console.log('Generating PWA icons from SVG...\n')

  const svgBuffer = readFileSync(SVG_SOURCE)

  for (const size of SIZES) {
    const outputPath = join(ICONS_DIR, `icon-${size}.png`)

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath)

    console.log(`Created: icon-${size}.png`)
  }

  // Create maskable icon (with padding for safe zone)
  // Maskable icons need important content within 80% center area
  const maskableSize = 512
  const padding = Math.round(maskableSize * 0.1) // 10% padding each side
  const innerSize = maskableSize - (padding * 2)

  await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 14, g: 165, b: 233, alpha: 1 } // sky-500
    })
    .png()
    .toFile(join(ICONS_DIR, 'icon-512-maskable.png'))

  console.log('Created: icon-512-maskable.png (maskable)')

  // Create Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(ICONS_DIR, 'apple-touch-icon.png'))

  console.log('Created: apple-touch-icon.png')

  // Create shortcut icons (simpler versions)
  // Scan shortcut icon
  const scanIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="16" fill="#0ea5e9"/>
      <g transform="translate(20, 20)" fill="none" stroke="white" stroke-width="4" stroke-linecap="round">
        <rect x="0" y="0" width="56" height="56" rx="8"/>
        <line x1="0" y1="20" x2="56" y2="20"/>
        <line x1="0" y1="36" x2="56" y2="36"/>
        <circle cx="28" cy="28" r="16" stroke-width="3"/>
        <line x1="40" y1="40" x2="52" y2="52" stroke-width="4"/>
      </g>
    </svg>
  `
  await sharp(Buffer.from(scanIconSvg))
    .resize(96, 96)
    .png()
    .toFile(join(ICONS_DIR, 'scan-shortcut.png'))

  console.log('Created: scan-shortcut.png')

  // Settlement shortcut icon
  const settlementIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="16" fill="#22c55e"/>
      <g transform="translate(20, 20)" fill="none" stroke="white" stroke-width="4" stroke-linecap="round">
        <circle cx="28" cy="20" r="12"/>
        <path d="M8 48 Q28 36 48 48"/>
        <line x1="28" y1="32" x2="28" y2="56"/>
        <line x1="16" y1="44" x2="40" y2="44"/>
      </g>
    </svg>
  `
  await sharp(Buffer.from(settlementIconSvg))
    .resize(96, 96)
    .png()
    .toFile(join(ICONS_DIR, 'settlement-shortcut.png'))

  console.log('Created: settlement-shortcut.png')

  // Create favicon.ico (using 32x32 as base)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(ICONS_DIR, 'favicon-32.png'))

  console.log('Created: favicon-32.png')

  console.log('\nAll icons generated successfully!')
}

generateIcons().catch(console.error)
