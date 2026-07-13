import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')
const iconsDir = path.join(publicDir, 'icons')

const BRAND = '#1e3a5f'

// Einfaches Klemmbrett-mit-Haken-Symbol als Wiedererkennungszeichen für Bautenstandsberichte.
function svgIcon({ size, contentScale }) {
  const s = size * contentScale
  const offset = (size - s) / 2
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${BRAND}" />
  <g transform="translate(${offset}, ${offset}) scale(${s / 100})">
    <rect x="22" y="10" width="56" height="80" rx="6" fill="#ffffff" />
    <rect x="36" y="4" width="28" height="14" rx="4" fill="#f4f5f7" stroke="${BRAND}" stroke-width="2" />
    <rect x="30" y="30" width="40" height="6" rx="3" fill="${BRAND}" opacity="0.15" />
    <rect x="30" y="42" width="40" height="6" rx="3" fill="${BRAND}" opacity="0.15" />
    <path d="M32 60 L42 70 L70 42" fill="none" stroke="${BRAND}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`
}

async function renderPng(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath)
  console.log('wrote', path.relative(publicDir, outPath))
}

async function main() {
  await mkdir(iconsDir, { recursive: true })

  await renderPng(svgIcon({ size: 192, contentScale: 0.82 }), 192, path.join(iconsDir, 'icon-192.png'))
  await renderPng(svgIcon({ size: 512, contentScale: 0.82 }), 512, path.join(iconsDir, 'icon-512.png'))
  // Maskable: Inhalt kleiner skaliert, da Betriebssysteme den Rand beschneiden können.
  await renderPng(svgIcon({ size: 512, contentScale: 0.6 }), 512, path.join(iconsDir, 'icon-maskable-512.png'))
  await renderPng(svgIcon({ size: 180, contentScale: 0.82 }), 180, path.join(publicDir, 'apple-touch-icon.png'))

  // Favicon als SVG direkt aus derselben Vorlage.
  const faviconSvg = svgIcon({ size: 64, contentScale: 0.82 })
  await import('node:fs/promises').then((fs) => fs.writeFile(path.join(publicDir, 'favicon.svg'), faviconSvg))
  console.log('wrote favicon.svg')
}

main()
