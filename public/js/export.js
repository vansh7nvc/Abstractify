/**
 * AbstractiFy Export Suite Utilities
 * Supports exporting search results, consensus metrics, and matrices to Markdown, CSV, JSON, and BibTeX.
 */

/**
 * Format search results and consensus analysis as Markdown
 * @param {string} query
 * @param {Object|null} consensus
 * @param {Array<Object>} papers
 * @returns {string}
 */
export function exportToMarkdown(query, consensus, papers) {
    let md = `# 🔬 AbstractiFy Research Summary\n\n`;
    md += `**Query:** ${query || 'N/A'}\n`;
    md += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;

    if (consensus) {
        md += `## 📊 Consensus Overview\n\n`;
        md += `- **Supports:** ${consensus.supports ?? 0}%\n`;
        md += `- **Neutral / Inconclusive:** ${consensus.neutral ?? 0}%\n`;
        md += `- **Contradicts:** ${consensus.contradicts ?? 0}%\n\n`;
        if (consensus.summary) {
            md += `### Summary\n${consensus.summary}\n\n`;
        }
    }

    md += `## 📚 Publications Matrix (${papers.length})\n\n`;
    md += `| Title | Authors | Year | Citations | Stance | DOI |\n`;
    md += `|---|---|---|---|---|---|\n`;

    (papers || []).forEach(p => {
        const authors = (p.authors && p.authors.length > 0) ? p.authors.join(', ') : 'Unknown';
        const doi = p.doi ? `[${p.doi}](https://doi.org/${p.doi})` : 'N/A';
        const title = (p.title || '').replace(/\|/g, '\\|');
        const authorStr = authors.replace(/\|/g, '\\|');
        md += `| ${title} | ${authorStr} | ${p.year || 'N/A'} | ${p.citations ?? 0} | ${p.consensusStance || 'Neutral'} | ${doi} |\n`;
    });

    return md;
}

/**
 * Escape string for CSV output
 * @param {string|number|undefined} field
 * @returns {string}
 */
function escapeCsv(field) {
    if (field === undefined || field === null) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
}

/**
 * Format paper matrix as CSV
 * @param {Array<Object>} papers
 * @returns {string}
 */
export function exportToCsv(papers) {
    const headers = ['ID', 'Title', 'Authors', 'Year', 'Citations', 'Stance', 'DOI', 'Abstract'];
    const rows = (papers || []).map(p => [
        escapeCsv(p.id),
        escapeCsv(p.title),
        escapeCsv((p.authors || []).join('; ')),
        escapeCsv(p.year || ''),
        escapeCsv(p.citations ?? 0),
        escapeCsv(p.consensusStance || 'Neutral'),
        escapeCsv(p.doi || ''),
        escapeCsv(p.abstract || '')
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Format full session data as JSON string
 * @param {string} query
 * @param {Object|null} consensus
 * @param {Array<Object>} papers
 * @returns {string}
 */
export function exportToJson(query, consensus, papers) {
    const exportData = {
        meta: {
            exportedAt: new Date().toISOString(),
            query: query || '',
            paperCount: (papers || []).length
        },
        consensus: consensus || {},
        papers: papers || []
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Format publication list into standard BibTeX entries
 * @param {Array<Object>} papers
 * @returns {string}
 */
export function exportToBibTeX(papers) {
    return (papers || []).map((p, idx) => {
        const citeKey = p.id ? p.id.replace(/[^a-zA-Z0-9]/g, '') : `paper${idx + 1}`;
        const firstAuthor = (p.authors && p.authors.length > 0) ? p.authors[0].split(' ').pop() : 'Anonymous';
        const year = p.year || new Date().getFullYear();
        const bibKey = `${firstAuthor}${year}_${citeKey}`;

        let entry = `@article{${bibKey},\n`;
        entry += `  title = {${p.title}},\n`;
        if (p.authors && p.authors.length > 0) {
            entry += `  author = {${p.authors.join(' and ')}},\n`;
        }
        if (p.year) {
            entry += `  year = {${p.year}},\n`;
        }
        if (p.doi) {
            entry += `  doi = {${p.doi}},\n`;
        }
        if (p.abstract) {
            const cleanAbstract = p.abstract.replace(/\n/g, ' ');
            entry += `  abstract = {${cleanAbstract}}\n`;
        } else {
            entry = entry.slice(0, -2) + '\n';
        }
        entry += `}`;
        return entry;
    }).join('\n\n');
}
