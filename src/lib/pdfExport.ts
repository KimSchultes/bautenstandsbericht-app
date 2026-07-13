import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib'
import type { Project, Report, Position, Photo } from '../db/types'

export interface PositionWithPhotos extends Position {
  photos: Photo[]
}

const PAGE_WIDTH = 595.28 // A4
const PAGE_HEIGHT = 841.89
const MARGIN = 48
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const GRAY_LINE = rgb(0.75, 0.75, 0.75)
const GRAY_FILL = rgb(0.93, 0.93, 0.93)
const TEXT_COLOR = rgb(0.1, 0.1, 0.1)

function germanDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('de-DE')
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = (text || '').split('\n')
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

class PdfBuilder {
  doc: PDFDocument
  font: PDFFont
  fontBold: PDFFont
  fontItalic: PDFFont
  page!: PDFPage
  y = 0

  private constructor(doc: PDFDocument, font: PDFFont, fontBold: PDFFont, fontItalic: PDFFont) {
    this.doc = doc
    this.font = font
    this.fontBold = fontBold
    this.fontItalic = fontItalic
  }

  static async create(): Promise<PdfBuilder> {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
    const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
    const builder = new PdfBuilder(doc, font, fontBold, fontItalic)
    builder.addPage()
    return builder
  }

  addPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    this.y = PAGE_HEIGHT - MARGIN
  }

  ensureSpace(height: number) {
    if (this.y - height < MARGIN) {
      this.addPage()
    }
  }

  drawText(text: string, opts: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; align?: 'left' | 'center' | 'right' } = {}) {
    const size = opts.size ?? 10
    const font = opts.font ?? this.font
    const color = opts.color ?? TEXT_COLOR
    let x = opts.x ?? MARGIN
    if (opts.align === 'center') {
      const w = font.widthOfTextAtSize(text, size)
      x = MARGIN + (CONTENT_WIDTH - w) / 2
    } else if (opts.align === 'right') {
      const w = font.widthOfTextAtSize(text, size)
      x = PAGE_WIDTH - MARGIN - w
    }
    this.page.drawText(text, { x, y: this.y, size, font, color })
  }

  /** Zeichnet einen umgebrochenen Absatz ab der aktuellen y-Position und rückt y entsprechend nach. */
  drawParagraph(text: string, opts: { x?: number; maxWidth?: number; size?: number; font?: PDFFont; lineGap?: number }) {
    const size = opts.size ?? 10
    const font = opts.font ?? this.font
    const maxWidth = opts.maxWidth ?? CONTENT_WIDTH
    const lineGap = opts.lineGap ?? size * 1.4
    const x = opts.x ?? MARGIN
    const lines = wrapText(text, font, size, maxWidth)
    for (const line of lines) {
      this.ensureSpace(lineGap)
      this.page.drawText(line, { x, y: this.y, size, font, color: TEXT_COLOR })
      this.y -= lineGap
    }
    return lines.length * lineGap
  }

  sectionHeading(text: string) {
    this.ensureSpace(26)
    this.y -= 8
    this.drawText(text, { size: 12, font: this.fontBold })
    this.y -= 16
  }

  hr() {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.75,
      color: GRAY_LINE,
    })
  }
}

function scaleToFit(img: PDFImage, boxW: number, boxH: number) {
  const scale = Math.min(boxW / img.width, boxH / img.height, 1)
  return { width: img.width * scale, height: img.height * scale }
}

async function embedPhoto(doc: PDFDocument, photo: Photo): Promise<PDFImage | null> {
  try {
    const bytes = new Uint8Array(await photo.blob.arrayBuffer())
    return await doc.embedJpg(bytes)
  } catch {
    return null
  }
}

interface AllgemeineInfoRow {
  label: string
  value: string
}

