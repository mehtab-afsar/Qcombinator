/**
 * Shared OpenRouter helper.
 * Automatically retries with OPENROUTER_API_KEY_FALLBACK on 402 (credit exhaustion).
 */

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const { maxTokens = 500, temperature = 0.7 } = options;

  const primaryKey  = process.env.OPENROUTER_API_KEY;
  const fallbackKey = process.env.OPENROUTER_API_KEY_FALLBACK;
  if (!primaryKey && !fallbackKey) throw new Error('No OpenRouter API key configured');

  const makeRequest = (key: string) =>
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://edgealpha.ai',
        'X-Title': 'Edge Alpha Agents',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

  let res = await makeRequest(primaryKey ?? fallbackKey!);

  // Primary hit credit limit — retry with fallback key
  if (res.status === 402 && fallbackKey && primaryKey) {
    console.warn('[openrouter] primary key hit limit — switching to fallback');
    res = await makeRequest(fallbackKey);
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error('[openrouter] error:', res.status, errText);
    if (res.status === 402) throw new Error('OpenRouter: insufficient credits on all keys');
    throw new Error(`OpenRouter error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? '') as string;
}
