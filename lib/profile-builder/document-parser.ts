/**
 * Profile Builder — Document Parser
 * Extracts text from uploaded files before LLM extraction.
 */

export interface ParseResult {
  text: string
  structuredData?: Record<string, unknown>
  confidence: number
}

// ── PDF ───────────────────────────────────────────────────────────────────────
export function parsePDF(buffer: Buffer): ParseResult {
  const str = buffer.toString('latin1')
  const textBlocks: string[] = []

  const btEtRegex = /BT\s([\s\S]*?)ET/g
  let match
  while ((match = btEtRegex.exec(str)) !== null) {
    const block = match[1]
    const tjRegex = /\(([^)]*)\)\s*Tj/g
    let tjMatch
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const text = tjMatch[1]
        .replace(/\\n/g, '\n').replace(/\\r/g, '')
        .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
      if (text.trim()) textBlocks.push(text.trim())
    }
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g
    let arrMatch
    while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
      const strRegex = /\(([^)]*)\)/g
      let sMatch
      const parts: string[] = []
      while ((sMatch = strRegex.exec(arrMatch[1])) !== null) parts.push(sMatch[1])
      if (parts.length > 0) textBlocks.push(parts.join(''))
    }
  }

  // Fallback: readable ASCII strings from streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  while ((match = streamRegex.exec(str)) !== null) {
    const readableRegex = /[A-Za-z0-9\s.,;:!?'"()\-$%@#&*+=/<>]{10,}/g
    let readable
    while ((readable = readableRegex.exec(match[1])) !== null) {
      const cleaned = readable[0].trim()
      if (cleaned.length > 10 && !textBlocks.includes(cleaned)) textBlocks.push(cleaned)
    }
  }

  const text = textBlocks.join('\n').slice(0, 6000)
  return { text, confidence: text.length > 200 ? 0.85 : 0.5 }
}

// ── PPTX ──────────────────────────────────────────────────────────────────────
// PPTX is a ZIP. We extract XML slide content without a zip library
// by scanning for readable text patterns between XML tags.
export function parsePPTX(buffer: Buffer): ParseResult {
  const str = buffer.toString('utf8')
  const texts: string[] = []
  // <a:t>text content</a:t> is the standard PowerPoint text element
  const tRegex = /<a:t[^>]*>([^<]+)<\/a:t>/g
  let m
  while ((m = tRegex.exec(str)) !== null) {
    const t = m[1].trim()
    if (t.length > 1) texts.push(t)
  }
  const text = texts.join(' ').slice(0, 6000)
  return { text, confidence: text.length > 100 ? 0.80 : 0.4 }
}

// ── XLSX / CSV ────────────────────────────────────────────────────────────────
// For XLSX we scan for readable strings + look for financial keywords
export function parseXLSX(buffer: Buffer): ParseResult {
  const str = buffer.toString('utf8')

  // Shared strings XML contains all text values in an XLSX
  const sRegex = /<si>[\s\S]*?<t[^>]*>([^<]+)<\/t>[\s\S]*?<\/si>/g
  const sharedStrings: string[] = []
  let m
  while ((m = sRegex.exec(str)) !== null) sharedStrings.push(m[1].trim())

  // Numbers embedded directly in cell values <v>number</v>
  const vRegex = /<v>(\d+\.?\d*)<\/v>/g
  const numbers: string[] = []
  while ((m = vRegex.exec(str)) !== null) numbers.push(m[1])

  const text = [...sharedStrings, ...numbers].join(' ').slice(0, 6000)

  // Try to extract MRR / ARR / burn / runway from adjacent label + value pairs
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
}

// ── CSV ───────────────────────────────────────────────────────────────────────
export function parseCSV(text: string): ParseResult {
  return { text: text.slice(0, 6000), confidence: 0.85 }
}

// ── Image (OCR fallback) ──────────────────────────────────────────────────────
// Without a native OCR library we return a low-confidence result and let the
// LLM describe what it can infer from the filename + any embedded EXIF text.
export function parseImage(_buffer: Buffer, filename: string): ParseResult {
  return {
    text: `Image file: ${filename}. No text could be extracted automatically. Please describe the key information in this document in your answer.`,
    confidence: 0.3,
  }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────
export function parseDocument(buffer: Buffer, filename: string, mimeType: string): ParseResult {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return parsePDF(buffer)
  if (lower.endsWith('.pptx') || mimeType.includes('presentationml')) return parsePPTX(buffer)
  if (lower.endsWith('.xlsx') || mimeType.includes('spreadsheetml')) return parseXLSX(buffer)
  if (lower.endsWith('.csv') || mimeType === 'text/csv') return parseCSV(buffer.toString('utf8'))
  if (['.png', '.jpg', '.jpeg', '.webp'].some(ext => lower.endsWith(ext))) return parseImage(buffer, filename)
  // Plain text fallback
  return { text: buffer.toString('utf8').slice(0, 6000), confidence: 0.75 }
}
