import { describe, it, expect } from 'vitest';
import {
    exportToMarkdown,
    exportToCsv,
    exportToJson,
    exportToBibTeX,
    exportToRis
} from '../js/export.js';

describe('public/js/export.js', () => {
    const samplePapers = [
        {
            id: 'paper-1',
            title: 'Quantum Computing | Machine Learning',
            authors: ['Alice Smith', 'Bob Jones'],
            year: 2024,
            abstract: 'An in-depth study of quantum algorithms. Line 2 of abstract.',
            doi: '10.1000/182',
            citations: 42,
            consensusStance: 'Supports'
        },
        {
            id: 'paper-2',
            title: 'Classical Analysis of Neural Networks',
            authors: [],
            year: undefined,
            abstract: '',
            citations: 0
        }
    ];

    const sampleConsensus = {
        supports: 70,
        neutral: 20,
        contradicts: 10,
        summary: 'Strong scientific consensus identified.'
    };

    describe('exportToMarkdown', () => {
        it('formats markdown with query, consensus, and paper table', () => {
            const md = exportToMarkdown('Quantum AI', sampleConsensus, samplePapers);
            expect(md).toContain('# 🔬 AbstractiFy Research Summary');
            expect(md).toContain('**Query:** Quantum AI');
            expect(md).toContain('- **Supports:** 70%');
            expect(md).toContain('Strong scientific consensus identified.');
            expect(md).toContain('| Quantum Computing \\| Machine Learning | Alice Smith, Bob Jones | 2024 | 42 | Supports | [10.1000/182](https://doi.org/10.1000/182) |');
            expect(md).toContain('| Classical Analysis of Neural Networks | Unknown | N/A | 0 | Neutral | N/A |');
        });

        it('handles null consensus and empty query gracefully', () => {
            const md = exportToMarkdown('', null, []);
            expect(md).toContain('**Query:** N/A');
            expect(md).not.toContain('Consensus Overview');
            expect(md).toContain('## 📚 Publications Matrix (0)');
        });
    });

    describe('exportToCsv', () => {
        it('generates properly formatted CSV with escaped double quotes', () => {
            const csv = exportToCsv(samplePapers);
            const lines = csv.split('\n');

            expect(lines[0]).toBe('ID,Title,Authors,Year,Citations,Stance,DOI,Abstract');
            expect(lines[1]).toContain('"paper-1"');
            expect(lines[1]).toContain('"Quantum Computing | Machine Learning"');
            expect(lines[1]).toContain('"Alice Smith; Bob Jones"');
            expect(lines[1]).toContain('"2024"');
            expect(lines[1]).toContain('"42"');
            expect(lines[1]).toContain('"Supports"');
            expect(lines[1]).toContain('"10.1000/182"');

            // Paper 2 with missing fields
            expect(lines[2]).toContain('"paper-2"');
            expect(lines[2]).toContain('"Classical Analysis of Neural Networks"');
            expect(lines[2]).toContain('""'); // Empty authors
        });
    });

    describe('exportToJson', () => {
        it('returns structured JSON string with metadata, consensus, and papers', () => {
            const jsonStr = exportToJson('Quantum AI', sampleConsensus, samplePapers);
            const parsed = JSON.parse(jsonStr);

            expect(parsed.meta.query).toBe('Quantum AI');
            expect(parsed.meta.paperCount).toBe(2);
            expect(parsed.consensus.supports).toBe(70);
            expect(parsed.papers[0].title).toBe('Quantum Computing | Machine Learning');
        });

        it('handles null consensus and empty fields in JSON export', () => {
            const jsonStr = exportToJson('', null, []);
            const parsed = JSON.parse(jsonStr);

            expect(parsed.meta.query).toBe('');
            expect(parsed.meta.paperCount).toBe(0);
            expect(parsed.consensus).toEqual({});
        });
    });

    describe('exportToBibTeX', () => {
        it('generates BibTeX article entries for papers', () => {
            const bib = exportToBibTeX(samplePapers);

            expect(bib).toContain('@article{Smith2024_paper1,');
            expect(bib).toContain('title = {Quantum Computing | Machine Learning},');
            expect(bib).toContain('author = {Alice Smith and Bob Jones},');
            expect(bib).toContain('year = {2024},');
            expect(bib).toContain('doi = {10.1000/182},');
            expect(bib).toContain('abstract = {An in-depth study of quantum algorithms. Line 2 of abstract.}');

            expect(bib).toContain('@article{Anonymous');
            expect(bib).toContain('title = {Classical Analysis of Neural Networks}');
        });
    });

    describe('exportToRis', () => {
        const risPapers = [
            {
                id: 'paper-1',
                title: 'Attention Is All You Need',
                authors: ['Ashish Vaswani', 'Noam Shazeer'],
                year: 2017,
                venue: 'Advances in Neural Information Processing Systems',
                doi: '10.48550/arXiv.1706.03762',
                url: 'https://arxiv.org/abs/1706.03762',
                abstract: 'The dominant sequence transduction models.\nA second line of the abstract.'
            }
        ];

        it('emits a complete RIS record with the expected tags in order', () => {
            const ris = exportToRis(risPapers);
            const lines = ris.split('\r\n');

            expect(lines[0]).toBe('TY  - JOUR');
            expect(lines[1]).toBe('TI  - Attention Is All You Need');
            expect(lines[2]).toBe('AU  - Vaswani, Ashish');
            expect(lines[3]).toBe('AU  - Shazeer, Noam');
            expect(lines[4]).toBe('PY  - 2017');
            expect(lines[5]).toBe('JO  - Advances in Neural Information Processing Systems');
            expect(lines[6]).toBe('DO  - 10.48550/arXiv.1706.03762');
            expect(lines[7]).toBe('UR  - https://arxiv.org/abs/1706.03762');
            expect(lines[8]).toBe('AB  - The dominant sequence transduction models. A second line of the abstract.');
            expect(lines[9]).toBe('ER  - ');
        });

        it('uses CRLF line endings and terminates every record with ER', () => {
            const ris = exportToRis(risPapers);
            expect(ris.endsWith('ER  - \r\n')).toBe(true);
            expect(ris.split('\n').every(l => l === '' || l.endsWith('\r'))).toBe(true);
        });

        it('separates multiple records with a blank line', () => {
            const ris = exportToRis(samplePapers);
            const records = ris.split('ER  - \r\n').filter(Boolean);
            expect(records).toHaveLength(2);
            expect(records[1].startsWith('\r\nTY  - JOUR')).toBe(true);
        });

        it('omits tags for missing fields instead of emitting empty values', () => {
            const ris = exportToRis(samplePapers);
            const second = ris.split('ER  - \r\n')[1];

            expect(second).toContain('TI  - Classical Analysis of Neural Networks');
            expect(second).not.toContain('AU  - ');
            expect(second).not.toContain('PY  - ');
            expect(second).not.toContain('DO  - ');
            expect(second).not.toContain('AB  - ');
        });

        it('emits AU for string authors and for { name } author objects', () => {
            const ris = exportToRis([{ title: 'T', authors: ['Ashish Vaswani', { name: 'Noam Shazeer' }, { name: '' }, null] }]);
            expect(ris).toContain('AU  - Vaswani, Ashish');
            expect(ris).toContain('AU  - Shazeer, Noam');
            expect(ris.match(/^AU {2}- /gm)).toHaveLength(2);
        });

        it('keeps an author name that is already in "Last, First" form', () => {
            const ris = exportToRis([{ title: 'T', authors: ['van der Berg, Jan', 'Plato'] }]);
            expect(ris).toContain('AU  - van der Berg, Jan');
            expect(ris).toContain('AU  - Plato');
        });

        it('returns an empty string for no papers', () => {
            expect(exportToRis([])).toBe('');
            expect(exportToRis(null)).toBe('');
        });
    });
});
