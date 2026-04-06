// Agent registry
export * from './data/agents';
export * from './types/agent.types';

// System prompts (used by API routes)
export { patelSystemPrompt } from './patel/prompts/system-prompt';
export { susiSystemPrompt } from './susi/prompts/system-prompt';
export { mayaSystemPrompt } from './maya/prompts/system-prompt';
export { felixSystemPrompt } from './felix/prompts/system-prompt';
export { leoSystemPrompt } from './leo/prompts/system-prompt';
export { harperSystemPrompt } from './harper/prompts/system-prompt';
export { novaSystemPrompt } from './nova/prompts/system-prompt';
export { atlasSystemPrompt } from './atlas/prompts/system-prompt';
export { sageSystemPrompt } from './sage/prompts/system-prompt';
export { CARTER_SYSTEM_PROMPT as carterSystemPrompt } from './carter/prompts/system-prompt';
export { RILEY_SYSTEM_PROMPT as rileySystemPrompt } from './riley/prompts/system-prompt';
