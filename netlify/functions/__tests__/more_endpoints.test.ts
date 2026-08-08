import { describe, it, expect, vi, beforeEach } from 'vitest';
import compareHandler from '../compare.js';
import citationContextHandler from '../citation-context.js';
import networkGraphHandler from '../network-graph.js';
import pdfChatHandler from '../pdf-chat.js';
import pdfExplainMathHandler from '../pdf-explain-math.js';

describe('Additional Netlify Serverless Function Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('compare.ts endpoint', () => {
        it('handles OPTIONS preflight CORS request', async () => {
            const req = new Request('http://localhost/api/compare', { method: 'OPTIONS' });
            const res = await compareHandler(req, {} as any);
            expect(res.status).toBe(200);
        });

        it('returns 400 when papers array is empty or missing', async () => {
            const req = new Request('http://localhost/api/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ papers: [] }),
            });
            const res = await compareHandler(req, {} as any);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.message).toBe('Papers list is required');
        });

        it('returns local fallback comparison matrix when no Gemini API key is provided', async () => {
            const papers = [
                {
                    id: 'p1',
                    title: 'Deep Learning for NLP',
                    authors: ['Author 1'],
                    year: 2023,
                    abstract: 'Abstract for NLP paper',
                    citations: 45,
                },
            ];

            const req = new Request('http://localhost/api/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ papers }),
            });

            const res = await compareHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.matrix.length).toBe(1);
            expect(data.matrix[0].title).toBe('Deep Learning for NLP');
            expect(data.matrix[0].datasetSize).toContain('Key Missing');
            expect(data.matrix[0].outcomes).toBe('Indexed with 45 citations');
        });

        it('calls Gemini API to generate comparison matrix when API key is provided', async () => {
            const papers = [
                {
                    id: 'p1',
                    title: 'Transformer Models',
                    authors: ['Vaswani'],
                    year: 2017,
                    abstract: 'Attention is all you need abstract',
                    citations: 50000,
                },
            ];

            const mockMatrixResult = [
                {
                    title: 'Transformer Models',
                    datasetSize: 'WMT 2014 English-German',
                    methodology: 'Multi-head self-attention',
                    outcomes: '28.4 BLEU score',
                    limitations: 'High quadratic memory complexity',
                },
            ];

            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: JSON.stringify(mockMatrixResult) }],
                            },
                        },
                    ],
                }),
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gemini-key': 'valid-gemini-key',
                },
                body: JSON.stringify({ papers }),
            });

            const res = await compareHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.matrix[0].methodology).toBe('Multi-head self-attention');
        });
    });

    describe('citation-context.ts endpoint', () => {
        it('handles OPTIONS CORS request', async () => {
            const req = new Request('http://localhost/api/citation-context', { method: 'OPTIONS' });
            const res = await citationContextHandler(req, {} as any);
            expect(res.status).toBe(200);
        });

        it('returns empty lists if no DOI or title is provided', async () => {
            const req = new Request('http://localhost/api/citation-context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: '' }),
            });

            const res = await citationContextHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual({ supporting: [], contradicting: [], mentioning: [] });
        });

        it('searches paper by title when DOI is not provided', async () => {
            const fetchMock = vi.fn().mockImplementation(async (url: string) => {
                if (url.includes('search?query=')) {
                    return {
                        ok: true,
                        json: async () => ({ data: [{ paperId: 'foundId123' }] }),
                    };
                }
                return {
                    ok: true,
                    json: async () => ({
                        data: [
                            {
                                contexts: ['This study confirms the hypothesis.'],
                                intents: ['support'],
                            },
                        ],
                    }),
                };
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/citation-context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Paper Title Only' }),
            });

            const res = await citationContextHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.supporting.length).toBe(1);
        });

        it('fetches citations and categorizes supporting, contradicting, and mentioning contexts', async () => {
            const mockCitationsData = {
                data: [
                    {
                        contexts: ['We confirm the results of previous work.'],
                        intents: ['support'],
                    },
                    {
                        contexts: ['Our findings disagree with earlier findings.'],
                        intents: ['contradiction'],
                    },
                    {
                        contexts: ['This paper is mentioned for historical context.'],
                        intents: ['background'],
                    },
                ],
            };

            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockCitationsData,
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/citation-context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doi: '10.1000/182', title: 'Sample Paper' }),
            });

            const res = await citationContextHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.supporting.length).toBe(1);
            expect(data.contradicting.length).toBe(1);
            expect(data.mentioning.length).toBe(1);
        });
    });

    describe('network-graph.ts endpoint', () => {
        it('handles OPTIONS CORS request', async () => {
            const req = new Request('http://localhost/api/network-graph', { method: 'OPTIONS' });
            const res = await networkGraphHandler(req, {} as any);
            expect(res.status).toBe(200);
        });

        it('returns 400 with empty graph if no papers are provided', async () => {
            const req = new Request('http://localhost/api/network-graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Graph', papers: [] }),
            });

            const res = await networkGraphHandler(req, {} as any);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data).toEqual({ nodes: [], edges: [] });
        });

        it('builds nodes and edges graph structure for input papers including co-citations', async () => {
            const papers = [
                {
                    id: 'paper12345',
                    title: 'Graph Paper A',
                    authors: ['Alice'],
                    year: 2023,
                    abstract: 'Graph abstract A',
                    citations: 100,
                },
                {
                    id: 'paper67890',
                    title: 'Graph Paper B',
                    authors: ['Bob'],
                    year: 2024,
                    abstract: 'Graph abstract B',
                    citations: 200,
                },
            ];

            const fetchMock = vi.fn().mockImplementation(async (url: string) => {
                if (url.includes('paper12345')) {
                    return {
                        ok: true,
                        json: async () => ({
                            references: [
                                {
                                    paperId: 'paper67890',
                                    title: 'Graph Paper B',
                                    citationCount: 200,
                                    year: 2024,
                                },
                                {
                                    paperId: 'sharedRef1',
                                    title: 'Shared Key Work',
                                    citationCount: 500,
                                    year: 2018,
                                },
                            ],
                            citations: [],
                        }),
                    };
                }
                return {
                    ok: true,
                    json: async () => ({
                        references: [
                            {
                                paperId: 'sharedRef1',
                                title: 'Shared Key Work',
                                citationCount: 500,
                                year: 2018,
                            },
                        ],
                        citations: [{ paperId: 'paper12345' }],
                    }),
                };
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/network-graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Graph Query', papers }),
            });

            const res = await networkGraphHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.nodes.length).toBeGreaterThanOrEqual(2);
            expect(data.edges.length).toBeGreaterThan(0);
        });
    });

    describe('pdf-chat.ts endpoint', () => {
        it('handles OPTIONS CORS request', async () => {
            const req = new Request('http://localhost/api/pdf-chat', { method: 'OPTIONS' });
            const res = await pdfChatHandler(req, {} as any);
            expect(res.status).toBe(200);
        });

        it('returns 400 when message is missing', async () => {
            const req = new Request('http://localhost/api/pdf-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: '' }),
            });
            const res = await pdfChatHandler(req, {} as any);
            expect(res.status).toBe(400);
        });

        it('returns local fallback reply when no Gemini API key is provided', async () => {
            const req = new Request('http://localhost/api/pdf-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Explain PDF' }),
            });

            const res = await pdfChatHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.reply).toContain('Local Fallback Mode');
        });

        it('executes retrieve_context tool and follows up with final answer', async () => {
            let stepCount = 0;
            const fetchMock = vi.fn().mockImplementation(async () => {
                stepCount++;
                if (stepCount === 1) {
                    // Tool call step
                    return {
                        ok: true,
                        json: async () => ({
                            candidates: [
                                {
                                    content: {
                                        parts: [
                                            {
                                                text: JSON.stringify({
                                                    thought:
                                                        'Need to retrieve context from uploaded PDF.',
                                                    tool: 'retrieve_context',
                                                    tool_query: 'neural network architecture',
                                                }),
                                            },
                                        ],
                                    },
                                },
                            ],
                        }),
                    };
                } else if (stepCount === 2) {
                    // Embedding for tool query
                    return {
                        ok: true,
                        json: async () => ({ embedding: { values: [0.1, 0.2, 0.3] } }),
                    };
                } else {
                    // Final answer step
                    return {
                        ok: true,
                        json: async () => ({
                            candidates: [
                                {
                                    content: {
                                        parts: [
                                            {
                                                text: JSON.stringify({
                                                    thought:
                                                        'Context retrieved, providing final answer.',
                                                    tool: 'none',
                                                    reply: 'The neural network architecture uses 5 convolutional layers.',
                                                }),
                                            },
                                        ],
                                    },
                                },
                            ],
                        }),
                    };
                }
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/pdf-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gemini-key': 'valid-key',
                },
                body: JSON.stringify({
                    message: 'How many layers does the model use?',
                    chunks: ['Layer 1 to 5 convolution details text chunk'],
                }),
            });

            const res = await pdfChatHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.reply).toBe('The neural network architecture uses 5 convolutional layers.');
            expect(data.logs.some((l: string) => l.includes('retrieve_context'))).toBe(true);
        });

        it('executes analyze_search_results tool and follows up with final answer', async () => {
            let stepCount = 0;
            const fetchMock = vi.fn().mockImplementation(async () => {
                stepCount++;
                if (stepCount === 1) {
                    return {
                        ok: true,
                        json: async () => ({
                            candidates: [
                                {
                                    content: {
                                        parts: [
                                            {
                                                text: JSON.stringify({
                                                    thought: 'Inspect online paper search results.',
                                                    tool: 'analyze_search_results',
                                                }),
                                            },
                                        ],
                                    },
                                },
                            ],
                        }),
                    };
                } else {
                    return {
                        ok: true,
                        json: async () => ({
                            candidates: [
                                {
                                    content: {
                                        parts: [
                                            {
                                                text: JSON.stringify({
                                                    thought: 'Formulate summary.',
                                                    tool: 'none',
                                                    reply: 'The online literature supports the thesis.',
                                                }),
                                            },
                                        ],
                                    },
                                },
                            ],
                        }),
                    };
                }
            });
            vi.stubGlobal('fetch', fetchMock);

            const searchResults = [
                {
                    id: '1',
                    title: 'Paper 1',
                    authors: ['A'],
                    year: 2024,
                    abstract: 'Abstract 1',
                    citations: 10,
                    consensusStance: 'supports',
                },
            ];

            const req = new Request('http://localhost/api/pdf-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gemini-key': 'valid-key',
                },
                body: JSON.stringify({
                    message: 'Summarize global literature',
                    searchResults,
                }),
            });

            const res = await pdfChatHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.reply).toBe('The online literature supports the thesis.');
            expect(data.logs.some((l: string) => l.includes('analyze_search_results'))).toBe(true);
        });
    });

    describe('pdf-explain-math.ts endpoint', () => {
        it('handles OPTIONS CORS request', async () => {
            const req = new Request('http://localhost/api/pdf-explain-math', { method: 'OPTIONS' });
            const res = await pdfExplainMathHandler(req, {} as any);
            expect(res.status).toBe(200);
        });

        it('returns 400 when equation is missing', async () => {
            const req = new Request('http://localhost/api/pdf-explain-math', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ equation: '' }),
            });
            const res = await pdfExplainMathHandler(req, {} as any);
            expect(res.status).toBe(400);
        });

        it('returns fallback formula explanation when no API key is provided', async () => {
            const req = new Request('http://localhost/api/pdf-explain-math', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equation: '$E = mc^2$',
                    context: 'Energy mass equivalence',
                }),
            });

            const res = await pdfExplainMathHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.breakdown).toContain('Synaptic weight matrix');
            expect(data.analogy).toContain('thickness of a bridge');
        });

        it('calls Gemini API to explain formula when API key is provided', async () => {
            const mockExplanation = {
                breakdown: 'E: Energy, m: mass, c: speed of light',
                analogy: 'Mass is concentrated energy like a folded paper crane.',
            };

            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: JSON.stringify(mockExplanation) }],
                            },
                        },
                    ],
                }),
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/pdf-explain-math', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gemini-key': 'valid-key',
                },
                body: JSON.stringify({ equation: '$E = mc^2$', context: 'Physics context' }),
            });

            const res = await pdfExplainMathHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();

            expect(data.breakdown).toBe(mockExplanation.breakdown);
            expect(data.analogy).toBe(mockExplanation.analogy);
        });
    });
});
