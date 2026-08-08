import { Context } from '@netlify/functions';
import { getApiKey, callGemini, Paper, checkPasscode } from './_utils.js';

interface ConsensusRequest {
    query: string;
    papers: Paper[];
}

export default async (req: Request, context: Context) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        const body = (await req.json()) as ConsensusRequest;
        const { query, papers } = body;

        if (!query || !papers || papers.length === 0) {
            return new Response(JSON.stringify({ message: 'Query and papers list are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const geminiKey = getApiKey(req.headers, 'gemini');
        if (!geminiKey) {
            // Local fallback if no API key is provided
            // We can do a basic keyword checking (supports/contradicts) or return dummy consensus
            console.log('No API key provided, running fallback consensus...');
            const stances: Record<string, string> = {};
            let supports = 0,
                contradicts = 0,
                neutral = 0;

            papers.forEach((p, idx) => {
                const text = (p.title + ' ' + p.abstract).toLowerCase();
                let stance = 'neutral';
                if (
                    text.includes('improve') ||
                    text.includes('better') ||
                    text.includes('outperform') ||
                    text.includes('significantly')
                ) {
                    stance = 'supports';
                    supports++;
                } else if (
                    text.includes('limitation') ||
                    text.includes('fail') ||
                    text.includes('degrade') ||
                    text.includes('worse')
                ) {
                    stance = 'contradicts';
                    contradicts++;
                } else {
                    neutral++;
                }
                stances[p.id] = stance;
            });

            const score =
                supports + contradicts > 0 ? (supports / (supports + contradicts)) * 100 : 0;

            return new Response(
                JSON.stringify({
                    consensusScore: score,
                    supportsCount: supports,
                    contradictsCount: contradicts,
                    neutralCount: neutral,
                    summaryText:
                        '[Local Fallback Mode] The consensus summary is generated based on keyword matching because no Gemini API key is configured. Please enter a key in the settings for advanced AI analysis.',
                    paperStances: stances,
                }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                },
            );
        }

        // Formulate Batch Prompt for Gemini
        let prompt = `You are a scientific consensus classifier. Evaluate the following research papers against the user's thesis query/hypothesis.

User Query: "${query}"

Research Papers to Evaluate:
`;

        papers.forEach((p, idx) => {
            prompt += `---
ID: ${p.id}
Title: ${p.title}
Abstract: ${p.abstract}
`;
        });

        prompt += `
Analyze each paper's abstract and classify its stance relative to the user query.
Stance options are:
1. "supports": The paper's results/findings confirm, agree with, or support the user's thesis.
2. "contradicts": The paper's findings oppose, reject, or contradict the user's thesis.
3. "neutral": The findings are mixed, neutral, or don't explicitly address the query.

Provide your response in JSON format. Do not add markdown backticks outside of the JSON. It must match this schema:
{
  "stances": {
    "PAPER_ID": "supports" | "contradicts" | "neutral"
  },
  "summary": "A concise 150-word synthesis paragraph summarizing the collective findings of these papers, their alignment, and standard disagreements."
}
`;

        const responseText = await callGemini(prompt, 'application/json', geminiKey);

        // Clean JSON formatting if Gemini adds markdown codeblocks
        const cleanedText = responseText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        const result = JSON.parse(cleanedText) as {
            stances: Record<string, string>;
            summary: string;
        };

        let supportsCount = 0;
        let contradictsCount = 0;
        let neutralCount = 0;

        const paperStances: Record<string, string> = {};

        papers.forEach((p) => {
            const stance = result.stances[p.id] || 'neutral';
            paperStances[p.id] = stance;
            if (stance === 'supports') supportsCount++;
            else if (stance === 'contradicts') contradictsCount++;
            else neutralCount++;
        });

        const totalStanceCount = supportsCount + contradictsCount;
        const consensusScore = totalStanceCount > 0 ? (supportsCount / totalStanceCount) * 100 : 0;

        return new Response(
            JSON.stringify({
                consensusScore,
                supportsCount,
                contradictsCount,
                neutralCount,
                summaryText: result.summary,
                paperStances,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            },
        );
    } catch (error: any) {
        console.error('Consensus API error:', error);
        return new Response(JSON.stringify({ message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: '/api/consensus',
};
