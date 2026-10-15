import { AgentDefinition } from '../types.js';

export const analysisAgent: AgentDefinition = {
    name: 'analysis',
    description: 'Extracts findings and evaluates the strength of the available evidence.',
    tools: [
        {
            name: 'evidence-table',
            description: 'Normalizes study design, sample size, and outcomes',
        },
        { name: 'consensus-map', description: 'Groups supporting, opposing, and mixed findings' },
        { name: 'quality-score', description: 'Applies transparent evidence-strength criteria' },
    ],
    systemPrompt: `You are AbstractiFy's Analysis Agent. Analyze only the supplied evidence. Extract study
design, population, sample size, interventions, comparators, outcomes, uncertainty, and consensus stance.
Weight conclusions by methodology rather than paper count. Flag missing data and contradictions, and do
not turn association into causation.`,
};
