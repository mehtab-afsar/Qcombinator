/**
 * Profile Builder — Document Parser
 * Extracts text from uploaded files before LLM extraction.
 * Uses pdf-parse for PDFs and adm-zip for PPTX/XLSX.
 */
import AdmZip from 'adm-zip'
import { log } from '@/lib/logger'

// Instead of naively slicing the first N chars, sample from beginning + middle + end.
// This ensures financials/appendix data (typically at end of deck) reaches the LLM.
function smartSample(text: string, limit: number): string {
  if (text.length <= limit) return text
  const head = Math.floor(limit * 0.45)        // first 45%: company overview, product
  const tail = Math.floor(limit * 0.35)        // last 35%: financials, appendix, asks
  const mid  = limit - head - tail              // 20%: mid-document metrics section
  const midStart = Math.floor((text.length - mid) / 2)
  return [
    text.slice(0, head),
    text.slice(midStart, midStart + mid),
    text.slice(-tail),
  ].join('\n\n---\n\n')
}

const PDF_PAGE_LIMIT = 20    // max pages for large PDFs (> 2 MB)
const PPTX_SLIDE_LIMIT = 25  // max slides for large PPTX (> 1 MB)

export interface ParseResult {
  text: string
  structuredData?: Record<string, unknown>
  confidence: number
  /** Set when parsing genuinely failed (corrupt/unreadable file) so the caller can
   *  surface a real error instead of treating empty text as a successful upload. */
  error?: string
}

// ── PDF ───────────────────────────────────────────────────────────────────────
export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    // pdf-parse v2 exports a named class PDFParse — not a default function.
    // Pass { data: buffer } in the constructor; it auto-converts Buffer → Uint8Array.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { PDFParse } = await import('pdf-parse' as any)
    // Large PDFs (> 2 MB) often contain images/embedded objects that slow parse time.
    // Capping at 20 pages keeps the useful text content while avoiding timeouts.
    const opts = buffer.length > 2 * 1024 * 1024 ? { max: PDF_PAGE_LIMIT } : {}
    const parser = new PDFParse({ data: buffer, ...opts })
    const result = await parser.getText()
    const text = smartSample((result.text ?? '').replace(/\s+/g, ' ').trim(), 8000)
    return { text, confidence: text.length > 200 ? 0.85 : 0.5 }
  } catch (e) {
    log.warn('[parsePDF] failed, falling back to raw extraction:', e)
    return parsePDFFallback(buffer)
  }
}

// Fallback: raw regex extraction for very simple/uncompressed PDFs
function parsePDFFallback(buffer: Buffer): ParseResult {
  const str = buffer.toString('latin1')
  const textBlocks: string[] = []

  const btEtRegex = /BT\s([\s\S]*?)ET/g
  let match
  while ((match = btEtRegex.exec(str)) !== null) {
    const block = match[1]
    const tjRegex = /\(([^)]{1,200})\)\s*Tj/g
    let tjMatch
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const text = tjMatch[1]
        .replace(/\\n/g, '\n').replace(/\\r/g, '')
        .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
      if (text.trim().length > 1) textBlocks.push(text.trim())
    }
  }

  const text = smartSample(textBlocks.join('\n'), 8000)
  return { text, confidence: text.length > 200 ? 0.7 : 0.3 }
}

