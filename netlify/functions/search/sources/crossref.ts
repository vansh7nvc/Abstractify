/**
 * Crossref DOI Metadata Resolution & Retraction Status Integration
 * Issue #28: Queries the official Crossref REST API using polite pool headers
 * to resolve authoritative bibliographic metadata, publisher citation counts,
 * and detect retractions or expressions of concern from Crossmark metadata.
 */

import { Paper } from '../../_utils.js';

export interface CrossrefOptions {
    timeoutMs?: number;
    rows?: number;
    offset?: number;
    sort?: 'score' | 'relevance' | 'published' | 'is-referenced-by-count';
    order?: 'asc' | 'desc';
}

export interface CrossrefUpdate {
    label?: string;
    type?: string;
    doi?: string;
    updated?: {
        'date-parts'?: number[][];
    };
}

export interface CrossrefAuthor {
    given?: string;
    family?: string;
    name?: string;
    sequence?: string;
}

export interface CrossrefWorkItem {
    DOI?: string;
    title?: string[];
    author?: CrossrefAuthor[];
    publisher?: string;
    'container-title'?: string[];
    ISSN?: string[];
    'is-referenced-by-count'?: number;
    'published-print'?: { 'date-parts'?: number[][] };
    'published-online'?: { 'date-parts'?: number[][] };
    issued?: { 'date-parts'?: number[][] };
    created?: { 'date-parts'?: number[][] };
    indexed?: { 'date-parts'?: number[][] };
    abstract?: string;
    'update-to'?: CrossrefUpdate[];
    relation?: Record<string, any>;
    assertion?: Array<{ name?: string; value?: string; label?: string }>;
}

export type RetractionStatus =
    'retracted' | 'correction' | 'expression-of-concern' | 'valid' | 'unknown';

export interface CrossrefDoiResult {
    doi: string;
    title?: string;
    isRetracted: boolean;
    hasCorrections: boolean;
    status: RetractionStatus;
    publisher: string;
    journal?: string;
    indexedDate: string;
    citations: number;
    noticeDoi?: string | null;
    updateType?: string | null;
    updatedDate?: string | null;
    updates?: CrossrefUpdate[];
}

/**
 * Polite pool headers required by Crossref API guidelines.
 */
export const CROSSREF_HEADERS = {
    'User-Agent': 'AbstractiFy/2.0 (mailto:dev@abstractify.app)',
    Accept: 'application/json',
};

/**
 * Normalizes DOI strings by stripping URI prefixes and whitespace.
 * e.g., "https://doi.org/10.1016/j.cell.2020.01.001" -> "10.1016/j.cell.2020.01.001"
 */
export function normalizeDoi(rawDoi: string): string {
    if (!rawDoi) return '';
    return rawDoi
        .trim()
        .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
        .replace(/^doi:\s*/i, '')
        .replace(/^\/+|\/+$/g, '')
        .trim();
}

/**
 * Formats Crossref date-parts array [[YYYY, MM, DD]] into standard ISO date string (YYYY-MM-DD).
 */
export function formatDateParts(dateParts?: number[][]): string {
    if (!dateParts || !Array.isArray(dateParts) || dateParts.length === 0) {
        return 'N/A';
    }
    const parts = dateParts[0];
    if (!parts || !Array.isArray(parts) || parts.length === 0) {
        return 'N/A';
    }
    const year = parts[0];
    if (!year) return 'N/A';

    const month = parts[1] !== undefined ? String(parts[1]).padStart(2, '0') : null;
    const day = parts[2] !== undefined ? String(parts[2]).padStart(2, '0') : null;

    if (month && day) {
        return `${year}-${month}-${day}`;
    }
    if (month) {
        return `${year}-${month}`;
    }
    return String(year);
}

/**
 * Sanitizes JATS/XML/HTML tags and entity references from Crossref abstracts.
 * Preserves sentence punctuation and spacing.
 */
export function sanitizeCrossrefAbstract(raw: string): string {
    if (!raw) return '';

    let cleaned = raw;
    let prev = '';
    do {
        prev = cleaned;
        cleaned = cleaned.replace(/<[^>]*>/g, ' ');
    } while (cleaned !== prev);

    const entityMap: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&nbsp;': ' ',
    };

    cleaned = cleaned.replace(
        /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g,
        (match) => entityMap[match] || match,
    );

    return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Evaluates retraction, erratum, or expression of concern status from Crossmark metadata.
 */
