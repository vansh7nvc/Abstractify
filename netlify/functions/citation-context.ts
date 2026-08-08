import { Context } from '@netlify/functions';
import { retryWithBackoff, checkPasscode } from './_utils.js';

interface CitationContextRequest {
    doi?: string;
    title: string;
}

interface CitationItem {
    context: string;
    intents: string[];
}

export default async (req: Request, context: Context) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        const body = (await req.json()) as CitationContextRequest;
        const { doi, title } = body;

        let paperId = '';

        // 1. Try to get Semantic Scholar paper ID
        if (doi) {
            paperId = `DOI:${doi}`;
        } else if (title) {
            const searchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&limit=1&fields=paperId`;
            try {
                const searchRes = await fetch(searchUrl);
                if (searchRes.ok) {
                    const searchData = (await searchRes.json()) as any;
                    if (searchData.data && searchData.data.length > 0) {
                        paperId = searchData.data[0].paperId;
                    }
                }
            } catch (e) {
                console.error('Error searching by title for citation context:', e);
            }
        }

        if (!paperId) {
            return new Response(
                JSON.stringify({ supporting: [], contradicting: [], mentioning: [] }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                },
            );
        }

        // 2. Fetch citations with contexts and intents
        const citationsUrl = `https://api.semanticscholar.org/graph/v1/paper/${paperId}/citations?fields=contexts,intents&limit=30`;

        const supporting: CitationItem[] = [];
        const contradicting: CitationItem[] = [];
        const mentioning: CitationItem[] = [];

        try {
            const citRes = await retryWithBackoff(async () => {
                const response = await fetch(citationsUrl);
                if (!response.ok) throw new Error('Citations API error');
                return (await response.json()) as any;
            });

            const citationsList = citRes.data || [];

            citationsList.forEach((cit: any) => {
                const contexts = cit.contexts || [];
                const intents = cit.intents || [];

                contexts.forEach((ctx: string) => {
                    const lowerCtx = ctx.toLowerCase();
                    const item: CitationItem = { context: ctx, intents };

                    // Heuristics for Supporting vs Contradicting vs Mentioning
                    const isContradict =
                        intents.includes('contradiction') ||
                        lowerCtx.includes('contradict') ||
                        lowerCtx.includes('fail to reproduce') ||
                        lowerCtx.includes('discrepancy') ||
                        lowerCtx.includes('differ from') ||
                        lowerCtx.includes('disagree') ||
                        lowerCtx.includes('limitation') ||
                        lowerCtx.includes('drawback');

                    const isSupport =
                        intents.includes('support') ||
                        lowerCtx.includes('confirm') ||
                        lowerCtx.includes('support') ||
                        lowerCtx.includes('consistent with') ||
                        lowerCtx.includes('validate') ||
                        lowerCtx.includes('verify') ||
                        lowerCtx.includes('agree');

                    if (isContradict) {
                        contradicting.push(item);
                    } else if (isSupport) {
                        supporting.push(item);
                    } else {
                        mentioning.push(item);
                    }
                });
            });
        } catch (e) {
            console.error('Citations fetch failed:', e);
        }

        return new Response(JSON.stringify({ supporting, contradicting, mentioning }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error: any) {
        console.error('Citation context error:', error);
        return new Response(JSON.stringify({ message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: '/api/citation-context',
};
