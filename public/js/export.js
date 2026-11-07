/**
 * AbstractiFy Export Suite Utilities
 * Supports exporting search results, consensus metrics, and matrices to Markdown, CSV, JSON, BibTeX, and RIS.
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
        const citeKey = p.id ? String(p.id).replace(/[^a-zA-Z0-9]/g, '') : `paper${idx + 1}`;
        const firstAuthor = (p.authors && p.authors.length > 0)
            ? (typeof p.authors[0] === 'string' ? p.authors[0] : (p.authors[0].name || '')).split(' ').pop()
            : 'Anonymous';
        const year = p.year || new Date().getFullYear();
        const bibKey = `${firstAuthor || 'Anonymous'}${year}_${citeKey}`;
        const title = p.title || 'Untitled';
        const journal = p.journal || p.venue;

        let entry = `@article{${bibKey},\n`;
        entry += `  title = {${title}},\n`;
        if (p.authors && p.authors.length > 0) {
            const authorList = p.authors
                .map(a => typeof a === 'string' ? a : (a && a.name ? a.name : ''))
                .filter(Boolean);
            if (authorList.length > 0) {
                entry += `  author = {${authorList.join(' and ')}},\n`;
            }
        }
        if (journal) {
            entry += `  journal = {${journal}},\n`;
        }
        if (p.volume) {
            entry += `  volume = {${p.volume}},\n`;
        }
        if (p.issue || p.number) {
            entry += `  number = {${p.issue || p.number}},\n`;
        }
        if (p.pages) {
            entry += `  pages = {${p.pages}},\n`;
        }
        if (p.year) {
            entry += `  year = {${p.year}},\n`;
        }
        if (p.doi) {
            entry += `  doi = {${p.doi}},\n`;
        }
        if (p.url) {
            entry += `  url = {${p.url}},\n`;
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
/**
 * Render one RIS tag line, or an empty string when the field is absent.
 * RIS keeps one field per line, so embedded newlines are folded to spaces.
 * @param {string} tag Two-character RIS tag
 * @param {string|number|undefined|null} value
 * @returns {string}
 */
function risLine(tag, value) {
    if (value === undefined || value === null || value === '') return '';
    const oneLine = String(value).replace(/\s*\r?\n\s*/g, ' ').trim();
    if (!oneLine) return '';
    return `${tag}  - ${oneLine}\r\n`;
}

/**
 * Normalise an author to the RIS "Last, First" convention.
 * A name that already contains a comma is assumed to be in that form and is
 * left untouched; a single-word name (e.g. "Plato") is emitted as-is.
 * @param {string} name
 * @returns {string}
 */
function risAuthor(author) {
    const rawName = typeof author === 'string'
        ? author
        : (author && typeof author === 'object' && author.name ? author.name : '');
    const clean = rawName.replace(/\s+/g, ' ').trim();
    if (!clean || clean.includes(',')) return clean;

    const parts = clean.split(' ');
    if (parts.length < 2) return clean;
    return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
}

/**
 * Format publication list as RIS, the tagged interchange format that Zotero,
 * Mendeley, EndNote and RefWorks import natively.
 * Records are CRLF-delimited and separated by a blank line; absent fields are
 * omitted rather than emitted empty, which every RIS parser treats as unset.
 * @param {Array<Object>} papers
 * @returns {string}
 */
export function exportToRis(papers) {
    return (papers || []).map(p => {
        let entry = 'TY  - JOUR\r\n';
        entry += risLine('TI', p.title);
        (p.authors || []).forEach(a => {
            entry += risLine('AU', risAuthor(a));
        });
        entry += risLine('PY', p.year);
        entry += risLine('JO', p.venue);
        entry += risLine('DO', p.doi);
        entry += risLine('UR', p.url);
        entry += risLine('AB', p.abstract);
        entry += 'ER  - \r\n';
        return entry;
    }).join('\r\n');
}

