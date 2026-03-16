# Contributing to Edge Alpha

## How to Add a New Agent

1. **Register in `lib/edgealpha.config.ts`**
   Add an entry to the `AGENTS` array with the `AgentConfig` shape:
   - `id` — use the new constant from `lib/constants/agent-ids.ts`
   - `tools` — artifact types this agent **exclusively** generates
   - `dataTools` — data tool IDs from the TOOLS registry
   - `qscoreBoosts` — dimension → total point value per artifact
   - `highRelevanceAgents` / `mediumRelevanceAgents` — cross-agent context

2. **Add the agent ID constant** to `lib/constants/agent-ids.ts` and export it.

3. **Create the system prompt** at `features/agents/{id}/prompts/system-prompt.ts`.
   Follow the format of an existing prompt. Include a `## DELIVERABLE CAPABILITIES` section with exact `tool_call` usage rules for each artifact type the agent owns.

4. **Register the system prompt** in `app/api/agents/chat/route.ts`:
   ```ts
   import { newAgentSystemPrompt } from '@/features/agents/newagent/prompts/system-prompt';
   // Add to AGENT_SYSTEM_PROMPTS:
   newagent: newAgentSystemPrompt,
   ```

5. **Add UI presentation data** to `features/agents/data/agents.ts` (avatar, suggestedPrompts, color, improvesScore). Use a `Dimension` constant for `improvesScore`.

Run `tsc --noEmit` after each step.

---

## How to Add a New Tool

1. **Register in `lib/edgealpha.config.ts` → TOOLS array**:
   ```ts
   { id: 'my_tool', type: 'data', executor: 'executeMyTool', cache?: { ttl: 3600, key: 'hash(...)' }, costUsd?: 0.005 }
   ```

2. **Add the JSON schema** to `lib/llm/tools.ts`:
   ```ts
   const myTool: ToolDefinition = {
     name: 'my_tool',
     description: '...',
     parameters: { type: 'object', properties: { ... }, required: [...] },
   };
   // Add to TOOL_DEFINITIONS:
   my_tool: myTool,
   ```

3. **Assign to agents** in `lib/edgealpha.config.ts`:
   Add `'my_tool'` to the `dataTools` array of each agent that should have access.

4. **Implement the handler** in the relevant route or `lib/actions/handlers/`. Use `executeTool()` from `lib/tools/executor.ts` to get automatic rate limiting, caching, and logging.

---

## Architecture Notes

- **Single source of truth**: All agent config lives in `lib/edgealpha.config.ts`. Never hardcode agent IDs, artifact types, or dimension names as string literals — use the constants from `lib/constants/`.
- **Single artifact owner**: Each artifact type must be owned by exactly one agent. Resolve conflicts before merging.
- **Server-side auth**: API routes must get `userId` from `supabase.auth.getUser()`, never from the request body.
- **Fire-and-forget logging**: Use `void supabase.from(...).insert()` for non-critical logs so failures never block the response.
