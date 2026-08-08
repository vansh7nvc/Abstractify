import { describe, it, expect } from 'vitest';
import {
    exportToMarkdown,
    exportToCsv,
    exportToJson,
    exportToBibTeX
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
});