/**
 * Normalizes an author string or object into constituent parts (first, last, initials).
 * @param {string|Object} author
 * @returns {{ first: string, last: string, initials: string, full: string }}
 */
export function parseAuthorName(author) {
    const raw = typeof author === 'string'
        ? author
        : (author && typeof author === 'object' && author.name ? author.name : '');
    const clean = raw.replace(/\s+/g, ' ').trim();
    if (!clean) return { first: '', last: '', initials: '', full: '' };

    if (clean.includes(',')) {
        const [last, ...rest] = clean.split(',').map(s => s.trim());
        const first = rest.join(' ');
        const initials = first.split(/\s+/).filter(Boolean).map(n => n[0].toUpperCase() + '.').join(' ');
        return { first, last, initials, full: clean };
    }

    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return { first: '', last: parts[0], initials: '', full: parts[0] };
    }
    const last = parts[parts.length - 1];
    const first = parts.slice(0, -1).join(' ');
    const initials = parts.slice(0, -1).map(n => n[0].toUpperCase() + '.').join(' ');
    return { first, last, initials, full: clean };
}

/**
 * Format a single publication in APA 7th style.
 * @param {Object} paper
 * @returns {string}
 */
export function formatAPA(paper) {
    if (!paper) return '';
    const authors = paper.authors || [];
    let authorStr = 'Unknown Author';

    if (authors.length === 1) {
        const a = parseAuthorName(authors[0]);
        authorStr = a.initials ? `${a.last}, ${a.initials}` : a.last || 'Unknown Author';
    } else if (authors.length === 2) {
        const a1 = parseAuthorName(authors[0]);
        const a2 = parseAuthorName(authors[1]);
        const s1 = a1.initials ? `${a1.last}, ${a1.initials}` : a1.last;
        const s2 = a2.initials ? `${a2.last}, ${a2.initials}` : a2.last;
        authorStr = `${s1}, & ${s2}`;
    } else if (authors.length >= 3 && authors.length <= 20) {
        const formatted = authors.map(author => {
            const a = parseAuthorName(author);
            return a.initials ? `${a.last}, ${a.initials}` : a.last;
        });
        const lastAuthor = formatted.pop();
        authorStr = `${formatted.join(', ')}, & ${lastAuthor}`;
    } else if (authors.length > 20) {
        const first19 = authors.slice(0, 19).map(author => {
            const a = parseAuthorName(author);
            return a.initials ? `${a.last}, ${a.initials}` : a.last;
        });
        const lastAuthor = parseAuthorName(authors[authors.length - 1]);
        const lastStr = lastAuthor.initials ? `${lastAuthor.last}, ${lastAuthor.initials}` : lastAuthor.last;
        authorStr = `${first19.join(', ')}, ... ${lastStr}`;
    }

    const yearStr = paper.year ? `(${paper.year}).` : '(n.d.).';
    const cleanTitle = (paper.title || 'Untitled').trim().replace(/\.$/, '');
    const titleStr = `${cleanTitle}.`;

    const venue = paper.venue || paper.journal;
    let venueStr = '';
    if (venue) {
        venueStr = ` ${venue}`;
        if (paper.volume) {
            venueStr += `, ${paper.volume}`;
            if (paper.issue || paper.number) {
                venueStr += `(${paper.issue || paper.number})`;
            }
        }
        if (paper.pages) {
            venueStr += `, ${paper.pages}`;
        }
        venueStr += '.';
    }
    const doiStr = paper.doi ? ` https://doi.org/${paper.doi}` : (paper.url ? ` ${paper.url}` : '');

    return `${authorStr} ${yearStr} ${titleStr}${venueStr}${doiStr}`.trim();
}

/**
 * Format paper collection as APA 7th bibliography.
 * @param {Array<Object>} papers
 * @returns {string}
 */
export function exportToAPA(papers) {
    return (papers || []).map(p => formatAPA(p)).join('\n\n');
}

