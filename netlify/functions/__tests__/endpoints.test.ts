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

        it('aggregates and deduplicates papers from PubMed, CORE API, and arXiv', async () => {
            const originalCoreKey = process.env.CORE_API_KEY;
            process.env.CORE_API_KEY = 'test-core-token';

            const mockSemanticScholar = [
                {
                    paperId: 'ss1',
                    title: 'Attention Transformer',
                    authors: [{ name: 'A. Vaswani' }],
                    year: 2017,
                    abstract:
                        'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.',
                    citationCount: 500,
                    externalIds: { DOI: '10.1000/transformer' },
                },
            ];

            const mockPubMedSearch = {
                esearchresult: { idlist: ['33445566'] },
            };

            const mockPubMedSummary = {
                result: {
                    uids: ['33445566'],
                    '33445566': {
                        uid: '33445566',
                        title: 'Biomedical Applications of Deep Learning',
                        authors: [{ name: 'Dr. Bio' }],
                        pubdate: '2022',
                        articleids: [{ idtype: 'doi', value: '10.1000/biomed' }],
                        abstract:
                            'Comprehensive analysis of deep neural networks in clinical diagnosis and genomics.',
                    },
                },
            };

            const mockCoreWorks = {
                results: [
                    {
                        id: 'core-1',
                        title: 'Attention Transformer',
                        authors: ['A. Vaswani'],
                        yearPublished: 2017,
                        abstract:
                            'The dominant sequence transduction models are based on complex recurrent networks.',
                        doi: '10.1000/transformer',
                        downloadUrl: 'https://core.ac.uk/download/pdf/core-1.pdf',
                    },
                    {
                        id: 'core-2',
                        title: 'Unique Open Access Paper',
                        authors: ['Open Researcher'],
                        yearPublished: 2023,
                        abstract:
                            'Novel findings published exclusively in open access institutional repository.',
                        doi: '10.1000/openaccess',
                        downloadUrl: 'https://core.ac.uk/download/pdf/core-2.pdf',
                    },
                ],
            };

            const mockArxivXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2305.99999v1</id>
    <published>2023-05-15T00:00:00Z</published>
    <title>Cutting Edge arXiv Preprint</title>
    <summary>Pioneering study in generative multimodal artificial intelligence architecture.</summary>
    <author><name>AI Scientist</name></author>
    <link title="pdf" href="http://arxiv.org/pdf/2305.99999v1" rel="related"/>
    <arxiv:primary_category term="cs.AI"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/1706.03762v7</id>
    <published>2017-06-12T00:00:00Z</published>
    <title>Attention Transformer</title>
    <summary>The dominant sequence transduction models are based on complex recurrent networks.</summary>
    <author><name>A. Vaswani</name></author>
    <arxiv:doi>10.1000/transformer</arxiv:doi>
    <link title="pdf" href="http://arxiv.org/pdf/1706.03762v7" rel="related"/>
    <arxiv:primary_category term="cs.CL"/>
  </entry>
</feed>`;

            const fetchMock = vi.fn().mockImplementation(async (url: string) => {
                const parsedUrl = new URL(url);
                if (parsedUrl.hostname.includes('semanticscholar')) {
                    return { ok: true, json: async () => ({ data: mockSemanticScholar }) };
                }
                if (parsedUrl.pathname.endsWith('esearch.fcgi')) {
                    return { ok: true, json: async () => mockPubMedSearch };
                }
                if (parsedUrl.pathname.endsWith('esummary.fcgi')) {
                    return { ok: true, json: async () => mockPubMedSummary };
                }
                if (parsedUrl.hostname === 'api.core.ac.uk') {
                    return { ok: true, json: async () => mockCoreWorks };
                }
                if (parsedUrl.hostname === 'export.arxiv.org') {
                    return { ok: true, text: async () => mockArxivXml };
                }
                return { ok: false };
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Deep Learning' }),
            });

            const res = await searchHandler(req, {} as any);
            expect(res.status).toBe(200);
            const body = await res.json();

            // Verify papers list has aggregated records
            expect(body.papers.length).toBeGreaterThanOrEqual(3);

            // Verify that the existing transformer paper was enriched with downloadUrl from CORE/arXiv
            const transformerPaper = body.papers.find((p: any) => p.doi === '10.1000/transformer');
            expect(transformerPaper).toBeDefined();
            expect(transformerPaper.downloadUrl).toBeDefined();

            // Verify PubMed paper was added
            const pubmedPaper = body.papers.find((p: any) => p.doi === '10.1000/biomed');
            expect(pubmedPaper).toBeDefined();

            // Verify unique CORE paper was added
            const corePaper = body.papers.find((p: any) => p.doi === '10.1000/openaccess');
            expect(corePaper).toBeDefined();

            // Verify unique arXiv paper was added with primary category
            const arxivPaper = body.papers.find((p: any) => p.id === 'arXiv:2305.99999v1');
            expect(arxivPaper).toBeDefined();
            expect(arxivPaper.primaryCategory).toBe('cs.AI');

            process.env.CORE_API_KEY = originalCoreKey;
        });

        it('handles search errors from external source integrations gracefully', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const fetchMock = vi.fn().mockImplementation(async (url: string) => {
                const parsedUrl = new URL(url);
                if (
                    parsedUrl.hostname.includes('semanticscholar') ||
                    parsedUrl.hostname.includes('openalex')
                ) {
                    return { ok: false, status: 500, statusText: 'Server Error' };
                }
                throw new Error('Network failure in source integration');
            });
            vi.stubGlobal('fetch', fetchMock);

            const req = new Request('http://localhost/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Failing Search' }),
            });

            const res = await searchHandler(req, {} as any);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.papers).toEqual([]);

            warnSpy.mockRestore();
            errorSpy.mockRestore();
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
