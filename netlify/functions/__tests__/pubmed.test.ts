import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    searchPubMed,
    sanitizeTitle,
    extractYearFromPubDate,
    ESearchResponse,
    ESummaryResponse
} from '../search/sources/pubmed.js';

describe('PubMed & MEDLINE Biomedical Search Integration (Issue #25)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('sanitizeTitle', () => {
        it('strips XML and HTML tags cleanly', () => {
            const raw = '<i>In vivo</i> delivery of <b>CRISPR-Cas9</b> in mice.';
            expect(sanitizeTitle(raw)).toBe('In vivo delivery of CRISPR-Cas9 in mice');
        });

        it('decodes HTML and XML character entities', () => {
            const raw = 'Safety &amp; efficacy of &lt;monoclonal antibodies&gt; in Alzheimer&#39;s disease &quot;trials&quot;.';
            expect(sanitizeTitle(raw)).toBe('Safety & efficacy of <monoclonal antibodies> in Alzheimer\'s disease "trials"');
        });

        it('normalizes internal whitespace and trims ends', () => {
            const raw = '   Clinical    outcomes   in \n\n SGLT2   inhibitors.   ';
            expect(sanitizeTitle(raw)).toBe('Clinical outcomes in SGLT2 inhibitors');
        });

        it('handles undefined or empty titles gracefully', () => {
            expect(sanitizeTitle('')).toBe('');
            expect(sanitizeTitle(undefined)).toBe('');
        });
    });

    describe('extractYearFromPubDate', () => {
        it('extracts 4-digit year from standard pubdate strings', () => {
            expect(extractYearFromPubDate('2023 Dec 15')).toBe(2023);
            expect(extractYearFromPubDate('2021 Winter')).toBe(2021);
            expect(extractYearFromPubDate('2020')).toBe(2020);
            expect(extractYearFromPubDate('2024/05/18')).toBe(2024);
        });

        it('falls back to current year when date string is missing or invalid', () => {
            const currentYear = new Date().getFullYear();
            expect(extractYearFromPubDate(undefined)).toBe(currentYear);
            expect(extractYearFromPubDate('Unknown Date')).toBe(currentYear);
        });
    });

    describe('searchPubMed', () => {
        it('returns empty array when query is empty or whitespace', async () => {
            const papers = await searchPubMed('   ');
            expect(papers).toEqual([]);
        });

        it('returns empty array when ESearch finds 0 results', async () => {
            const mockESearch: ESearchResponse = {
                esearchresult: {
                    count: '0',
                    idlist: []
                }
            };

            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockESearch
            });
            vi.stubGlobal('fetch', fetchMock);

            const papers = await searchPubMed('nonexistent_protein_12345');
            expect(papers).toEqual([]);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('retrieves and parses PubMed articles across ESearch and ESummary', async () => {
            const mockESearch: ESearchResponse = {
                esearchresult: {
                    count: '2',
                    idlist: ['35113657', '31234568']
                }
            };

            const mockESummary: ESummaryResponse = {
                result: {
                    uids: ['35113657', '31234568'],
                    '35113657': {
                        uid: '35113657',
                        title: 'Efficacy of <i>Dapagliflozin</i> in Chronic Kidney Disease.',
                        authors: [
                            { name: 'Heerspink HJL' },
                            { name: 'Stefánsson BV' }
                        ],
                        source: 'N Engl J Med',
                        pubdate: '2020 Oct 8',
                        articleids: [
                            { idtype: 'pubmed', value: '35113657' },
                            { idtype: 'doi', value: '10.1056/NEJMoa2024816' }
                        ],
                        pmcrefcount: 245,
                        abstract: 'Among patients with chronic kidney disease, the risk of a composite of sustained decline in estimated GFR was significantly lower.'
                    },
                    '31234568': {
                        uid: '31234568',
                        title: 'Amyloid-beta clearing therapies in early Alzheimer&#39;s.',
                        authors: [
                            { name: 'van Dyck CH' }
                        ],
                        source: 'Lancet Neurol',
                        pubdate: '2022',
                        articleids: [
                            { idtype: 'doi', value: '10.1016/S1474-4422(22)00412-9' }
                        ],
                        pmcrefcount: 88
                    }
                }
            };

            const fetchMock = vi.fn().mockImplementation(async (url: string) => {
                if (url.includes('esearch.fcgi')) {
                    return {
                        ok: true,
                        json: async () => mockESearch
                    };
                }
                if (url.includes('esummary.fcgi')) {
                    return {
                        ok: true,
                        json: async () => mockESummary
                    };
                }
                return { ok: false, status: 404 };
            });
            vi.stubGlobal('fetch', fetchMock);

            const papers = await searchPubMed('Dapagliflozin CKD', 10);
            expect(papers).toHaveLength(2);

            // Verify First Paper
            expect(papers[0].id).toBe('PMID:35113657');
            expect(papers[0].title).toBe('Efficacy of Dapagliflozin in Chronic Kidney Disease');
            expect(papers[0].authors).toEqual(['Heerspink HJL', 'Stefánsson BV']);
            expect(papers[0].year).toBe(2020);
            expect(papers[0].doi).toBe('10.1056/NEJMoa2024816');
            expect(papers[0].citations).toBe(245);
            expect(papers[0].abstract).toContain('composite of sustained decline');

            // Verify Second Paper (synthesized abstract from metadata)
            expect(papers[1].id).toBe('PMID:31234568');
            expect(papers[1].title).toBe("Amyloid-beta clearing therapies in early Alzheimer's");
            expect(papers[1].year).toBe(2022);
            expect(papers[1].doi).toBe('10.1016/S1474-4422(22)00412-9');
            expect(papers[1].citations).toBe(88);
            expect(papers[1].abstract).toContain('Indexed in MEDLINE/PubMed');
        });

        it('handles ESearch HTTP errors gracefully without throwing', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: false,
                status: 500
            });
            vi.stubGlobal('fetch', fetchMock);

            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const papers = await searchPubMed('cancer trial');
            expect(papers).toEqual([]);
            warnSpy.mockRestore();
        });

        it('handles ESummary HTTP errors gracefully without throwing', async () => {
            const fetchMock = vi.fn().mockImplementation(async (url: string) => {
                if (url.includes('esearch.fcgi')) {
                    return {
                        ok: true,
                        json: async () => ({ esearchresult: { idlist: ['12345'] } })
                    };
                }
                return { ok: false, status: 503 };
            });
            vi.stubGlobal('fetch', fetchMock);

            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const papers = await searchPubMed('genomics');
            expect(papers).toEqual([]);
            warnSpy.mockRestore();
        });

        it('handles request timeouts or AbortError gracefully', async () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';

            const fetchMock = vi.fn().mockRejectedValue(abortError);
            vi.stubGlobal('fetch', fetchMock);

            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const papers = await searchPubMed('CRISPR', 5, { timeoutMs: 100 });
            expect(papers).toEqual([]);
            warnSpy.mockRestore();
        });
    });
});
