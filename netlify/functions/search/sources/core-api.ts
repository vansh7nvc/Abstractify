/**
 * CORE API v3 Open-Access Full-Text Search Integration
 * Issue #26: Connects to the CORE API v3 (/v3/search/works)
 * to retrieve open-access research papers with direct PDF download links.
 */

import { Paper } from '../../_utils.js';
import { sanitizeTitle } from './pubmed.js';

export interface CoreApiAuthor {
    name?: string;
    [key: string]: any;
}

export interface CoreApiItem {
    id?: number | string;
    title?: string;
    authors?: (CoreApiAuthor | string)[];
    yearPublished?: number | null;
    publishedDate?: string | null;
    abstract?: string | null;
    description?: string | null;
    downloadUrl?: string | null;
    doi?: string | null;
    citationCount?: number | null;
    links?: Array<{ url?: string; type?: string }>;
    [key: string]: any;
}

export interface CoreApiResponse {
    totalHits?: number;
    limit?: number;
    offset?: number;
    results?: CoreApiItem[];
    error?: string;
    message?: string;
}

export interface CoreApiOptions {
    apiKey?: string;
    timeoutMs?: number;
    offset?: number;
}

/**
 * Sanitizes abstract text by removing HTML/XML tags and decoding entities,
 * while preserving sentence punctuation and periods.
 */
export function sanitizeAbstract(rawText?: string | null): string {
    if (!rawText) return '';

    let clean = rawText;
    let previous: string;
    do {
        previous = clean;
        clean = clean.replace(/<[^>]*>/g, '');
    } while (clean !== previous);

    const entityMap: Record<string, string> = {
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&nbsp;': ' ',
        '&amp;': '&',
    };

    clean = clean.replace(
        /&(?:lt|gt|quot|apos|#39|nbsp|amp);/g,
        (match) => entityMap[match] || match,
    );

    return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts author names into a clean string array.
 */
export function extractCoreAuthors(rawAuthors?: (CoreApiAuthor | string)[]): string[] {
    if (!Array.isArray(rawAuthors)) return [];
    return rawAuthors
        .map((author) => {
            if (typeof author === 'string') return author.trim();
            if (author && typeof author === 'object' && typeof author.name === 'string') {
                return author.name.trim();
            }
            return '';
        })
        .filter((name) => name.length > 0);
}

/**
 * Extracts 4-digit publication year from CORE item.
 */
export function extractCoreYear(item: CoreApiItem): number {
    if (
        typeof item.yearPublished === 'number' &&
        item.yearPublished >= 1800 &&
        item.yearPublished <= 2100
    ) {
        return item.yearPublished;
    }

    if (item.publishedDate) {
        const match = String(item.publishedDate).match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
        if (match) {
            const parsed = parseInt(match[1], 10);
            if (!isNaN(parsed)) return parsed;
        }
    }

    return new Date().getFullYear();
}

/**
 * Cleans and canonicalizes DOI identifiers.
 */
export function normalizeCoreDoi(rawDoi?: string | null): string | undefined {
    if (!rawDoi || typeof rawDoi !== 'string') return undefined;
    const trimmed = rawDoi.trim();
    if (!trimmed) return undefined;
    return trimmed
        .replace(/^https?:\/\/doi\.org\//i, '')
        .replace(/^doi:\s*/i, '')
        .trim();
}

/**
 * Extracts best PDF download URL from item or links array.
 */
export function extractCoreDownloadUrl(item: CoreApiItem): string | undefined {
    if (item.downloadUrl && typeof item.downloadUrl === 'string') {
        const trimmed = item.downloadUrl.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }
    }

    if (Array.isArray(item.links)) {
        const pdfLink = item.links.find(
            (link) =>
                link &&
                link.url &&
                (link.type === 'download' || link.url.toLowerCase().endsWith('.pdf')),
        );
        if (pdfLink?.url) {
            return pdfLink.url.trim();
        }
    }

    return undefined;
}

/**
 * Searches the CORE v3 API for open-access papers.
 * Silently skips if CORE_API_KEY is omitted from environment.
 *
 * @param query Search keywords or query string
 * @param limit Maximum results to return (default 20, max 100)
 * @param options Configurable options (apiKey, timeoutMs, offset)
 * @returns Array of normalized Paper objects
 */
export async function searchCoreApi(
    query: string,
    limit = 20,
    options: CoreApiOptions = {},
): Promise<Paper[]> {
    const trimmedQuery = (query || '').trim();
    if (!trimmedQuery) return [];

    const apiKey = options.apiKey || process.env.CORE_API_KEY || '';
    if (!apiKey.trim()) {
        // Silently skip if CORE_API_KEY is not configured
        return [];
    }

    const timeoutMs = options.timeoutMs ?? 2500;
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const offset = Math.max(0, options.offset ?? 0);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch('https://api.core.ac.uk/v3/search/works', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json',
                'User-Agent': 'AbstractiFy Research App (https://abstractify.app)',
            },
            body: JSON.stringify({
                q: trimmedQuery,
                limit: safeLimit,
                offset,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
            console.warn('[CORE API] Rate limit reached (HTTP 429). Skipping CORE search.');
            return [];
        }

        if (response.status === 401 || response.status === 403) {
            console.warn(
                `[CORE API] Authentication error (HTTP ${response.status}). Verify CORE_API_KEY.`,
            );
            return [];
        }

        if (!response.ok) {
            console.warn(
                `[CORE API] Request failed with HTTP ${response.status}: ${response.statusText}`,
            );
            return [];
        }

        const data = (await response.json()) as CoreApiResponse;
        const results = data.results;
        if (!Array.isArray(results) || results.length === 0) {
            return [];
        }

        const papers: Paper[] = [];

        for (const item of results) {
            if (!item) continue;

            const title = sanitizeTitle(item.title);
            if (!title) continue;

            const id = item.id
                ? `core_${item.id}`
                : `core_${Math.random().toString(36).slice(2, 11)}`;
            const authors = extractCoreAuthors(item.authors);
            const year = extractCoreYear(item);
            const doi = normalizeCoreDoi(item.doi);
            const downloadUrl = extractCoreDownloadUrl(item);

            let abstract = (item.abstract || item.description || '').trim();
            if (abstract) {
                // Sanitize abstract tags and entities while preserving periods
                abstract = sanitizeAbstract(abstract);
            }

            // Fallback synthesis if abstract is empty or very short
            if (!abstract || abstract.length < 30) {
                abstract = `${title}. Open-access research paper indexed by CORE repository network${
                    doi ? ` (DOI: ${doi})` : ''
                }. Full-text PDF available for scholarly retrieval.`;
            }

            const citations =
                typeof item.citationCount === 'number' && item.citationCount >= 0
                    ? item.citationCount
                    : 0;

            papers.push({
                id,
                title,
                authors,
                year,
                abstract,
                doi,
                citations,
                downloadUrl,
            });
        }

        return papers;
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.warn(`[CORE API] Request timed out after ${timeoutMs}ms`);
        } else {
            console.warn('[CORE API] Network error during search:', err.message || err);
        }
        return [];
    }
}