// ── PPTX ──────────────────────────────────────────────────────────────────────
// PPTX is a ZIP containing XML files — must unzip first
export function parsePPTX(buffer: Buffer): ParseResult {
  try {
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()

    // Helper: extract all <a:t> text from a DrawingML XML string
    function extractDrawingMLText(xml: string): string[] {
      const result: string[] = []
      const tRegex = /<a:t[^>]*>([^<]+)<\/a:t>/g
      let m
      while ((m = tRegex.exec(xml)) !== null) {
        const t = m[1]
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .trim()
        if (t.length > 1) result.push(t)
      }
      return result
    }

    const slideTexts: string[] = []
    const noteTexts: string[] = []

    // For large PPTX files (> 1 MB) cap at PPTX_SLIDE_LIMIT slides.
    // Sort slide entries so we pick the first N slides in order, not arbitrarily.
    const slideEntries = entries
      .filter(e => e.entryName.match(/ppt\/slides\/slide\d+\.xml/))
      .sort((a, b) => a.entryName.localeCompare(b.entryName))
    const isLargeFile = buffer.length > 1024 * 1024
    const slideEntriesCapped = isLargeFile ? slideEntries.slice(0, PPTX_SLIDE_LIMIT) : slideEntries
    const cappedNames = new Set(slideEntriesCapped.map(e => e.entryName))

    for (const entry of entries) {
      const xml = entry.getData().toString('utf8')

      // Slide body text: ppt/slides/slideN.xml (capped for large files)
      if (entry.entryName.match(/ppt\/slides\/slide\d+\.xml/) && cappedNames.has(entry.entryName)) {
        slideTexts.push(...extractDrawingMLText(xml))
      }

      // Speaker notes: ppt/notesSlides/notesSlideN.xml
      // Founders typically write metrics, team bios, and financial detail here
      if (entry.entryName.match(/ppt\/notesSlides\/notesSlide\d+\.xml/)) {
        noteTexts.push(...extractDrawingMLText(xml))
      }
    }

    // Notes are high-signal — prepend them so the LLM sees them first within the char limit
    const combined = [...noteTexts, ...slideTexts]
    const text = smartSample(combined.join(' ').replace(/\s+/g, ' ').trim(), 8000)
    return { text, confidence: text.length > 100 ? 0.80 : 0.4 }
  } catch (e) {
    log.warn('[parsePPTX] adm-zip failed:', e)
    return { text: '', confidence: 0.2, error: 'Could not read this PowerPoint file — it may be corrupted, password-protected, or an unsupported variant.' }
  }
}

// ── XLSX ──────────────────────────────────────────────────────────────────────
// XLSX is also a ZIP — extract sharedStrings.xml + sheet data
export function parseXLSX(buffer: Buffer): ParseResult {
  try {
    const zip = new AdmZip(buffer)

    // Read shared strings (all text values in the workbook)
    const sharedStringsEntry = zip.getEntry('xl/sharedStrings.xml')
    const sharedStrings: string[] = []
    if (sharedStringsEntry) {
      const xml = sharedStringsEntry.getData().toString('utf8')
      const tRegex = /<t[^>]*>([^<]*)<\/t>/g
      let m
      while ((m = tRegex.exec(xml)) !== null) {
        const v = m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
        if (v) sharedStrings.push(v)
      }
    }

    // Read first sheet for numeric values
    const sheet1 = zip.getEntry('xl/worksheets/sheet1.xml')
    const numbers: string[] = []
    if (sheet1) {
      const xml = sheet1.getData().toString('utf8')
      const vRegex = /<v>(\d+\.?\d*)<\/v>/g
      let m
      while ((m = vRegex.exec(xml)) !== null) numbers.push(m[1])
    }

    const text = smartSample([...sharedStrings, ...numbers].join(' ').replace(/\s+/g, ' ').trim(), 8000)

    // Extract financial metrics from label→value adjacency
    const structuredData: Record<string, unknown> = {}
    const financialKeywords: [RegExp, string][] = [
      [/mrr|monthly recurring revenue/i,  'mrr'],
      [/arr|annual recurring revenue/i,   'arr'],
      [/burn|monthly burn/i,              'monthlyBurn'],
      [/runway/i,                         'runway'],
      [/gross margin/i,                   'grossMargin'],
      [/cac|customer acquisition/i,       'cac'],
      [/ltv|lifetime value/i,             'ltv'],
      [/customers?/i,                     'customers'],
    ]
    for (const [re, key] of financialKeywords) {
      const idx = sharedStrings.findIndex(s => re.test(s))
      if (idx !== -1 && numbers[idx]) {
        structuredData[key] = parseFloat(numbers[idx])
      }
    }

    return { text, structuredData, confidence: text.length > 100 ? 0.85 : 0.4 }
  } catch (e) {
    log.warn('[parseXLSX] adm-zip failed:', e)
    return { text: '', confidence: 0.2, error: 'Could not read this spreadsheet — it may be corrupted, password-protected, or an unsupported variant.' }
  }
}

// ── CSV ───────────────────────────────────────────────────────────────────────
export function parseCSV(text: string): ParseResult {
  return { text: smartSample(text, 8000), confidence: 0.85 }
}

// ── Image ─────────────────────────────────────────────────────────────────────
// Returns a marker string — the upload route routes images to Claude vision instead
export function parseImage(_buffer: Buffer, filename: string): ParseResult {
  return {
    text: `__IMAGE_FILE__:${filename}`,
    confidence: 0.3,
  }
}

