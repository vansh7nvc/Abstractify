/**
 * arXiv Preprint Server Search Integration
 * Issue #27: Queries the official arXiv API (Atom/XML feed)
 * to retrieve cutting-edge preprints, primary disciplines, and open-access PDF links.
 */

import { Paper } from '../../_utils.js';
import { sanitizeTitle } from './pubmed.js';
import { sanitizeAbstract } from './core-api.js';

export interface ArxivOptions {
    timeoutMs?: number;
    sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
    sortOrder?: 'ascending' | 'descending';
    start?: number;
}

export interface ArxivEntry {
    id: string;
    rawId: string;
    title: string;
    authors: string[];
    year: number;
    abstract: string;
    pdfUrl?: string;
    primaryCategory?: string;
    doi?: string;
}

/**
 * Extracts inner text content of an XML tag.
 */
export function extractXmlTagContent(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
}

/**
 * Extracts attribute value from an XML tag.
 */
export function extractXmlAttribute(xml: string, tagName: string, attributeName: string): string {
    const regex = new RegExp(`<${tagName}\\s+[^>]*?${attributeName}=["']([^"']+)["'][^>]*>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
}

/**
 * Parses arXiv accession ID from raw entry ID URL.
 * e.g., "http://arxiv.org/abs/2310.06825v1" -> "arXiv:2310.06825"
 */
export function parseArxivId(rawId: string): { cleanId: string; formattedId: string } {
    if (!rawId) return { cleanId: '', formattedId: '' };
    const cleaned = rawId
        .replace(/^https?:\/\/arxiv\.org\/abs\//i, '')
        .replace(/^https?:\/\/arxiv\.org\/pdf\//i, '')
        .replace(/\.pdf$/i, '')
        .trim();

    return {
        cleanId: cleaned,
        formattedId: cleaned ? `arXiv:${cleaned}` : '',
    };
}

/**
 * Extracts 4-digit publication year from ISO published string.
 */
export function parseArxivYear(publishedStr: string): number {
    if (!publishedStr) return new Date().getFullYear();
    const match = publishedStr.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed)) return parsed;
    }
    return new Date().getFullYear();
}

/**
 * Parses all author names from an arXiv entry XML.
 */
export function parseArxivAuthors(entryXml: string): string[] {
    const authors: string[] = [];
    const authorRegex = /<author(?:\s+[^>]*)?>([\s\S]*?)<\/author>/gi;
    let match: RegExpExecArray | null;

    while ((match = authorRegex.exec(entryXml)) !== null) {
        const authorBlock = match[1];
        const name = extractXmlTagContent(authorBlock, 'name');
        if (name) {
            const cleanName = sanitizeTitle(name);
            if (cleanName) {
                authors.push(cleanName);
            }
        }
    }

    return authors;
}

/**
 * Resolves the direct PDF URL from link tags or accession ID.
 */
export function parseArxivPdfUrl(entryXml: string, cleanId: string): string {
    // 1. Check <link title="pdf" ...>
    const linkRegex = /<link\s+[^>]*?title=["']pdf["'][^>]*>/i;
    const linkMatch = entryXml.match(linkRegex);
    if (linkMatch) {
        const hrefMatch = linkMatch[0].match(/href=["']([^"']+)["']/i);
        if (hrefMatch && hrefMatch[1]) {
            return hrefMatch[1].replace(/^http:\/\//i, 'https://').trim();
        }
    }

    // 2. Check <link type="application/pdf" ...>
    const typeRegex = /<link\s+[^>]*?type=["']application\/pdf["'][^>]*>/i;
    const typeMatch = entryXml.match(typeRegex);
    if (typeMatch) {
        const hrefMatch = typeMatch[0].match(/href=["']([^"']+)["']/i);
        if (hrefMatch && hrefMatch[1]) {
            return hrefMatch[1].replace(/^http:\/\//i, 'https://').trim();
        }
    }

    // 3. Fallback: construct standard arXiv PDF URL if cleanId is available
    if (cleanId) {
        return `https://arxiv.org/pdf/${cleanId}.pdf`;
    }

    return '';
}

