import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/openrouter';

/**
 * Assessment Document Upload API
 *
 * Accepts PDF or text file uploads, extracts text,
 * sends to AI for structured data extraction.
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Extract text content from file
    let textContent = '';
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) {
      // For PDF: read as array buffer and extract text
      // Simple text extraction — works for most pitch decks
      const buffer = Buffer.from(await file.arrayBuffer());
      textContent = extractTextFromPDF(buffer);
    } else if (fileName.endsWith('.csv')) {
      textContent = await file.text();
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      textContent = await file.text();
    } else {
      // Try reading as text for unknown formats
      try {
        textContent = await file.text();
      } catch {
        return NextResponse.json({ error: 'Unsupported file format. Please upload a PDF, CSV, or text file.' }, { status: 400 });
      }
    }

    if (!textContent || textContent.trim().length < 20) {
      return NextResponse.json({
        error: 'Could not extract enough text from this file. Try a text-based PDF or CSV.',
      }, { status: 400 });
    }

    // Truncate if too long (keep first ~4000 chars for the AI)
    const truncated = textContent.slice(0, 4000);

    // Send to AI for structured extraction
    const rawContent = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are a document parser for a startup assessment platform. Extract structured data from the provided document text.

Return ONLY valid JSON with this structure:
{
  "type": "pitch_deck" | "financial_model" | "business_plan" | "other",
  "extracted": {
    // Include ONLY fields where you found clear data. Use these field names:
    // From pitch decks: problemStory, tam, sam, som, customerQuote, conversationCount, icpDescription, channelsTried, mrr, arr, monthlyBurn, runway, advantages, teamSize
    // From financial models: mrr, arr, monthlyBurn, runway, grossMargin, cogs, averageDealSize, projectedRevenue12mo, currentCAC, lifetimeValue
    // For numbers, return just the numeric value (e.g. 12400 not "$12,400")
    // For arrays, use JSON arrays
  },
  "confidence": {
    // Same keys as extracted, with confidence 0.0-1.0
  },
  "summary": "Brief 1-2 sentence summary of what was found"
}`,
        },
        {
          role: 'user',
          content: `Extract structured startup data from this document:\n\n---\nFile: ${file.name}\n---\n${truncated}`,
        },
      ],
      { maxTokens: 800, temperature: 0.2 },
    );

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({
        type: 'other',
        extracted: {},
        confidence: {},
        summary: 'Could not parse document contents. Try sharing the key details in the chat instead.',
      });
    }

    return NextResponse.json({
      type: parsed.type || 'other',
      extracted: parsed.extracted || {},
      confidence: parsed.confidence || {},
      summary: parsed.summary || 'Document processed.',
      fileName: file.name,
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({
      error: 'Failed to process document. Try sharing the key details in the chat instead.',
    }, { status: 500 });
  }
}

/**
 * Basic PDF text extraction.
 * Extracts readable text strings from a PDF buffer.
 * For production, use a proper PDF library like pdf-parse.
 */
function extractTextFromPDF(buffer: Buffer): string {
  // Simple regex-based text extraction from PDF streams
  // This handles most text-based PDFs (not scanned images)
  const str = buffer.toString('latin1');
  const textBlocks: string[] = [];

  // Extract text between BT (begin text) and ET (end text) operators
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(str)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const text = tjMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      if (text.trim()) textBlocks.push(text.trim());
    }

    // Also handle TJ arrays
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let arrMatch;
    while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = arrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let sMatch;
      const parts: string[] = [];
      while ((sMatch = strRegex.exec(inner)) !== null) {
        parts.push(sMatch[1]);
      }
      if (parts.length > 0) textBlocks.push(parts.join(''));
    }
  }

  // Also try extracting from stream content directly
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  while ((match = streamRegex.exec(str)) !== null) {
    const content = match[1];
    // Look for readable text strings (ASCII range)
    const readableRegex = /[A-Za-z0-9\s.,;:!?'"()\-$%@#&*+=/<>]{10,}/g;
    let readable;
    while ((readable = readableRegex.exec(content)) !== null) {
      const cleaned = readable[0].trim();
      if (cleaned.length > 10 && !textBlocks.includes(cleaned)) {
        textBlocks.push(cleaned);
      }
    }
  }

  return textBlocks.join('\n').slice(0, 5000);
}
