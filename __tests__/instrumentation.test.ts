import { register } from '../instrumentation'

const originalRuntime = process.env.NEXT_RUNTIME

afterEach(() => {
  if (originalRuntime === undefined) {
    delete process.env.NEXT_RUNTIME
  } else {
    process.env.NEXT_RUNTIME = originalRuntime
  }
  jest.resetModules()
})

describe('register()', () => {
  it('calls validateRequiredEnv when NEXT_RUNTIME is nodejs', async () => {
    process.env.NEXT_RUNTIME = 'nodejs'
    const validateRequiredEnv = jest.fn()
    jest.doMock('../lib/env', () => ({ validateRequiredEnv }))
    const { register: reg } = await import('../instrumentation')
    await reg()
    expect(validateRequiredEnv).toHaveBeenCalledTimes(1)
  })

  it('does nothing when NEXT_RUNTIME is not nodejs', async () => {
    process.env.NEXT_RUNTIME = 'edge'
    await expect(register()).resolves.toBeUndefined()
  })

  it('does nothing when NEXT_RUNTIME is undefined', async () => {
    delete process.env.NEXT_RUNTIME
    await expect(register()).resolves.toBeUndefined()
  })

  it('re-throws when validateRequiredEnv throws', async () => {
    process.env.NEXT_RUNTIME = 'nodejs'
    const err = new Error('Missing required environment variables')
    jest.doMock('../lib/env', () => ({ validateRequiredEnv: jest.fn().mockImplementation(() => { throw err }) }))
    const { register: reg } = await import('../instrumentation')
    await expect(reg()).rejects.toThrow('Missing required environment variables')
  })
})
