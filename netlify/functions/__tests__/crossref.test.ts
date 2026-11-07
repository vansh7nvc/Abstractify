import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    searchCrossref,
    resolveCrossrefDoi,
    normalizeDoi,
    formatDateParts,
    sanitizeCrossrefAbstract,
    evaluateRetractionStatus,
    CROSSREF_HEADERS,
} from '../search/sources/crossref.js';
import doiCheckHandler from '../doi-check.js';
import * as redisModule from '../shared/redis.js';

describe('Crossref DOI Resolution & Retraction Status Integration (Issue #28)', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Utility Helpers', () => {
        it('normalizeDoi strips protocol, domain, prefixes and trailing slashes', () => {
            expect(normalizeDoi('')).toBe('');
            expect(normalizeDoi('   ')).toBe('');
            expect(normalizeDoi('10.1016/j.cell.2020.01.001')).toBe('10.1016/j.cell.2020.01.001');
            expect(normalizeDoi('https://doi.org/10.1016/j.cell.2020.01.001/')).toBe(
                '10.1016/j.cell.2020.01.001',
            );
            expect(normalizeDoi('http://dx.doi.org/10.1038/s41586-020-2649-2')).toBe(
                '10.1038/s41586-020-2649-2',
            );
            expect(normalizeDoi('doi: 10.1145/3372278.3390670')).toBe('10.1145/3372278.3390670');
            expect(normalizeDoi('/10.1000/182/')).toBe('10.1000/182');
        });

        it('formatDateParts formats date-parts into ISO strings', () => {
            expect(formatDateParts()).toBe('N/A');
            expect(formatDateParts([])).toBe('N/A');
            expect(formatDateParts([[]])).toBe('N/A');
            expect(formatDateParts([[2026, 1, 15]])).toBe('2026-01-15');
            expect(formatDateParts([[2023, 11, 4]])).toBe('2023-11-04');
            expect(formatDateParts([[2021, 6]])).toBe('2021-06');
            expect(formatDateParts([[2019]])).toBe('2019');
        });

        it('sanitizeCrossrefAbstract cleans JATS XML tags and unescapes entities', () => {
            expect(sanitizeCrossrefAbstract('')).toBe('');
            const raw =
                '<jats:title>Abstract</jats:title><jats:p>We report that &lt;5% of samples were &quot;positive&quot; &amp; valid.</jats:p>';
            expect(sanitizeCrossrefAbstract(raw)).toBe(
                'Abstract We report that <5% of samples were "positive" & valid.',
            );

            const nested = '<div><span>Deeply <b>nested</b> &apos;text&apos;</span></div>';
            expect(sanitizeCrossrefAbstract(nested)).toBe("Deeply nested 'text'");
        });

        it('evaluateRetractionStatus correctly detects retractions', () => {
            const retractedItem = {
                'update-to': [
                    {
                        type: 'retraction',
                        label: 'Retraction Notice',
                        doi: '10.1016/j.cell.2020.05.012',
                        updated: { 'date-parts': [[2020, 5, 15]] },
                    },
                ],
            };
            const result = evaluateRetractionStatus(retractedItem);
            expect(result.isRetracted).toBe(true);
            expect(result.hasCorrections).toBe(false);
            expect(result.status).toBe('retracted');
            expect(result.noticeDoi).toBe('10.1016/j.cell.2020.05.012');
            expect(result.updatedDate).toBe('2020-05-15');
        });

        it('evaluateRetractionStatus detects withdrawal and relation retraction', () => {
            const withdrawalItem = {
                'update-to': [
                    {
                        type: 'withdrawal',
                        label: 'Withdrawn by author request',
                    },
                ],
            };
            expect(evaluateRetractionStatus(withdrawalItem).isRetracted).toBe(true);

            const assertionItem = {
                assertion: [{ name: 'retraction', value: 'retracted' }],
            };
            expect(evaluateRetractionStatus(assertionItem).isRetracted).toBe(true);

            const relationItem = {
                relation: { 'is-retracted-by': '10.1000/123' },
            };
            expect(evaluateRetractionStatus(relationItem).isRetracted).toBe(true);
        });

        it('evaluateRetractionStatus detects expressions of concern', () => {
            const concernItem = {
                'update-to': [
                    {
                        type: 'expression-of-concern',
                        label: 'Editorial Expression of Concern',
                        doi: '10.1038/s41586-concern',
                        updated: { 'date-parts': [[2021, 3, 10]] },
                    },
                ],
            };
            const result = evaluateRetractionStatus(concernItem);
            expect(result.isRetracted).toBe(false);
            expect(result.status).toBe('expression-of-concern');
            expect(result.noticeDoi).toBe('10.1038/s41586-concern');
            expect(result.updatedDate).toBe('2021-03-10');
        });

        it('evaluateRetractionStatus detects corrections and errata', () => {
            const correctionItem = {
                'update-to': [
                    {
                        type: 'erratum',
                        label: 'Erratum to Figure 2',
                        doi: '10.1016/j.cell.2020.erratum',
                        updated: { 'date-parts': [[2020, 2, 1]] },
                    },
                ],
            };
            const result = evaluateRetractionStatus(correctionItem);
            expect(result.isRetracted).toBe(false);
            expect(result.hasCorrections).toBe(true);
            expect(result.status).toBe('correction');

            const relationCorrection = {
                relation: { 'is-corrected-by': '10.1000/corrigendum' },
            };
            expect(evaluateRetractionStatus(relationCorrection).hasCorrections).toBe(true);
        });

        it('evaluateRetractionStatus defaults to valid for regular papers', () => {
            const normalItem = {
                DOI: '10.1016/j.cell.2020.01.001',
                title: ['Standard Paper'],
            };
            const result = evaluateRetractionStatus(normalItem);
            expect(result.isRetracted).toBe(false);
            expect(result.hasCorrections).toBe(false);
            expect(result.status).toBe('valid');
        });
    });

    describe('searchCrossref', () => {
        it('returns empty array if query is empty or whitespace', async () => {
            expect(await searchCrossref('')).toEqual([]);
            expect(await searchCrossref('   ')).toEqual([]);
        });

        it('queries Crossref API works and parses papers correctly', async () => {
            const mockWorks = {
                status: 'ok',
                message: {
                    items: [
                        {
                            DOI: '10.1016/j.cell.2020.01.001',
                            title: ['CRISPR-Cas9 Base Editing Mechanics'],
                            author: [
                                { given: 'Jennifer', family: 'Doudna' },
                                { name: 'Broad Institute Team' },
                            ],
                            publisher: 'Elsevier BV',
                            'container-title': ['Cell'],
                            'is-referenced-by-count': 350,
                            'published-print': { 'date-parts': [[2020, 1, 15]] },
                            abstract: '<jats:p>Mechanisms of base editing precision.</jats:p>',
                        },
                    ],
                },
            };

            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
                const parsedUrl = new URL(url.toString());
                expect(parsedUrl.hostname).toBe('api.crossref.org');
                expect(parsedUrl.pathname).toBe('/works');
                expect(parsedUrl.searchParams.get('query')).toBe('crispr');
                expect(parsedUrl.searchParams.get('rows')).toBe('10');
                expect((init?.headers as any)['User-Agent']).toBe(CROSSREF_HEADERS['User-Agent']);

                return {
                    ok: true,
                    status: 200,
                    json: async () => mockWorks,
                } as Response;
            });

            const papers = await searchCrossref('crispr', 10, { sort: 'score', order: 'desc' });

            expect(fetchSpy).toHaveBeenCalledTimes(1);
            expect(papers).toHaveLength(1);
            expect(papers[0]).toEqual({
                id: 'crossref:10.1016/j.cell.2020.01.001',
                title: 'CRISPR-Cas9 Base Editing Mechanics',
                authors: ['Jennifer Doudna', 'Broad Institute Team'],
                year: 2020,
                abstract: 'Mechanisms of base editing precision.',
                doi: '10.1016/j.cell.2020.01.001',
                citations: 350,
                publisher: 'Elsevier BV',
                journal: 'Cell',
                isRetracted: false,
                hasCorrections: false,
            });
        });

        it('handles non-200 response gracefully', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable',
            } as Response);

            const papers = await searchCrossref('quantum computing');
            expect(papers).toEqual([]);
        });

        it('handles timeout/abort gracefully', async () => {
            vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce({
                name: 'AbortError',
                message: 'The operation was aborted',
            });

            const papers = await searchCrossref('transformer models', 5, { timeoutMs: 50 });
            expect(papers).toEqual([]);
        });

        it('handles missing authors and date-parts gracefully', async () => {
            const mockWorks = {
                status: 'ok',
                message: {
                    items: [
                        {
                            title: ['Anonymous Report'],
                            abstract: '',
                        },
                    ],
                },
            };

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockWorks,
            } as Response);

            const papers = await searchCrossref('anonymous');
            expect(papers).toHaveLength(1);
            expect(papers[0].authors).toEqual([]);
            expect(papers[0].year).toBe(0);
            expect(papers[0].abstract).toBe('');
        });
    });

    describe('resolveCrossrefDoi', () => {
        it('returns null for empty or invalid DOI', async () => {
            expect(await resolveCrossrefDoi('')).toBeNull();
            expect(await resolveCrossrefDoi('   ')).toBeNull();
        });

        it('resolves standard valid paper DOI', async () => {
            const mockWork = {
                status: 'ok',
                message: {
                    DOI: '10.1038/s41586-020-2649-2',
                    title: ['Structural basis of SARS-CoV-2 transcription'],
                    publisher: 'Springer Science and Business Media LLC',
                    'container-title': ['Nature'],
                    'is-referenced-by-count': 420,
                    indexed: { 'date-parts': [[2026, 1, 15]] },
                },
            };

            vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
                const parsedUrl = new URL(url.toString());
                expect(parsedUrl.hostname).toBe('api.crossref.org');
                expect(parsedUrl.pathname).toBe('/works/10.1038%2Fs41586-020-2649-2');

                return {
                    ok: true,
                    status: 200,
                    json: async () => mockWork,
                } as Response;
            });

            const result = await resolveCrossrefDoi('https://doi.org/10.1038/s41586-020-2649-2');
            expect(result).not.toBeNull();
            expect(result?.doi).toBe('10.1038/s41586-020-2649-2');
            expect(result?.title).toBe('Structural basis of SARS-CoV-2 transcription');
            expect(result?.publisher).toBe('Springer Science and Business Media LLC');
            expect(result?.journal).toBe('Nature');
            expect(result?.citations).toBe(420);
            expect(result?.indexedDate).toBe('2026-01-15');
            expect(result?.isRetracted).toBe(false);
            expect(result?.hasCorrections).toBe(false);
            expect(result?.status).toBe('valid');
        });

        it('resolves retracted paper and identifies notice DOI', async () => {
            const mockRetractedWork = {
                status: 'ok',
                message: {
                    DOI: '10.1016/j.cell.2020.01.001',
                    title: ['Faulty Cellular Mechanism Study'],
                    publisher: 'Elsevier BV',
                    'container-title': ['Cell'],
                    'is-referenced-by-count': 85,
                    created: { 'date-parts': [[2020, 1, 11]] },
                    'update-to': [
                        {
                            type: 'retraction',
                            label: 'Retraction notice for Cell 2020',
                            doi: '10.1016/j.cell.2020.05.012',
                            updated: { 'date-parts': [[2020, 5, 15]] },
                        },
                    ],
                },
            };

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockRetractedWork,
            } as Response);

            const result = await resolveCrossrefDoi('10.1016/j.cell.2020.01.001');
            expect(result).not.toBeNull();
            expect(result?.isRetracted).toBe(true);
            expect(result?.status).toBe('retracted');
            expect(result?.noticeDoi).toBe('10.1016/j.cell.2020.05.012');
            expect(result?.updatedDate).toBe('2020-05-15');
        });

        it('returns null on 404 Not Found', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            } as Response);

            const result = await resolveCrossrefDoi('10.9999/non-existent-doi');
            expect(result).toBeNull();
        });

        it('returns null on server failure or timeout', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 500,
            } as Response);

            expect(await resolveCrossrefDoi('10.1000/err')).toBeNull();

            vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));
            expect(await resolveCrossrefDoi('10.1000/timeout')).toBeNull();
        });
    });

    describe('doi-check Netlify Serverless Function', () => {
        it('handles OPTIONS preflight request with CORS headers', async () => {
            const req = new Request('https://abstractify.app/api/doi-check', {
                method: 'OPTIONS',
            });
            const res = await doiCheckHandler(req, {} as any);
            expect(res.status).toBe(200);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
        });

        it('GET returns 400 if DOI query param is omitted or empty', async () => {
            const req1 = new Request('https://abstractify.app/api/doi-check', {
                method: 'GET',
            });
            const res1 = await doiCheckHandler(req1, {} as any);
            expect(res1.status).toBe(400);

            const req2 = new Request('https://abstractify.app/api/doi-check?doi=   ', {
                method: 'GET',
            });
            const res2 = await doiCheckHandler(req2, {} as any);
            expect(res2.status).toBe(400);
        });

        it('GET returns cached result on cache HIT', async () => {
            const cachedResult = {
                doi: '10.1016/j.cell.2020.01.001',
                title: 'Cached Paper',
                isRetracted: false,
                hasCorrections: false,
                status: 'valid',
                publisher: 'Elsevier BV',
                indexedDate: '2026-01-15',
                citations: 50,
            };

            vi.spyOn(redisModule, 'cacheGet').mockResolvedValueOnce(cachedResult as any);

            const req = new Request(
                'https://abstractify.app/api/doi-check?doi=10.1016/j.cell.2020.01.001',
                {
                    method: 'GET',
                },
            );

            const res = await doiCheckHandler(req, {} as any);
            expect(res.status).toBe(200);
            expect(res.headers.get('X-Cache')).toBe('HIT');
            const data = await res.json();
            expect(data).toEqual(cachedResult);
        });

        it('GET resolves DOI and populates cache on cache MISS', async () => {
            vi.spyOn(redisModule, 'cacheGet').mockResolvedValueOnce(null);
            const setSpy = vi.spyOn(redisModule, 'cacheSet').mockResolvedValueOnce(true);

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'ok',
                    message: {
                        DOI: '10.1038/nature123',
                        title: ['Breakthrough in Genetics'],
                        publisher: 'Nature Publishing Group',
                        'is-referenced-by-count': 210,
                        indexed: { 'date-parts': [[2026, 1, 15]] },
                    },
                }),
            } as Response);

            const req = new Request('https://abstractify.app/api/doi-check?doi=10.1038/nature123', {
                method: 'GET',
            });

            const res = await doiCheckHandler(req, {} as any);
            expect(res.status).toBe(200);
            expect(res.headers.get('X-Cache')).toBe('MISS');
            const data = await res.json();
            expect(data.doi).toBe('10.1038/nature123');
            expect(data.isRetracted).toBe(false);
            expect(data.publisher).toBe('Nature Publishing Group');
            expect(setSpy).toHaveBeenCalledTimes(1);
        });

        it('GET returns 404 when DOI cannot be resolved in Crossref', async () => {
            vi.spyOn(redisModule, 'cacheGet').mockResolvedValueOnce(null);
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 404,
            } as Response);

            const req = new Request('https://abstractify.app/api/doi-check?doi=10.9999/unknown', {
                method: 'GET',
            });

            const res = await doiCheckHandler(req, {} as any);
            expect(res.status).toBe(404);
            const data = await res.json();
            expect(data.error).toBe('DOI not found in Crossref');
            expect(data.status).toBe('unknown');
        });

        it('POST handles single DOI verification with cache HIT', async () => {
            const cachedResult = {
                doi: '10.1016/single.cached',
                title: 'Cached Single Paper',
                isRetracted: true,
                hasCorrections: false,
                status: 'retracted',
                publisher: 'Elsevier',
                indexedDate: '2025-05-20',
                citations: 15,
            };
            vi.spyOn(redisModule, 'cacheGet').mockResolvedValueOnce(cachedResult as any);

            const req = new Request('https://abstractify.app/api/doi-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doi: '10.1016/single.cached' }),
            });

            const res = await doiCheckHandler(req, {} as any);
            expect(res.status).toBe(200);
            expect(res.headers.get('X-Cache')).toBe('HIT');
            const data = await res.json();
            expect(data.doi).toBe('10.1016/single.cached');
            expect(data.isRetracted).toBe(true);
        });

        it('POST handles single DOI verification with cache MISS and resolution', async () => {
            vi.spyOn(redisModule, 'cacheGet').mockResolvedValueOnce(null);
            vi.spyOn(redisModule, 'cacheSet').mockResolvedValueOnce(true);

            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 'ok',
                    message: {
                        DOI: '10.1016/single.doi',
                        title: ['Single DOI Test'],
                        publisher: 'Elsevier',
                        'is-referenced-by-count': 10,
                        created: { 'date-parts': [[2025, 5, 20]] },
                    },
                }),
            } as Response);

            const req = new Request('https://abstractify.app/api/doi-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doi: '10.1016/single.doi' }),
            });

            const res = await doiCheckHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.doi).toBe('10.1016/single.doi');
        });

        it('POST returns 404 when single DOI is not found in Crossref', async () => {
            vi.spyOn(redisModule, 'cacheGet').mockResolvedValueOnce(null);
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 404,
            } as Response);

            const req = new Request('https://abstractify.app/api/doi-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doi: '10.1000/not-found' }),
            });

            const res = await doiCheckHandler(req, {} as any);
            expect(res.status).toBe(404);
            const data = await res.json();
            expect(data.error).toBe('DOI not found in Crossref');
        });

        it('POST handles batch DOIs verification', async () => {
            vi.spyOn(redisModule, 'cacheGet').mockImplementation(async (key) => {
                if (key.includes('cached')) {
                    return {
                        doi: '10.1000/cached',
                        isRetracted: false,
                        hasCorrections: false,
                        status: 'valid',
                    };
                }
                return null;
            });
            vi.spyOn(redisModule, 'cacheSet').mockResolvedValue(true);

            vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
                const parsedUrl = new URL(url.toString());
                const doi = decodeURIComponent(parsedUrl.pathname.replace('/works/', ''));
                if (doi.includes('fail')) {
                    return { ok: false, status: 500 } as Response;
                }
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'ok',
                        message: {
                            DOI: doi,
                            title: [`Title for ${doi}`],
                            publisher: 'Publisher',
                            'is-referenced-by-count': 5,
                            created: { 'date-parts': [[2024, 1, 1]] },
                        },
                    }),
                } as Response;
            });

            const req = new Request('https://abstractify.app/api/doi-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dois: ['10.1000/cached', 'https://doi.org/10.1000/fetched', '10.1000/fail'],
                }),
            });

            const res = await doiCheckHandler(req, {} as any);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.results['10.1000/cached']).toBeDefined();
            expect(data.results['10.1000/fetched']).toBeDefined();
            expect(data.results['10.1000/fail']).toBeNull();
        });

        it('POST returns 400 when neither doi nor dois is provided or array is empty', async () => {
            const req1 = new Request('https://abstractify.app/api/doi-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const res1 = await doiCheckHandler(req1, {} as any);
            expect(res1.status).toBe(400);

            const req2 = new Request('https://abstractify.app/api/doi-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dois: [] }),
            });
            const res2 = await doiCheckHandler(req2, {} as any);
            expect(res2.status).toBe(400);
        });

        it('returns 405 on unsupported method like PUT', async () => {
            const req = new Request('https://abstractify.app/api/doi-check', {
                method: 'PUT',
            });
            const res = await doiCheckHandler(req, {} as any);
            expect(res.status).toBe(405);
        });

        it('handles internal errors gracefully with 500 response', async () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            // Cause error by passing a bad URL
            const req = {
                method: 'GET',
                headers: new Headers(),
                get url() {
                    throw new Error('Corrupted request URL');
                },
            } as any;

            const res = await doiCheckHandler(req, {} as any);
            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe('Internal server error');
            errorSpy.mockRestore();
        });
    });
});
