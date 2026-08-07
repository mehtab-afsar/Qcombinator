import { matchesInitiateIntent } from '@/features/executive/lib/chat-intent'

describe('matchesInitiateIntent', () => {
  it('matches real phrasings of "run the cycle now"', () => {
    expect(matchesInitiateIntent('run the cycle now')).toBe(true)
    expect(matchesInitiateIntent('Run the cycle')).toBe(true)
    expect(matchesInitiateIntent('please run this now')).toBe(true)
    expect(matchesInitiateIntent('start the cycle')).toBe(true)
    expect(matchesInitiateIntent('run now')).toBe(true)
  })

  it('does not match a query — the whole point of routing it elsewhere', () => {
    expect(matchesInitiateIntent('why did the ICP change?')).toBe(false)
    expect(matchesInitiateIntent("what's waiting on me")).toBe(false)
  })

  it('does not match a steer-shaped request', () => {
    expect(matchesInitiateIntent('hold the outreach')).toBe(false)
    expect(matchesInitiateIntent('pause everything')).toBe(false)
  })

  it('is case-insensitive and tolerant of surrounding words', () => {
    expect(matchesInitiateIntent('RUN THE CYCLE NOW PLEASE')).toBe(true)
    expect(matchesInitiateIntent("can you run the cycle for me")).toBe(true)
  })
})
