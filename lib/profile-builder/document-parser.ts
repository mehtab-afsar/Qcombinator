/**
 * Profile Builder — Document Parser
 * Extracts text from uploaded files before LLM extraction.
 * Uses pdf-parse for PDFs and adm-zip for PPTX/XLSX.
 */
import AdmZip from 'adm-zip'

export interface ParseResult {
  text: string
  structuredData?: Record<string, unknown>
  confidence: number
}

// ── PDF ───────────────────────────────────────────────────────────────────────
export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    // pdf-parse v2 exports a named class PDFParse — not a default function.
    // Pass { data: buffer } in the constructor; it auto-converts Buffer → Uint8Array.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { PDFParse } = await import('pdf-parse' as any)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    const text = (result.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 8000)
    return { text, confidence: text.length > 200 ? 0.85 : 0.5 }
  } catch (e) {
    console.warn('[parsePDF] failed, falling back to raw extraction:', e)
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

  const text = textBlocks.join('\n').slice(0, 8000)
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

    for (const entry of entries) {
      const xml = entry.getData().toString('utf8')

      // Slide body text: ppt/slides/slideN.xml
      if (entry.entryName.match(/ppt\/slides\/slide\d+\.xml/)) {
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
    const text = combined.join(' ').replace(/\s+/g, ' ').trim().slice(0, 8000)
    return { text, confidence: text.length > 100 ? 0.80 : 0.4 }
  } catch (e) {
    console.warn('[parsePPTX] adm-zip failed:', e)
    return { text: '', confidence: 0.2 }
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

    const text = [...sharedStrings, ...numbers].join(' ').replace(/\s+/g, ' ').trim().slice(0, 8000)

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
    console.warn('[parseXLSX] adm-zip failed:', e)
    return { text: '', confidence: 0.2 }
  }
}

// ── CSV ───────────────────────────────────────────────────────────────────────
export function parseCSV(text: string): ParseResult {
  return { text: text.slice(0, 8000), confidence: 0.85 }
}

// ── Image ─────────────────────────────────────────────────────────────────────
// No OCR library — instruct the LLM to use the filename and ask the founder
export function parseImage(_buffer: Buffer, filename: string): ParseResult {
  return {
    text: `Image file: ${filename}. No text could be extracted automatically. Please describe the key information visible in this document.`,
    confidence: 0.3,
  }
}

// ── DOCX ──────────────────────────────────────────────────────────────────────
async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  try {
    // mammoth extracts clean prose text from .docx files
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    const text = (result.value ?? '').replace(/\s+/g, ' ').trim().slice(0, 8000)
    if (result.messages?.length) {
      console.warn('[parseDOCX] mammoth warnings:', result.messages.map((m: { message: string }) => m.message).join('; '))
    }
    return { text, confidence: text.length > 200 ? 0.80 : 0.50 }
  } catch (e) {
    console.warn('[parseDOCX] mammoth failed, falling back to raw text:', e)
    return { text: buffer.toString('utf8').slice(0, 8000), confidence: 0.40 }
  }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────
export async function parseDocument(buffer: Buffer, filename: string, mimeType: string): Promise<ParseResult> {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return parsePDF(buffer)
  if (lower.endsWith('.pptx') || mimeType.includes('presentationml')) return parsePPTX(buffer)
  if (lower.endsWith('.docx') || mimeType.includes('wordprocessingml')) return parseDOCX(buffer)
  if (lower.endsWith('.xlsx') || mimeType.includes('spreadsheetml')) return parseXLSX(buffer)
  if (lower.endsWith('.csv') || mimeType === 'text/csv') return parseCSV(buffer.toString('utf8'))
  if (['.png', '.jpg', '.jpeg', '.webp'].some(ext => lower.endsWith(ext))) return parseImage(buffer, filename)
  return { text: buffer.toString('utf8').slice(0, 8000), confidence: 0.75 }
}
