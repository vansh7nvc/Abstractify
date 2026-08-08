import { describe, it, expect, vi, beforeEach } from 'vitest';
import searchHandler from '../search.js';
import consensusHandler from '../consensus.js';

describe('Netlify Endpoint Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('search.ts endpoint', () => {
        it('handles OPTIONS preflight CORS request', async () => {
            const req = new Request('http://localhost/api/search', { method: 'OPTIONS' });
            const res = await searchHandler(req, {} as any);
            expect(res.status).toBe(200);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
        });

        it('returns 400 when query is missing', async () => {
            const req = new Request('http://localhost/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const res = await searchHandler(req, {} as any);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.message).toBe('Query parameter is required');
        });

        it('searches Semantic Scholar and returns top papers sorted by citations without API key', async () => {
            const mockPapersData = [
                {
                    paperId: 'p1',
                    title: 'Paper One',
                    authors: [{ name: 'Author A' }],
                    year: 2023,
                    abstract: 'This is a sufficiently long abstract for paper one in research.',
                    citationCount: 10,
                },
                {
                    paperId: 'p2',
                    title: 'Paper Two',
                    authors: [{ name: 'Author B' }],
                    year: 2024,
                    abstract: 'This is a sufficiently long abstract for paper two in research.',
                    citationCount: 50,
                },
            ];

            const fetchMock = vi.fn().mockImplementation(async (url: string) => {
                if (url.includes('semanticscholar')) {
                    return {
                        ok: true,
                        json: async () => ({ data: mockPapersData }),
                    };
                }
                return { ok: false };
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Machine Learning' }),
            });

            const res = await searchHandler(req, {} as any);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.papers.length).toBe(2);
            expect(body.papers[0].id).toBe('p2'); // Higher citation count (50 vs 10)
        });

        it('falls back to OpenAlex when Semantic Scholar fails', async () => {
            const mockOpenAlexData = {
                results: [
                    {
                        id: 'oa-1',
                        display_name: 'OpenAlex Paper',
                        authorships: [{ author: { display_name: 'Alex Author' } }],
                        publication_year: 2022,
                        abstract_inverted_index: {
                            Comprehensive: [0],
                            abstract: [1],
                            text: [2],
                            for: [3],
                            testing: [4],
                            fallback: [5],
                            search: [6],
                            logic: [7],
                        },
                        doi: 'https://doi.org/10.1000/oa1',
                        cited_by_count: 15,
                    },
                ],
            };

            const fetchMock = vi.fn().mockImplementation(async (url: string) => {
                if (url.includes('semanticscholar')) {
                    return { ok: false, status: 500 };
                }
                if (url.includes('openalex')) {
                    return {
                        ok: true,
                        json: async () => mockOpenAlexData,
                    };
                }
                return { ok: false };
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Fallback Search' }),
            });

            const res = await searchHandler(req, {} as any);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.papers.length).toBe(1);
            expect(body.papers[0].title).toBe('OpenAlex Paper');
            expect(body.papers[0].abstract).toBe(
                'Comprehensive abstract text for testing fallback search logic',
            );
        }, 15000);

        it('performs Gemini embedding vector re-ranking when Gemini API key is present', async () => {
            const mockPapersData = [
                {
                    paperId: 'p1',
                    title: 'Unrelated Paper',
                    authors: [],
                    year: 2020,
                    abstract: 'Unrelated study abstract with low relevance score for quantum.',
                    citationCount: 100,
                },
                {
                    paperId: 'p2',
                    title: 'Quantum Mechanics',
                    authors: [],
                    year: 2024,
                    abstract: 'Highly relevant quantum mechanics research abstract.',
                    citationCount: 1,
                },
            ];

            const fetchMock = vi.fn().mockImplementation(async (url: string) => {
                if (url.includes('semanticscholar')) {
                    return {
                        ok: true,
                        json: async () => ({ data: mockPapersData }),
                    };
                }
                if (url.includes('embedContent')) {
                    return {
                        ok: true,
                        json: async () => ({
                            embedding: { values: [0.9, 0.1, 0.0] },
                        }),
                    };
                }
                return { ok: false };
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gemini-key': 'valid-key',
                },
                body: JSON.stringify({ query: 'Quantum' }),
            });

            const res = await searchHandler(req, {} as any);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.papers.length).toBe(2);
        });
    });

    describe('consensus.ts endpoint', () => {
        it('handles OPTIONS preflight CORS request', async () => {
            const req = new Request('http://localhost/api/consensus', { method: 'OPTIONS' });
            const res = await consensusHandler(req, {} as any);
            expect(res.status).toBe(200);
        });

        it('returns 400 when papers list or query is missing', async () => {
            const req = new Request('http://localhost/api/consensus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: '' }),
            });
            const res = await consensusHandler(req, {} as any);
            expect(res.status).toBe(400);
        });

        it('runs local keyword fallback consensus when no Gemini key is provided', async () => {
            const papers = [
                {
                    id: 'p1',
                    title: 'Improves Performance',
                    authors: ['Alice'],
                    year: 2024,
                    abstract: 'Our model significantly improves execution efficiency.',
                    citations: 10,
                },
                {
                    id: 'p2',
                    title: 'Limitation Study',
                    authors: ['Bob'],
                    year: 2023,
                    abstract: 'The method fails under noisy conditions and shows degradation.',
                    citations: 5,
                },
                {
                    id: 'p3',
                    title: 'Neutral Survey',
                    authors: ['Charlie'],
                    year: 2022,
                    abstract: 'A neutral review of historical algorithms.',
                    citations: 2,
                },
            ];

            const req = new Request('http://localhost/api/consensus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Performance Boost', papers }),
            });

            const res = await consensusHandler(req, {} as any);
            expect(res.status).toBe(200);
            const body = await res.json();

            expect(body.supportsCount).toBe(1);
            expect(body.contradictsCount).toBe(1);
            expect(body.neutralCount).toBe(1);
            expect(body.consensusScore).toBe(50);
            expect(body.paperStances.p1).toBe('supports');
            expect(body.paperStances.p2).toBe('contradicts');
            expect(body.summaryText).toContain('Local Fallback Mode');
        });

        it('uses Gemini API to evaluate consensus stance when API key is present in header', async () => {
            const papers = [
                {
                    id: 'p1',
                    title: 'Quantum Advantage',
                    authors: ['Dan'],
                    year: 2024,
                    abstract: 'Demonstrates quantum advantage in optimization.',
                    citations: 100,
                },
            ];

            const mockGeminiResponse = {
                stances: { p1: 'supports' },
                summary: 'Clear evidence supporting quantum advantage.',
            };

            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: JSON.stringify(mockGeminiResponse) }],
                            },
                        },
                    ],
                }),
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/consensus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-gemini-key': 'test-gemini-key',
                },
                body: JSON.stringify({ query: 'Quantum Advantage', papers }),
            });

            const res = await consensusHandler(req, {} as any);
            expect(res.status).toBe(200);
            const body = await res.json();

            expect(body.supportsCount).toBe(1);
            expect(body.consensusScore).toBe(100);
            expect(body.summaryText).toBe('Clear evidence supporting quantum advantage.');
        });
    });
});