function drawInfoTable(b: PdfBuilder, rows: AllgemeineInfoRow[]) {
  const labelWidth = 170
  const valueWidth = CONTENT_WIDTH - labelWidth
  const padding = 6

  for (const row of rows) {
    const valueLines = wrapText(row.value || '–', b.font, 10, valueWidth - padding * 2)
    const lineHeight = 13
    const rowHeight = Math.max(valueLines.length * lineHeight, 20) + padding * 2
    b.ensureSpace(rowHeight)
    const top = b.y
    b.page.drawRectangle({
      x: MARGIN,
      y: top - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      borderColor: GRAY_LINE,
      borderWidth: 0.75,
    })
    b.page.drawLine({
      start: { x: MARGIN + labelWidth, y: top },
      end: { x: MARGIN + labelWidth, y: top - rowHeight },
      thickness: 0.75,
      color: GRAY_LINE,
    })
    b.page.drawText(row.label, {
      x: MARGIN + padding,
      y: top - padding - 9,
      size: 10,
      font: b.fontBold,
      color: TEXT_COLOR,
    })
    let ly = top - padding - 9
    for (const line of valueLines) {
      b.page.drawText(line, { x: MARGIN + labelWidth + padding, y: ly, size: 10, font: b.font, color: TEXT_COLOR })
      ly -= lineHeight
    }
    b.y = top - rowHeight
  }
}

const COL_NUM_WIDTH = 40
const COL_PHOTO_WIDTH = 190
const COL_NOTE_WIDTH = CONTENT_WIDTH - COL_NUM_WIDTH - COL_PHOTO_WIDTH

function drawIstStandHeader(b: PdfBuilder) {
  const headerHeight = 20
  b.ensureSpace(headerHeight)
  const top = b.y
  b.page.drawRectangle({ x: MARGIN, y: top - headerHeight, width: CONTENT_WIDTH, height: headerHeight, color: GRAY_FILL })
  b.page.drawText('Lfd. Nr.', { x: MARGIN + 6, y: top - 14, size: 9, font: b.fontBold, color: TEXT_COLOR })
  b.page.drawText('Bildnachweis', { x: MARGIN + COL_NUM_WIDTH + 6, y: top - 14, size: 9, font: b.fontBold, color: TEXT_COLOR })
  b.page.drawText('Anmerkungen', {
    x: MARGIN + COL_NUM_WIDTH + COL_PHOTO_WIDTH + 6,
    y: top - 14,
    size: 9,
    font: b.fontBold,
    color: TEXT_COLOR,
  })
  b.page.drawRectangle({
    x: MARGIN,
    y: top - headerHeight,
    width: CONTENT_WIDTH,
    height: headerHeight,
    borderColor: GRAY_LINE,
    borderWidth: 0.75,
  })
  b.y = top - headerHeight
}

async function drawPositionRow(b: PdfBuilder, position: PositionWithPhotos, index: number) {
  const padding = 6
  const photoBoxW = 82
  const photoBoxH = 60
  const photosPerRow = 2
  const photoGap = 6

  const images: (PDFImage | null)[] = []
  for (const photo of position.photos) {
    images.push(await embedPhoto(b.doc, photo))
  }

  const photoRowCount = images.length > 0 ? Math.ceil(images.length / photosPerRow) : 0
  const photoGridHeight = photoRowCount > 0 ? photoRowCount * photoBoxH + (photoRowCount - 1) * photoGap : 0

  const noteLines = wrapText(position.note || '–', b.font, 10, COL_NOTE_WIDTH - padding * 2)
  const noteLineHeight = 13
  const noteHeight = noteLines.length * noteLineHeight

  const rowHeight = Math.max(photoGridHeight, noteHeight, 24) + padding * 2

  // Falls die Zeile nicht mehr auf die Seite passt: neue Seite + Tabellenkopf wiederholen.
  if (b.y - rowHeight < MARGIN) {
    b.addPage()
    drawIstStandHeader(b)
  }

  const top = b.y
  b.page.drawRectangle({
    x: MARGIN,
    y: top - rowHeight,
    width: CONTENT_WIDTH,
    height: rowHeight,
    borderColor: GRAY_LINE,
    borderWidth: 0.75,
  })
  b.page.drawLine({
    start: { x: MARGIN + COL_NUM_WIDTH, y: top },
    end: { x: MARGIN + COL_NUM_WIDTH, y: top - rowHeight },
    thickness: 0.75,
    color: GRAY_LINE,
  })
  b.page.drawLine({
    start: { x: MARGIN + COL_NUM_WIDTH + COL_PHOTO_WIDTH, y: top },
    end: { x: MARGIN + COL_NUM_WIDTH + COL_PHOTO_WIDTH, y: top - rowHeight },
    thickness: 0.75,
    color: GRAY_LINE,
  })

  b.page.drawText(String(index + 1).padStart(2, '0'), {
    x: MARGIN + padding,
    y: top - padding - 10,
    size: 10,
    font: b.fontBold,
    color: TEXT_COLOR,
  })

  let photoX = MARGIN + COL_NUM_WIDTH + padding
  let photoY = top - padding
  images.forEach((img, i) => {
    if (i > 0 && i % photosPerRow === 0) {
      photoX = MARGIN + COL_NUM_WIDTH + padding
      photoY -= photoBoxH + photoGap
    }
    if (img) {
      const { width, height } = scaleToFit(img, photoBoxW, photoBoxH)
      b.page.drawImage(img, {
        x: photoX + (photoBoxW - width) / 2,
        y: photoY - photoBoxH + (photoBoxH - height) / 2,
        width,
        height,
      })
    }
    photoX += photoBoxW + photoGap
  })

  let noteY = top - padding - 9
  for (const line of noteLines) {
    b.page.drawText(line, {
      x: MARGIN + COL_NUM_WIDTH + COL_PHOTO_WIDTH + padding,
      y: noteY,
      size: 10,
      font: b.font,
      color: TEXT_COLOR,
    })
    noteY -= noteLineHeight
  }

  b.y = top - rowHeight
}

