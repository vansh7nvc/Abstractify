import { AgentDefinition } from '../types.js';

export const searchAgent: AgentDefinition = {
    name: 'search',
    description: 'Plans academic discovery, deduplication, and evidence re-ranking.',
    tools: [
        { name: 'pubmed', description: 'Biomedical literature and controlled vocabulary search' },
        { name: 'arxiv', description: 'Preprint discovery for technical and scientific domains' },
        { name: 'dblp', description: 'Computer-science bibliography and venue metadata' },
        { name: 'semantic-scholar', description: 'Cross-domain citation and relevance signals' },
    ],
    systemPrompt: `You are AbstractiFy's Search Agent. Convert the research question into a reproducible
academic search plan. Select only relevant sources, propose precise queries, identify duplicate records,
and rank evidence by topical relevance, recency, citation context, and source quality. Clearly distinguish
retrieved evidence from search recommendations; never invent papers, identifiers, or results.`,
};