// ── TXT ───────────────────────────────────────────────────────────────────────
export function parseTXT(buffer: Buffer): ParseResult {
  const text = smartSample(buffer.toString('utf8').replace(/\r\n/g, '\n').trim(), 8000)
  return { text, confidence: text.length > 200 ? 0.85 : 0.50 }
}

// ── RTF ───────────────────────────────────────────────────────────────────────
// Strip RTF control words and groups via regex — no library needed
export function parseRTF(buffer: Buffer): ParseResult {
  const raw = buffer.toString('latin1')
  const text = raw
    .replace(/\{\\[^{}]*\}/g, '')          // remove inline groups like {\field...}
    .replace(/\\[a-z]+\-?\d*\s?/gi, ' ')   // remove control words: \par \pard \b \fs24
    .replace(/[{}\\]/g, ' ')               // remaining structural characters
    .replace(/\s+/g, ' ')
    .trim()
  return { text: smartSample(text, 8000), confidence: text.length > 200 ? 0.75 : 0.40 }
}

// ── ODT ───────────────────────────────────────────────────────────────────────
// ODT is a ZIP archive containing content.xml — same structure as DOCX
export async function parseODT(buffer: Buffer): Promise<ParseResult> {
  try {
    const zip = new AdmZip(buffer)
    const entry = zip.getEntry('content.xml')
    if (!entry) return { text: '', confidence: 0.2, error: 'Could not read this document — the file appears to be malformed (no content.xml).' }
    const xml = zip.readAsText(entry)
    const text = xml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
    return { text: smartSample(text, 8000), confidence: text.length > 200 ? 0.78 : 0.40 }
  } catch (e) {
    log.warn('[parseODT] adm-zip failed:', e)
    return { text: '', confidence: 0.2, error: 'Could not read this document — it may be corrupted or an unsupported variant.' }
  }
}

// ── Old Office (.doc / .ppt) ──────────────────────────────────────────────────
// Binary CFB format — extract printable ASCII runs for partial text recovery
export function parseOldOffice(buffer: Buffer): ParseResult {
  const text = buffer.toString('binary')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { text: smartSample(text, 8000), confidence: text.length > 200 ? 0.40 : 0.20 }
}

// ── DOCX ──────────────────────────────────────────────────────────────────────
async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  try {
    // mammoth extracts clean prose text from .docx files
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    const text = smartSample((result.value ?? '').replace(/\s+/g, ' ').trim(), 8000)
    if (result.messages?.length) {
      log.warn('[parseDOCX] mammoth warnings:', result.messages.map((m: { message: string }) => m.message).join('; '))
    }
    return { text, confidence: text.length > 200 ? 0.80 : 0.50 }
  } catch (e) {
    log.warn('[parseDOCX] mammoth failed, falling back to raw text:', e)
    return { text: smartSample(buffer.toString('utf8'), 8000), confidence: 0.40 }
  }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────
export async function parseDocument(buffer: Buffer, filename: string, mimeType: string): Promise<ParseResult> {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')  || mimeType === 'application/pdf')                    return parsePDF(buffer)
  if (lower.endsWith('.pptx') || mimeType.includes('presentationml'))               return parsePPTX(buffer)
  if (lower.endsWith('.docx') || mimeType.includes('wordprocessingml'))             return parseDOCX(buffer)
  if (lower.endsWith('.xlsx') || mimeType.includes('spreadsheetml'))                return parseXLSX(buffer)
  if (lower.endsWith('.odt')  || mimeType.includes('opendocument.text'))            return parseODT(buffer)
  if (lower.endsWith('.csv')  || mimeType === 'text/csv')                           return parseCSV(buffer.toString('utf8'))
  if (lower.endsWith('.txt')  || mimeType === 'text/plain')                         return parseTXT(buffer)
  if (lower.endsWith('.rtf')  || mimeType === 'application/rtf' || mimeType === 'text/rtf') return parseRTF(buffer)
  if (lower.endsWith('.doc')  || lower.endsWith('.ppt'))                            return parseOldOffice(buffer)
  if (['.png', '.jpg', '.jpeg', '.webp'].some(ext => lower.endsWith(ext)))          return parseImage(buffer, filename)
  return { text: smartSample(buffer.toString('utf8'), 8000), confidence: 0.75 }
}
