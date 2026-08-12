import { readSSE } from '@/features/shared/lib/readSSE'

/** A ReadableStream that yields each string in `chunks` as one raw chunk — lets tests control
 *  exactly where a chunk boundary falls, including mid-JSON, which is the real bug this fixes. */
function fakeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(enc.encode(chunks[i]))
        i++
      } else {
        controller.close()
      }
    },
  })
}

async function collect(chunks: string[]): Promise<Record<string, unknown>[]> {
  const events: Record<string, unknown>[] = []
  await readSSE(fakeStream(chunks), e => events.push(e))
  return events
}

describe('readSSE', () => {
  it('parses an event that arrives whole, in a single chunk', async () => {
    expect(await collect(['data: {"type":"delta","text":"a"}\n\n'])).toEqual([{ type: 'delta', text: 'a' }])
  })

  it('reassembles an event whose JSON payload is split mid-line across two chunks', async () => {
    const full = 'data: {"type":"done","proposal":{"mission":"grow revenue","priorities":["p1","p2"]}}\n\n'
    expect(await collect([full.slice(0, 40), full.slice(40)])).toEqual([
      { type: 'done', proposal: { mission: 'grow revenue', priorities: ['p1', 'p2'] } },
    ])
  })

  it('reassembles the SAME event split at every possible chunk boundary — the exact bug found in production', async () => {
    const full = 'data: {"type":"done","text":"hello world"}\n\n'
    for (let split = 1; split < full.length; split++) {
      const events = await collect([full.slice(0, split), full.slice(split)])
      expect(events).toEqual([{ type: 'done', text: 'hello world' }])
    }
  })

  it('processes multiple events across multiple chunks, in order, even when one line spans a chunk boundary', async () => {
    const events = await collect([
      'data: {"type":"delta","text":"a"}\n\ndata: {"typ',
      'e":"delta","text":"b"}\n\ndata: {"type":"done"}\n\n[DONE]\n\n',
    ])
    expect(events).toEqual([{ type: 'delta', text: 'a' }, { type: 'delta', text: 'b' }, { type: 'done' }])
  })

  it('skips a malformed line rather than throwing or losing the events around it', async () => {
    const events = await collect(['data: not-json\n\ndata: {"type":"delta","text":"ok"}\n\n'])
    expect(events).toEqual([{ type: 'delta', text: 'ok' }])
  })

  it('flushes a final chunk that has no trailing newline at all', async () => {
    expect(await collect(['data: {"type":"done","text":"tail"}'])).toEqual([{ type: 'done', text: 'tail' }])
  })

  it('ignores [DONE] and blank lines', async () => {
    expect(await collect(['data: {"type":"delta","text":"a"}\n\ndata: [DONE]\n\n\n'])).toEqual([
      { type: 'delta', text: 'a' },
    ])
  })
})