/**
 * Format a single publication in MLA 9th style.
 * @param {Object} paper
 * @returns {string}
 */
export function formatMLA(paper) {
    if (!paper) return '';
    const authors = paper.authors || [];
    let authorStr = 'Unknown Author.';

    if (authors.length === 1) {
        const a = parseAuthorName(authors[0]);
        authorStr = a.first ? `${a.last}, ${a.first}.` : `${a.last}.`;
    } else if (authors.length === 2) {
        const a1 = parseAuthorName(authors[0]);
        const a2 = parseAuthorName(authors[1]);
        const s1 = a1.first ? `${a1.last}, ${a1.first}` : a1.last;
        const s2 = a2.first ? `${a2.first} ${a2.last}` : a2.last;
        authorStr = `${s1}, and ${s2}.`;
    } else if (authors.length >= 3) {
        const a1 = parseAuthorName(authors[0]);
        const s1 = a1.first ? `${a1.last}, ${a1.first}` : a1.last;
        authorStr = `${s1}, et al.`;
    }

    const cleanTitle = (paper.title || 'Untitled').trim().replace(/\.$/, '');
    const titleStr = `"${cleanTitle}."`;

    const parts = [];
    const venue = paper.venue || paper.journal;
    if (venue) parts.push(venue);
    if (paper.volume) parts.push(`vol. ${paper.volume}`);
    if (paper.issue || paper.number) parts.push(`no. ${paper.issue || paper.number}`);
    if (paper.year) parts.push(String(paper.year));
    if (paper.pages) parts.push(`pp. ${paper.pages}`);
    if (paper.doi) parts.push(`https://doi.org/${paper.doi}`);
    else if (paper.url) parts.push(paper.url);

    if (parts.length === 0) {
        return `${authorStr} ${titleStr}`.trim();
    }

    return `${authorStr} ${titleStr} ${parts.join(', ')}.`.trim();
}

/**
 * Format paper collection as MLA 9th bibliography.
 * @param {Array<Object>} papers
 * @returns {string}
 */
export function exportToMLA(papers) {
    return (papers || []).map(p => formatMLA(p)).join('\n\n');
}

/**
 * Format a single publication in Chicago 17th style.
 * @param {Object} paper
 * @returns {string}
 */
export function formatChicago(paper) {
    if (!paper) return '';
    const authors = paper.authors || [];
    let authorStr = 'Unknown Author.';

    if (authors.length === 1) {
        const a = parseAuthorName(authors[0]);
        authorStr = a.first ? `${a.last}, ${a.first}.` : `${a.last}.`;
    } else if (authors.length === 2) {
        const a1 = parseAuthorName(authors[0]);
        const a2 = parseAuthorName(authors[1]);
        const s1 = a1.first ? `${a1.last}, ${a1.first}` : a1.last;
        const s2 = a2.first ? `${a2.first} ${a2.last}` : a2.last;
        authorStr = `${s1}, and ${s2}.`;
    } else if (authors.length >= 3) {
        const formatted = authors.map((author, idx) => {
            const a = parseAuthorName(author);
            if (idx === 0) return a.first ? `${a.last}, ${a.first}` : a.last;
            return a.first ? `${a.first} ${a.last}` : a.last;
        });
        const lastAuthor = formatted.pop();
        authorStr = `${formatted.join(', ')}, and ${lastAuthor}.`;
    }

    const cleanTitle = (paper.title || 'Untitled').trim().replace(/\.$/, '');
    const titleStr = `"${cleanTitle}."`;

    const venue = paper.venue || paper.journal;
    let pubStr = venue ? ` ${venue}` : '';
    if (venue && paper.volume) {
        pubStr += ` ${paper.volume}`;
        if (paper.issue || paper.number) {
            pubStr += `, no. ${paper.issue || paper.number}`;
        }
    }
    pubStr += paper.year ? ` (${paper.year})` : ' (n.d.)';
    if (paper.pages) {
        pubStr += `: ${paper.pages}`;
    }
    pubStr += '.';

    const doiStr = paper.doi ? ` https://doi.org/${paper.doi}` : (paper.url ? ` ${paper.url}` : '');
    return `${authorStr} ${titleStr}${pubStr}${doiStr}`.trim();
}