export async function buildReportPdf(
  project: Project,
  report: Report,
  positions: PositionWithPhotos[],
): Promise<Uint8Array> {
  const b = await PdfBuilder.create()

  // Titel + optionales Logo
  if (project.logoBlob) {
    try {
      const bytes = new Uint8Array(await project.logoBlob.arrayBuffer())
      const logo = project.logoBlob.type.includes('png') ? await b.doc.embedPng(bytes) : await b.doc.embedJpg(bytes)
      const { width, height } = scaleToFit(logo, 100, 50)
      b.page.drawImage(logo, { x: PAGE_WIDTH - MARGIN - width, y: b.y - height + 10, width, height })
    } catch {
      // Logo konnte nicht eingebettet werden - Export trotzdem fortsetzen
    }
  }

  const reportNum = String(report.reportNumber).padStart(2, '0')
  b.drawText(`Bautenstandsbericht Nr. ${reportNum}`, { size: 18, font: b.fontBold, align: 'center' })
  b.y -= 28

  b.drawText(`Bauvorhaben: ${project.name}`, { size: 11, font: b.fontBold })
  b.y -= 15
  if (project.address) {
    b.drawText(project.address, { size: 11 })
    b.y -= 18
  } else {
    b.y -= 6
  }

  b.drawText(
    `Bautenstandsbericht aufgestellt von: ${report.author || '–'}, ${germanDate(report.date)}`,
    { size: 10 },
  )
  b.y -= 16

  if (project.distributionList.length > 0) {
    const verteiler = project.distributionList.map((e) => `${e.name} (${e.role})`).join(', ')
    b.drawText('Verteiler:', { size: 9, font: b.fontBold })
    b.y -= 12
    b.drawParagraph(verteiler, { size: 9, font: b.fontItalic, lineGap: 12 })
  }

  b.sectionHeading('Allgemeine Informationen')
  const companiesText = report.presentCompanies.length
    ? report.presentCompanies.map((c) => (c.trade ? `${c.name} (${c.trade})` : c.name)).join(', ')
    : '–'
  drawInfoTable(b, [
    { label: 'Datum / Dauer der Begehung', value: `${germanDate(report.date)}${report.inspectionInfo ? ' · ' + report.inspectionInfo : ''}` },
    { label: 'Anwesende Firmen', value: companiesText },
  ])
  b.y -= 20

  b.sectionHeading('SOLL-Stand Baustelle gemäß Bauzeitenplan')
  if (report.targetStatusDate) {
    b.drawText(`Stichtag: ${germanDate(report.targetStatusDate)}`, { size: 10, font: b.fontBold })
    b.y -= 15
  }
  b.drawParagraph(report.targetStatusText || '–', { size: 10 })
  b.y -= 12

  b.sectionHeading('IST-Stand Baustelle gemäß Baustellenbegehung')
  drawIstStandHeader(b)
  if (positions.length === 0) {
    b.ensureSpace(24)
    b.y -= 16
    b.drawText('Keine Positionen erfasst.', { size: 10, font: b.fontItalic })
    b.y -= 8
  } else {
    for (let i = 0; i < positions.length; i++) {
      await drawPositionRow(b, positions[i], i)
    }
  }
  b.y -= 20

  b.sectionHeading('Besondere Vorkommnisse, etc.')
  b.drawParagraph(report.specialNotes || '–', { size: 10 })

  return b.doc.save()
}
