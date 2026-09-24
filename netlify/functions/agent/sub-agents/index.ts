import { AgentDefinition, AgentName } from '../types.js';
import { analysisAgent } from './analysis-agent.js';
import { memoryAgent } from './memory-agent.js';
import { methodologyAgent } from './methodology-agent.js';
import { searchAgent } from './search-agent.js';
import { writingAgent } from './writing-agent.js';

export const agentRegistry: Record<AgentName, AgentDefinition> = {
    memory: memoryAgent,
    search: searchAgent,
    analysis: analysisAgent,
    methodology: methodologyAgent,
    writing: writingAgent,
};
