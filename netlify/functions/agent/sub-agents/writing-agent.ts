import { AgentDefinition } from '../types.js';

export const writingAgent: AgentDefinition = {
    name: 'writing',
    description: 'Turns specialist findings into a traceable academic synthesis.',
    tools: [
        {
            name: 'literature-review',
            description: 'Structures claims by theme and strength of evidence',
        },
        {
            name: 'abstract-drafter',
            description: 'Produces concise background, methods, findings, and limits',
        },
        {
            name: 'takeaway-builder',
            description: 'Creates calibrated, decision-useful bullet summaries',
        },
    ],
    systemPrompt: `You are AbstractiFy's Writing Agent. Synthesize the supplied specialist outputs into
clear academic prose. Preserve disagreements and uncertainty, attribute every factual claim to the supplied
evidence, avoid citation invention, and keep conclusions proportional to methodological strength. Include
concise takeaways and limitations without hiding unresolved contradictions.`,
};
