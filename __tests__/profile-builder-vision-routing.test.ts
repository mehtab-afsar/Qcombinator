/**
 * Profile Builder — vision extraction must route through lib/llm/router.ts, not a
 * hardcoded model in the route file (CLAUDE.md §2: "models only through the router").
 *
 * Found live: app/api/profile-builder/upload/route.ts instantiated `new Anthropic()`
 * directly with 'claude-haiku-4-5-20251001' hardcoded, for both the scanned-PDF vision
 * path and the raster-image vision path — bypassing the router's tier/retry/fallback
 * logic entirely. Fixed by extending the router's ContentBlock type to carry a
 * document/image block, so the SAME routedText() call every other extraction call in
 * this codebase uses now also serves vision.
 */

import { readFileSync } from 'fs'

const route = readFileSync('app/api/profile-builder/upload/route.ts', 'utf8')

describe('vision extraction routes through the LLM router, not a hardcoded model', () => {
  it('does not instantiate the Anthropic SDK directly', () => {
    expect(route).not.toContain("from '@anthropic-ai/sdk'")
    expect(route).not.toContain('new Anthropic(')
  })

  it('does not hardcode a model id anywhere in the route', () => {
    expect(route).not.toMatch(/claude-[a-z0-9-]+/i)
  })

  it('calls routedText for both the PDF-vision and image-vision paths', () => {
    const pdfFn = route.slice(route.indexOf('function extractFieldsFromImagePDF'), route.indexOf('function extractFieldsFromImage('))
    const imgFn = route.slice(route.indexOf('function extractFieldsFromImage('), route.indexOf('const MAX_FILE_SIZE'))
    expect(pdfFn).toContain("routedText('extraction'")
    expect(imgFn).toContain("routedText('extraction'")
  })

  it('a per-section upload scopes vision to that one section, not all 5', () => {
    // The bug: a scanned PDF attached inside e.g. Section 3 got NO vision attempt at
    // all (isImagePDF required section === 0). Fixed by dropping that restriction and
    // passing sections:[section] instead of the full [1,2,3,4,5] list.
    expect(route).toContain('const visionSections = section === 0 ? [1, 2, 3, 4, 5] : [section]')
    expect(route).not.toMatch(/const isImagePDF = section === 0/)
  })
})

describe('the router supports multi-modal (document/image) content, not just plain text', () => {
  const types = readFileSync('lib/llm/types.ts', 'utf8')
  const router = readFileSync('lib/llm/router.ts', 'utf8')
  const anthropic = readFileSync('lib/llm/providers/anthropic.ts', 'utf8')

  it('ContentBlock carries a document and an image variant', () => {
    expect(types).toMatch(/type:\s*'document'/)
    expect(types).toMatch(/type:\s*'image'/)
  })

  it('routedCall/routedText accept ChatMessage[], not a text-only shape', () => {
    expect(router).toContain('messages: ChatMessage[]')
  })

  it('the Anthropic provider uses the beta PDF endpoint only when a document block is present', () => {
    expect(anthropic).toContain('needsPdfBeta')
    expect(anthropic).toContain("betas: ['pdfs-2024-09-25']")
  })
})
