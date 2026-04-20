type Level = 'info' | 'warn' | 'error'

interface LogEntry {
  level:   Level
  msg:     string
  route?:  string
  userId?: string
  reqId?:  string
  err?:    unknown
  [key: string]: unknown
}

function serialize(entry: LogEntry): string {
  const { err, ...rest } = entry
  const base = { ts: new Date().toISOString(), ...rest }
  if (err instanceof Error) {
    return JSON.stringify({ ...base, error: err.message, stack: err.stack })
  }
  if (err !== undefined) {
    return JSON.stringify({ ...base, error: String(err) })
  }
  return JSON.stringify(base)
}

function toCtx(ctx: unknown): Omit<LogEntry, 'level' | 'msg'> {
  if (ctx === undefined || ctx === null) return {}
  if (ctx instanceof Error) return { err: ctx }
  if (typeof ctx === 'object') return ctx as Omit<LogEntry, 'level' | 'msg'>
  return { err: ctx }
}

export const log = {
  info(msg: string, ctx?: unknown) {
    console.log(serialize({ level: 'info', msg, ...toCtx(ctx) }))
  },
  warn(msg: string, ctx?: unknown) {
    console.warn(serialize({ level: 'warn', msg, ...toCtx(ctx) }))
  },
  error(msg: string, ctx?: unknown) {
    console.error(serialize({ level: 'error', msg, ...toCtx(ctx) }))
  },
}

/** Generate a short random request ID for correlating log lines within one request. */
export function newReqId(): string {
  return Math.random().toString(36).slice(2, 10)
}