/**
 * Format paper collection as Chicago 17th bibliography.
 * @param {Array<Object>} papers
 * @returns {string}
 */
export function exportToChicago(papers) {
    return (papers || []).map(p => formatChicago(p)).join('\n\n');
}

/**
 * Format a single publication in IEEE style.
 * @param {Object} paper
 * @param {number} [index=1]
 * @returns {string}
 */
export function formatIEEE(paper, index = 1) {
    if (!paper) return '';
    const authors = paper.authors || [];
    let authorStr = 'Unknown Author';

    if (authors.length === 1) {
        const a = parseAuthorName(authors[0]);
        authorStr = a.initials ? `${a.initials} ${a.last}` : a.last || 'Unknown Author';
    } else if (authors.length === 2) {
        const a1 = parseAuthorName(authors[0]);
        const a2 = parseAuthorName(authors[1]);
        const s1 = a1.initials ? `${a1.initials} ${a1.last}` : a1.last;
        const s2 = a2.initials ? `${a2.initials} ${a2.last}` : a2.last;
        authorStr = `${s1} and ${s2}`;
    } else if (authors.length >= 3 && authors.length <= 6) {
        const formatted = authors.map(author => {
            const a = parseAuthorName(author);
            return a.initials ? `${a.initials} ${a.last}` : a.last;
        });
        const lastAuthor = formatted.pop();
        authorStr = `${formatted.join(', ')}, and ${lastAuthor}`;
    } else if (authors.length > 6) {
        const a1 = parseAuthorName(authors[0]);
        const s1 = a1.initials ? `${a1.initials} ${a1.last}` : a1.last;
        authorStr = `${s1} et al.`;
    }

    const cleanTitle = (paper.title || 'Untitled').trim().replace(/[.,]$/, '');
    const titleStr = `"${cleanTitle},"`;

    const parts = [];
    const venue = paper.venue || paper.journal;
    if (venue) parts.push(venue);
    if (paper.volume) parts.push(`vol. ${paper.volume}`);
    if (paper.issue || paper.number) parts.push(`no. ${paper.issue || paper.number}`);
    if (paper.pages) parts.push(`pp. ${paper.pages}`);
    if (paper.year) parts.push(String(paper.year));

    let citation = `[${index}] ${authorStr}, ${titleStr}`;
    if (parts.length > 0) {
        citation += ` ${parts.join(', ')}.`;
    }
    if (paper.doi) {
        citation += ` doi: ${paper.doi}.`;
    }

    return citation.trim();
}

/**
 * Format paper collection as IEEE numbered bibliography.
 * @param {Array<Object>} papers
 * @returns {string}
 */
export function exportToIEEE(papers) {
    return (papers || []).map((p, idx) => formatIEEE(p, idx + 1)).join('\n\n');
}

/**
 * Formats publications according to selected citation style.
 * @param {Array<Object>} papers
 * @param {string} [style='apa'] 'apa' | 'mla' | 'chicago' | 'ieee' | 'bibtex' | 'ris'
 * @returns {string}
 */
export function exportBibliography(papers, style = 'apa') {
    const normStyle = String(style || 'apa').toLowerCase();
    switch (normStyle) {
        case 'apa':
            return exportToAPA(papers);
        case 'mla':
            return exportToMLA(papers);
        case 'chicago':
            return exportToChicago(papers);
        case 'ieee':
            return exportToIEEE(papers);
        case 'bibtex':
            return exportToBibTeX(papers);
        case 'ris':
            return exportToRis(papers);
        default:
            return exportToAPA(papers);
    }
}
