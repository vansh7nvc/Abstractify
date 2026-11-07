import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    searchCoreApi,
    extractCoreAuthors,
    extractCoreYear,
    normalizeCoreDoi,
    extractCoreDownloadUrl,
    sanitizeAbstract,
    CoreApiItem,
} from '../search/sources/core-api.js';

describe('CORE API v3 Search Integration (Issue #26)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        delete process.env.CORE_API_KEY;
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    describe('Utility Helpers', () => {
        it('extractCoreAuthors correctly parses string and object author arrays', () => {
            expect(extractCoreAuthors()).toEqual([]);
            expect(extractCoreAuthors([])).toEqual([]);
            expect(
                extractCoreAuthors([
                    'Alan Turing',
                    { name: 'Ada Lovelace' },
                    { name: '   ' },
                    null as any,
                    { other: 'val' } as any,
                    'Grace Hopper',
                ]),
            ).toEqual(['Alan Turing', 'Ada Lovelace', 'Grace Hopper']);
        });

        it('extractCoreYear extracts year from yearPublished or publishedDate', () => {
            expect(extractCoreYear({ yearPublished: 2021 })).toBe(2021);
            expect(extractCoreYear({ publishedDate: '2019-08-15T00:00:00Z' })).toBe(2019);
            expect(extractCoreYear({ publishedDate: 'Published in 1995' })).toBe(1995);

            const currentYear = new Date().getFullYear();
            expect(extractCoreYear({})).toBe(currentYear);
            expect(extractCoreYear({ yearPublished: 1750 })).toBe(currentYear);
        });

        it('normalizeCoreDoi strips URL and protocol prefixes', () => {
            expect(normalizeCoreDoi('10.1038/s41586-020-2649-2')).toBe('10.1038/s41586-020-2649-2');
            expect(normalizeCoreDoi('https://doi.org/10.1016/j.cell.2021.05.001')).toBe(
                '10.1016/j.cell.2021.05.001',
            );
            expect(normalizeCoreDoi('http://doi.org/10.1145/3372278.3390670')).toBe(
                '10.1145/3372278.3390670',
            );
            expect(normalizeCoreDoi('doi: 10.1109/CVPR.2018.00762')).toBe(
                '10.1109/CVPR.2018.00762',
            );
            expect(normalizeCoreDoi('')).toBeUndefined();
            expect(normalizeCoreDoi(null)).toBeUndefined();
        });

        it('extractCoreDownloadUrl resolves downloadUrl or fallback from links array', () => {
            expect(
                extractCoreDownloadUrl({
                    downloadUrl: 'https://core.ac.uk/download/pdf/123456.pdf',
                }),
            ).toBe('https://core.ac.uk/download/pdf/123456.pdf');

            expect(
                extractCoreDownloadUrl({
                    downloadUrl: 'invalid-url',
                    links: [{ url: 'https://repository.ac.uk/paper.pdf', type: 'download' }],
                }),
            ).toBe('https://repository.ac.uk/paper.pdf');

            expect(
                extractCoreDownloadUrl({
                    links: [{ url: 'https://arxiv.org/pdf/2104.12345.pdf', type: 'other' }],
                }),
            ).toBe('https://arxiv.org/pdf/2104.12345.pdf');

            expect(extractCoreDownloadUrl({})).toBeUndefined();
        });

        it('sanitizeAbstract removes HTML tags and decodes entities while preserving punctuation', () => {
            expect(sanitizeAbstract('')).toBe('');
            expect(sanitizeAbstract(null)).toBe('');
            expect(
                sanitizeAbstract(
                    '<p>This study demonstrates <b>significant</b> results &amp; advances in AI.</p>',
                ),
            ).toBe('This study demonstrates significant results & advances in AI.');
            expect(
                sanitizeAbstract(
                    '<jats:title>Nested <i>formatting</i> &lt;tags&gt; are stripped.</jats:title>',
                ),
            ).toBe('Nested formatting <tags> are stripped.');
        });
    });

    describe('searchCoreApi API Client', () => {
        it('returns empty array when query is empty or whitespace', async () => {
            const fetchSpy = vi.spyOn(globalThis, 'fetch');
            const result = await searchCoreApi('   ', 10, { apiKey: 'dummy-key' });
            expect(result).toEqual([]);
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('silently skips and returns empty array if CORE_API_KEY is missing', async () => {
            const fetchSpy = vi.spyOn(globalThis, 'fetch');
            const result = await searchCoreApi('machine learning');
            expect(result).toEqual([]);
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('successfully parses valid CORE API works search response', async () => {
            const mockCoreResponse = {
                totalHits: 42,
                limit: 10,
                offset: 0,
                results: [
                    {
                        id: 99887766,
                        title: 'Attention Is All You Need in Open Repositories',
                        authors: [{ name: 'Vaswani, A.' }, { name: 'Shazeer, N.' }],
                        yearPublished: 2017,
                        abstract:
                            'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.',
                        downloadUrl: 'https://core.ac.uk/download/pdf/99887766.pdf',
                        doi: 'https://doi.org/10.48550/arXiv.1706.03762',
                        citationCount: 45000,
                    },
                ],
            };

            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockCoreResponse,
            } as Response);

            const papers = await searchCoreApi('transformer models', 5, {
                apiKey: 'test-core-token',
            });

            expect(fetchSpy).toHaveBeenCalledWith(
                'https://api.core.ac.uk/v3/search/works',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer test-core-token',
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({
                        q: 'transformer models',
                        limit: 5,
                        offset: 0,
                    }),
                }),
            );

            expect(papers).toHaveLength(1);
            expect(papers[0]).toEqual({
                id: 'core_99887766',
                title: 'Attention Is All You Need in Open Repositories',
                authors: ['Vaswani, A.', 'Shazeer, N.'],
                year: 2017,
                abstract:
                    'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.',
                doi: '10.48550/arXiv.1706.03762',
                citations: 45000,
                downloadUrl: 'https://core.ac.uk/download/pdf/99887766.pdf',
            });
        });

        it('provides synthesized fallback abstract when abstract is empty or very short', async () => {
            const mockResponse = {
                results: [
                    {
                        id: 112233,
                        title: 'Quantum Advantage with Photonic Systems',
                        authors: [{ name: 'Jian-Wei Pan' }],
                        yearPublished: 2020,
                        abstract: '',
                        doi: '10.1126/science.abe8770',
                        downloadUrl: 'https://core.ac.uk/download/pdf/112233.pdf',
                    },
                ],
            };

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            } as Response);

            const papers = await searchCoreApi('quantum computing', 1, {
                apiKey: 'valid-key',
            });

            expect(papers).toHaveLength(1);
            expect(papers[0].abstract).toContain('Quantum Advantage with Photonic Systems');
            expect(papers[0].abstract).toContain('Open-access research paper indexed by CORE');
            expect(papers[0].abstract).toContain('DOI: 10.1126/science.abe8770');
        });

        it('gracefully handles HTTP 429 rate limiting', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
            } as Response);

            const papers = await searchCoreApi('cancer immunotherapy', 10, {
                apiKey: 'my-key',
            });

            expect(papers).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Rate limit reached (HTTP 429)'),
            );
        });

        it('gracefully handles HTTP 401/403 authentication failures', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
            } as Response);

            const papers = await searchCoreApi('epigenetics', 10, {
                apiKey: 'invalid-key',
            });

            expect(papers).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Authentication error (HTTP 401)'),
            );
        });

        it('gracefully handles HTTP 500 server errors', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            } as Response);

            const papers = await searchCoreApi('nanotechnology', 10, {
                apiKey: 'valid-key',
            });

            expect(papers).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 500'));
        });

        it('gracefully handles network timeouts / AbortError', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';

            vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

            const papers = await searchCoreApi('astrophysics', 10, {
                apiKey: 'valid-key',
                timeoutMs: 50,
            });

            expect(papers).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('timed out'));
        });

        it('handles responses with empty results or non-array results', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ results: [] }),
            } as Response);

            const papers = await searchCoreApi('synthetic biology', 10, {
                apiKey: 'valid-key',
            });

            expect(papers).toEqual([]);
        });
    });
});