/**
 * Parses raw arXiv Atom XML feed into structured ArxivEntry array.
 */
export function parseArxivAtomFeed(xml: string): ArxivEntry[] {
    if (!xml || typeof xml !== 'string') return [];

    const entries: ArxivEntry[] = [];
    const entryRegex = /<entry(?:\s+[^>]*)?>([\s\S]*?)<\/entry>/gi;
    let match: RegExpExecArray | null;

    while ((match = entryRegex.exec(xml)) !== null) {
        const entryXml = match[1];

        const rawId = extractXmlTagContent(entryXml, 'id');
        const { cleanId, formattedId } = parseArxivId(rawId);
        if (!cleanId) continue;

        const rawTitle = extractXmlTagContent(entryXml, 'title');
        const title = sanitizeTitle(rawTitle);
        if (!title) continue;

        const authors = parseArxivAuthors(entryXml);
        const publishedStr = extractXmlTagContent(entryXml, 'published');
        const year = parseArxivYear(publishedStr);

        const rawSummary = extractXmlTagContent(entryXml, 'summary');
        const abstract = sanitizeAbstract(rawSummary);

        const pdfUrl = parseArxivPdfUrl(entryXml, cleanId);

        // Primary category: <arxiv:primary_category term="cs.AI" /> or <category term="..." />
        const primaryCategory =
            extractXmlAttribute(entryXml, 'arxiv:primary_category', 'term') ||
            extractXmlAttribute(entryXml, 'category', 'term') ||
            undefined;

        // DOI if present: <arxiv:doi>10.48550/arXiv.2310.06825</arxiv:doi>
        const rawDoi = extractXmlTagContent(entryXml, 'arxiv:doi') || undefined;
        const doi = rawDoi
            ? rawDoi
                  .replace(/^https?:\/\/doi\.org\//i, '')
                  .replace(/^doi:\s*/i, '')
                  .trim()
            : undefined;

        entries.push({
            id: formattedId,
            rawId,
            title,
            authors,
            year,
            abstract,
            pdfUrl: pdfUrl || undefined,
            primaryCategory,
            doi,
        });
    }

    return entries;
}

/**
 * Searches the arXiv Preprint Server API (Atom XML Feed).
 *
 * @param query Search query string
 * @param limit Maximum preprints to retrieve (default 20, max 100)
 * @param options Configurable options (timeoutMs, sortBy, sortOrder, start)
 * @returns Array of normalized Paper objects
 */
export async function searchArxiv(
    query: string,
    limit = 20,
    options: ArxivOptions = {},
): Promise<Paper[]> {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    const timeoutMs = options.timeoutMs ?? 2500;
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const start = Math.max(0, options.start ?? 0);
    const sortBy = options.sortBy || 'relevance';
    const sortOrder = options.sortOrder || 'descending';

    // Construct search URL using HTTPS export.arxiv.org
    const apiUrl = new URL('https://export.arxiv.org/api/query');
    apiUrl.searchParams.set('search_query', `all:${trimmed}`);
    apiUrl.searchParams.set('start', String(start));
    apiUrl.searchParams.set('max_results', String(safeLimit));
    apiUrl.searchParams.set('sortBy', sortBy);
    apiUrl.searchParams.set('sortOrder', sortOrder);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(apiUrl.toString(), {
            headers: {
                'User-Agent': 'AbstractiFy Research App (https://abstractify.app)',
                Accept: 'application/atom+xml, application/xml, text/xml',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(
                `[arXiv API] Request failed with HTTP ${response.status}: ${response.statusText}`,
            );
            return [];
        }

        const xmlText = await response.text();
        const entries = parseArxivAtomFeed(xmlText);

        const papers: Paper[] = entries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            authors: entry.authors,
            year: entry.year,
            abstract: entry.abstract,
            doi: entry.doi,
            citations: 0,
            downloadUrl: entry.pdfUrl,
            primaryCategory: entry.primaryCategory,
        }));

        return papers;
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.warn(`[arXiv API] Request timed out after ${timeoutMs}ms`);
        } else {
            console.warn('[arXiv API] Network error during preprint search:', err.message || err);
        }
        return [];
    }
}
