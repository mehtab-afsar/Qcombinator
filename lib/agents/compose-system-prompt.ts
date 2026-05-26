import { GLOBAL_CONSTITUTION } from './constitution'

interface ComposeOptions {
  identity: string
  skills: string[]
  artifactRules: string
}

/**
 * Assembles a complete system prompt from modular parts.
 *
 * Order: constitution → identity → skills (in order) → artifact rules.
 * Each section is separated by a double newline so Claude reads them as
 * distinct blocks rather than one continuous paragraph.
 */
export function composeSystemPrompt(opts: ComposeOptions): string {
  return [GLOBAL_CONSTITUTION, opts.identity, ...opts.skills, opts.artifactRules]
    .filter(Boolean)
    .join('\n\n')
}
