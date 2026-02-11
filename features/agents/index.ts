// Agent registry
export * from './data/agents';
export * from './types/agent.types';

// Per-agent configs
export { patelConfig } from './patel/config';
export { susiConfig } from './susi/config';
export { mayaConfig } from './maya/config';
export { felixConfig } from './felix/config';
export { leoConfig } from './leo/config';
export { harperConfig } from './harper/config';
export { novaConfig } from './nova/config';
export { atlasConfig } from './atlas/config';
export { sageConfig } from './sage/config';

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