export function evaluateRetractionStatus(item: CrossrefWorkItem): {
    isRetracted: boolean;
    hasCorrections: boolean;
    status: RetractionStatus;
    noticeDoi?: string | null;
    updateType?: string | null;
    updatedDate?: string | null;
} {
    const updates = item['update-to'] || [];

    // 1. Check for retractions or withdrawals
    const retractionUpdate = updates.find((u) => {
        const type = (u.type || '').toLowerCase();
        const label = (u.label || '').toLowerCase();
        return (
            type.includes('retract') ||
            type.includes('withdraw') ||
            label.includes('retract') ||
            label.includes('withdraw')
        );
    });

    if (retractionUpdate) {
        return {
            isRetracted: true,
            hasCorrections: false,
            status: 'retracted',
            noticeDoi: retractionUpdate.doi || null,
            updateType: retractionUpdate.type || 'retraction',
            updatedDate: formatDateParts(retractionUpdate.updated?.['date-parts']),
        };
    }

    // Check assertions for retraction notice
    if (Array.isArray(item.assertion)) {
        const retractionAssertion = item.assertion.find((a) => {
            const name = (a.name || '').toLowerCase();
            const label = (a.label || '').toLowerCase();
            const value = (a.value || '').toLowerCase();
            return (
                name.includes('retract') ||
                label.includes('retract') ||
                value.includes('retract') ||
                value.includes('withdrawn')
            );
        });

        if (retractionAssertion) {
            return {
                isRetracted: true,
                hasCorrections: false,
                status: 'retracted',
                noticeDoi: null,
                updateType: 'retraction',
                updatedDate: null,
            };
        }
    }

    // Check relations for retraction
    if (item.relation && item.relation['is-retracted-by']) {
        return {
            isRetracted: true,
            hasCorrections: false,
            status: 'retracted',
            noticeDoi: null,
            updateType: 'retraction',
            updatedDate: null,
        };
    }

    // 2. Check for expressions of concern
    const concernUpdate = updates.find((u) => {
        const type = (u.type || '').toLowerCase();
        const label = (u.label || '').toLowerCase();
        return type.includes('concern') || label.includes('concern');
    });

    if (concernUpdate) {
        return {
            isRetracted: false,
            hasCorrections: false,
            status: 'expression-of-concern',
            noticeDoi: concernUpdate.doi || null,
            updateType: concernUpdate.type || 'expression-of-concern',
            updatedDate: formatDateParts(concernUpdate.updated?.['date-parts']),
        };
    }

    // 3. Check for corrections, errata, or corrigenda
    const correctionUpdate = updates.find((u) => {
        const type = (u.type || '').toLowerCase();
        const label = (u.label || '').toLowerCase();
        return (
            type.includes('correct') ||
            type.includes('errat') ||
            type.includes('corrig') ||
            label.includes('correct') ||
            label.includes('errat') ||
            label.includes('corrig')
        );
    });

    if (correctionUpdate) {
        return {
            isRetracted: false,
            hasCorrections: true,
            status: 'correction',
            noticeDoi: correctionUpdate.doi || null,
            updateType: correctionUpdate.type || 'correction',
            updatedDate: formatDateParts(correctionUpdate.updated?.['date-parts']),
        };
    }

    if (item.relation && item.relation['is-corrected-by']) {
        return {
            isRetracted: false,
            hasCorrections: true,
            status: 'correction',
            noticeDoi: null,
            updateType: 'correction',
            updatedDate: null,
        };
    }

    return {
        isRetracted: false,
        hasCorrections: false,
        status: 'valid',
        noticeDoi: null,
        updateType: null,
        updatedDate: null,
    };
}

/**
 * Searches Crossref for academic publications matching a text query.
 *
 * @param query Search keywords or title terms
 * @param limit Maximum results (default: 20, max: 50)
 * @param options Query configuration including timeout
 * @returns Array of normalized Paper objects
 */
