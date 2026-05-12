import type { LLMProvider } from '../types'
import { AnthropicProvider } from './anthropic'

let _provider: LLMProvider | null = null

export function getProvider(): LLMProvider {
  if (_provider) return _provider
  const name = process.env.LLM_PROVIDER ?? 'anthropic'
  if (name === 'anthropic') {
    _provider = new AnthropicProvider()
    return _provider
  }
  throw new Error(`Unknown LLM_PROVIDER: "${name}". Valid values: anthropic`)
}
