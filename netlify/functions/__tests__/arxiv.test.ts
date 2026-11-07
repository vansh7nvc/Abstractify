import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    searchArxiv,
    extractXmlTagContent,
    extractXmlAttribute,
    parseArxivId,
    parseArxivYear,
    parseArxivAuthors,
    parseArxivPdfUrl,
    parseArxivAtomFeed,
} from '../search/sources/arxiv.js';

describe('arXiv Preprint Server Search Integration (Issue #27)', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('XML Parsing Helpers', () => {
        it('extractXmlTagContent extracts inner text and trims whitespace', () => {
            const xml = '<title>  Attention Is All You Need  </title>';
            expect(extractXmlTagContent(xml, 'title')).toBe('Attention Is All You Need');

            const withAttrs = '<id scheme="doi">http://arxiv.org/abs/1706.03762</id>';
            expect(extractXmlTagContent(withAttrs, 'id')).toBe('http://arxiv.org/abs/1706.03762');

            expect(extractXmlTagContent(xml, 'missing')).toBe('');
        });

        it('extractXmlAttribute extracts attribute value', () => {
            const xml = '<arxiv:primary_category term="cs.AI" scheme="http://arxiv.org" />';
            expect(extractXmlAttribute(xml, 'arxiv:primary_category', 'term')).toBe('cs.AI');
            expect(extractXmlAttribute(xml, 'arxiv:primary_category', 'missing')).toBe('');
        });

        it('parseArxivId normalizes abs and pdf links to accession IDs', () => {
            expect(parseArxivId('http://arxiv.org/abs/2310.06825v1')).toEqual({
                cleanId: '2310.06825v1',
                formattedId: 'arXiv:2310.06825v1',
            });
            expect(parseArxivId('https://arxiv.org/pdf/cond-mat/0102536.pdf')).toEqual({
                cleanId: 'cond-mat/0102536',
                formattedId: 'arXiv:cond-mat/0102536',
            });
            expect(parseArxivId('')).toEqual({ cleanId: '', formattedId: '' });
        });

        it('parseArxivYear extracts 4-digit publication year', () => {
            expect(parseArxivYear('2023-10-15T00:00:00Z')).toBe(2023);
            expect(parseArxivYear('1998-05-20')).toBe(1998);
            expect(parseArxivYear('')).toBe(new Date().getFullYear());
        });

        it('parseArxivAuthors extracts and sanitizes author list', () => {
            const xml = `
                <author><name>Ashish Vaswani</name></author>
                <author><name>Noam Shazeer</name></author>
                <author><name>   </name></author>
            `;
            expect(parseArxivAuthors(xml)).toEqual(['Ashish Vaswani', 'Noam Shazeer']);
        });

        it('parseArxivPdfUrl resolves PDF links with https upgrade or fallback', () => {
            const withTitleLink =
                '<link title="pdf" href="http://arxiv.org/pdf/1706.03762v7" rel="related" />';
            expect(parseArxivPdfUrl(withTitleLink, '1706.03762v7')).toBe(
                'https://arxiv.org/pdf/1706.03762v7',
            );

            const withTypeLink =
                '<link href="http://arxiv.org/pdf/2104.12345" type="application/pdf" />';
            expect(parseArxivPdfUrl(withTypeLink, '2104.12345')).toBe(
                'https://arxiv.org/pdf/2104.12345',
            );

            expect(parseArxivPdfUrl('', '2310.06825')).toBe('https://arxiv.org/pdf/2310.06825.pdf');
            expect(parseArxivPdfUrl('', '')).toBe('');
        });
    });

    describe('parseArxivAtomFeed', () => {
        const sampleAtomFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <title type="html">ArXiv Query: search_query=all:quantum</title>
  <entry>
    <id>http://arxiv.org/abs/2012.01234v1</id>
    <published>2020-12-01T14:30:00Z</published>
    <title>
      Quantum Supremacy Using a Programmable
      Superconducting Processor
    </title>
    <summary>
      The promise of quantum computers is that certain computational tasks might be
      executed exponentially faster on a quantum processor than on a classical one.
    </summary>
    <author>
      <name>Frank Arute</name>
    </author>
    <author>
      <name>Kunihiko Arya</name>
    </author>
    <arxiv:doi>10.1038/s41586-019-1666-5</arxiv:doi>
    <link title="pdf" href="http://arxiv.org/pdf/2012.01234v1" rel="related" type="application/pdf"/>
    <arxiv:primary_category term="quant-ph" scheme="http://arxiv.org/schemas/atom"/>
    <category term="quant-ph" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>`;

        it('parses valid feed into normalized ArxivEntry objects', () => {
            const entries = parseArxivAtomFeed(sampleAtomFeed);
            expect(entries).toHaveLength(1);

            const entry = entries[0];
            expect(entry.id).toBe('arXiv:2012.01234v1');
            expect(entry.title).toBe(
                'Quantum Supremacy Using a Programmable Superconducting Processor',
            );
            expect(entry.authors).toEqual(['Frank Arute', 'Kunihiko Arya']);
            expect(entry.year).toBe(2020);
            expect(entry.abstract).toContain(
                'The promise of quantum computers is that certain computational tasks might be executed exponentially faster',
            );
            expect(entry.pdfUrl).toBe('https://arxiv.org/pdf/2012.01234v1');
            expect(entry.primaryCategory).toBe('quant-ph');
            expect(entry.doi).toBe('10.1038/s41586-019-1666-5');
        });

        it('returns empty array when feed has no entries or invalid input', () => {
            expect(parseArxivAtomFeed('')).toEqual([]);
            expect(parseArxivAtomFeed('<feed><title>Empty</title></feed>')).toEqual([]);
        });
    });

    describe('searchArxiv API Client', () => {
        it('returns empty array when query is empty or whitespace', async () => {
            const fetchSpy = vi.spyOn(globalThis, 'fetch');
            const results = await searchArxiv('   ');
            expect(results).toEqual([]);
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('constructs correct query parameters and parses result into Paper[]', async () => {
            const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2301.07067v2</id>
    <published>2023-01-17T18:00:00Z</published>
    <title>Deep Residual Learning for Image Recognition</title>
    <summary>Deeper neural networks are more difficult to train.</summary>
    <author><name>Kaiming He</name></author>
    <link title="pdf" href="http://arxiv.org/pdf/2301.07067v2" rel="related"/>
    <arxiv:primary_category term="cs.CV"/>
  </entry>
</feed>`;

            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => sampleXml,
            } as Response);

            const papers = await searchArxiv('deep learning', 5);

            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('https://export.arxiv.org/api/query'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Accept: expect.stringContaining('application/atom+xml'),
                    }),
                }),
            );

            expect(papers).toHaveLength(1);
            expect(papers[0]).toEqual({
                id: 'arXiv:2301.07067v2',
                title: 'Deep Residual Learning for Image Recognition',
                authors: ['Kaiming He'],
                year: 2023,
                abstract: 'Deeper neural networks are more difficult to train.',
                doi: undefined,
                citations: 0,
                downloadUrl: 'https://arxiv.org/pdf/2301.07067v2',
                primaryCategory: 'cs.CV',
            });
        });

        it('gracefully handles HTTP error responses from arXiv API', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 503,
                statusText: 'Service Temporarily Unavailable',
            } as Response);

            const papers = await searchArxiv('cosmology', 10);
            expect(papers).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 503'));
        });

        it('gracefully handles network abort / timeout', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const abortError = new Error('Request aborted');
            abortError.name = 'AbortError';

            vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

            const papers = await searchArxiv('high energy physics', 10, { timeoutMs: 100 });
            expect(papers).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('timed out'));
        });
    });
});