export async function searchCrossref(
    query: string,
    limit = 20,
    options: CrossrefOptions = {},
): Promise<Paper[]> {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    const timeoutMs = options.timeoutMs ?? 2500;
    const safeLimit = Math.max(1, Math.min(limit, 50));

    const apiUrl = new URL('https://api.crossref.org/works');
    apiUrl.searchParams.set('query', trimmed);
    apiUrl.searchParams.set('rows', String(safeLimit));
    if (options.sort) {
        apiUrl.searchParams.set('sort', options.sort);
        if (options.order) apiUrl.searchParams.set('order', options.order);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(apiUrl.toString(), {
            headers: CROSSREF_HEADERS,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(
                `[Crossref API] Search failed with HTTP ${response.status}: ${response.statusText}`,
            );
            return [];
        }

        const data = (await response.json()) as any;
        const items: CrossrefWorkItem[] = data.message?.items || [];

        const papers: Paper[] = items
            .map((item) => {
                const title =
                    Array.isArray(item.title) && item.title.length > 0 ? item.title[0].trim() : '';

                const authors = Array.isArray(item.author)
                    ? item.author
                          .map((a) => [a.given, a.family].filter(Boolean).join(' ') || a.name || '')
                          .filter(Boolean)
                    : [];

                const yearParts =
                    item['published-print']?.['date-parts'] ||
                    item['published-online']?.['date-parts'] ||
                    item.issued?.['date-parts'] ||
                    item.created?.['date-parts'];
                const year =
                    yearParts && yearParts[0] && yearParts[0][0] ? Number(yearParts[0][0]) : 0;

                const abstract = sanitizeCrossrefAbstract(item.abstract || '');
                const citations =
                    typeof item['is-referenced-by-count'] === 'number'
                        ? item['is-referenced-by-count']
                        : 0;

                const journal =
                    Array.isArray(item['container-title']) && item['container-title'].length > 0
                        ? item['container-title'][0]
                        : undefined;

                const retractionInfo = evaluateRetractionStatus(item);

                return {
                    id: item.DOI
                        ? `crossref:${item.DOI}`
                        : Math.random().toString(36).substring(2, 11),
                    title,
                    authors,
                    year,
                    abstract,
                    doi: item.DOI,
                    citations,
                    publisher: item.publisher,
                    journal,
                    isRetracted: retractionInfo.isRetracted,
                    hasCorrections: retractionInfo.hasCorrections,
                };
            })
            .filter((p) => p.title.length > 0);

        return papers;
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.warn(`[Crossref API] Search timed out after ${timeoutMs}ms`);
        } else {
            console.warn('[Crossref API] Search network error:', err.message || err);
        }
        return [];
    }
}

/**
 * Resolves full Crossref bibliographic and retraction metadata for a specific DOI.
 *
 * @param doi Digital Object Identifier (e.g. "10.1016/j.cell.2020.01.001")
 * @param options Options including timeout
 * @returns CrossrefDoiResult or null if not found
 */
export async function resolveCrossrefDoi(
    doi: string,
    options: CrossrefOptions = {},
): Promise<CrossrefDoiResult | null> {
    const cleanDoi = normalizeDoi(doi);
    if (!cleanDoi) return null;

    const timeoutMs = options.timeoutMs ?? 2500;
    const apiUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(apiUrl, {
            headers: CROSSREF_HEADERS,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            console.warn(
                `[Crossref API] DOI resolution failed for "${cleanDoi}" with HTTP ${response.status}`,
            );
            return null;
        }

        const data = (await response.json()) as any;
        const item: CrossrefWorkItem = data.message;
        if (!item) return null;

        const title =
            Array.isArray(item.title) && item.title.length > 0 ? item.title[0].trim() : '';

        const publisher = item.publisher || 'Unknown Publisher';
        const journal =
            Array.isArray(item['container-title']) && item['container-title'].length > 0
                ? item['container-title'][0]
                : undefined;

        const citations =
            typeof item['is-referenced-by-count'] === 'number' ? item['is-referenced-by-count'] : 0;

        const indexedDate =
            formatDateParts(item.indexed?.['date-parts']) !== 'N/A'
                ? formatDateParts(item.indexed?.['date-parts'])
                : formatDateParts(item.created?.['date-parts']);

        const retractionInfo = evaluateRetractionStatus(item);

        return {
            doi: cleanDoi,
            title,
            isRetracted: retractionInfo.isRetracted,
            hasCorrections: retractionInfo.hasCorrections,
            status: retractionInfo.status,
            publisher,
            journal,
            indexedDate,
            citations,
            noticeDoi: retractionInfo.noticeDoi,
            updateType: retractionInfo.updateType,
            updatedDate: retractionInfo.updatedDate,
            updates: item['update-to'],
        };
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.warn(`[Crossref API] DOI resolution timed out after ${timeoutMs}ms`);
        } else {
            console.warn('[Crossref API] DOI resolution network error:', err.message || err);
        }
        return null;
    }
}
