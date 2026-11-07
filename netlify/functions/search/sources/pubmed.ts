/**
 * PubMed & MEDLINE Biomedical Search Integration (NCBI E-Utilities API)
 * Issue #25: Connects to NCBI E-Utilities (esearch.fcgi and esummary.fcgi)
 * to retrieve peer-reviewed biomedical literature and clinical trial metadata.
 */

import { Paper } from '../../_utils.js';

export interface PubMedOptions {
    timeoutMs?: number;
    apiKey?: string;
    tool?: string;
    email?: string;
}

export interface NCBIAuthor {
    name?: string;
    authtype?: string;
}

export interface NCBIArticleId {
    idtype?: string;
    idtypen?: number;
    value?: string;
}

export interface NCBIDocSum {
    uid: string;
    title?: string;
    sorttitle?: string;
    authors?: NCBIAuthor[];
    source?: string;
    pubdate?: string;
    epubdate?: string;
    articleids?: NCBIArticleId[];
    pmcrefcount?: number;
    abstract?: string;
}

export interface ESearchResponse {
    esearchresult?: {
        count?: string;
        retmax?: string;
        retstart?: string;
        idlist?: string[];
        error?: string;
    };
}

export interface ESummaryResponse {
    result?: {
        uids?: string[];
        [uid: string]: NCBIDocSum | string[] | undefined;
    };
}

/**
 * Sanitizes article title by stripping HTML/XML tags, decoding entities, and normalizing whitespace.
 * @param rawTitle Raw title from NCBI response
 * @returns Clean, human-readable title
 */
export function sanitizeTitle(rawTitle?: string): string {
    if (!rawTitle) return '';

    let clean = rawTitle
        // Remove XML/HTML tags (e.g. <i>, <b>, <sub>, <sup>, <title>, etc.)
        .replace(/<[^>]+>/g, '')
        // Decode common HTML/XML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        // Normalize multiple spaces and newlines
        .replace(/\s+/g, ' ')
        .trim();

    // Strip trailing period if present
    if (clean.endsWith('.')) {
        clean = clean.slice(0, -1).trim();
    }

    return clean;
}

/**
 * Extracts 4-digit publication year from NCBI pubdate string.
 * @param pubdate e.g., "2023 Dec 15", "2021 Winter", "2020", "2024/05/01"
 * @returns 4-digit integer year, or current year fallback
 */
export function extractYearFromPubDate(pubdate?: string): number {
    if (!pubdate) return new Date().getFullYear();

    const match = pubdate.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
    if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed)) return parsed;
    }

    return new Date().getFullYear();
}

/**
 * Searches PubMed via NCBI E-Utilities ESearch and ESummary endpoints.
 * @param query Search query string
 * @param limit Maximum papers to retrieve (default 25)
 * @param options Configuration options (timeout, NCBI API key, tool, email)
 * @returns Array of normalized Paper objects
 */
export async function searchPubMed(
    query: string,
    limit = 25,
    options: PubMedOptions = {},
): Promise<Paper[]> {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    const timeoutMs = options.timeoutMs ?? 2500;
    const tool = options.tool || 'AbstractiFy';
    const email = options.email || 'research@abstractify.app';
    const apiKey = options.apiKey || process.env.NCBI_API_KEY || '';

    const baseParams = new URLSearchParams({
        tool,
        email,
        ...(apiKey ? { api_key: apiKey } : {}),
    });

    try {
        // Step 1: ESearch to obtain PMIDs
        const esearchUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
        esearchUrl.search = new URLSearchParams({
            db: 'pubmed',
            term: trimmed,
            retmode: 'json',
            retmax: String(limit),
            sort: 'relevance',
            ...Object.fromEntries(baseParams),
        }).toString();

        const searchController = new AbortController();
        const searchTimer = setTimeout(() => searchController.abort(), timeoutMs);

        let esearchRes: Response;
        try {
            esearchRes = await fetch(esearchUrl.toString(), {
                signal: searchController.signal,
                headers: { 'User-Agent': 'AbstractiFy/1.0 (Biomedical Intelligence)' },
            });
        } finally {
            clearTimeout(searchTimer);
        }

        if (!esearchRes.ok) {
            console.warn(`[PubMed Search] ESearch HTTP ${esearchRes.status}`);
            return [];
        }

        const esearchData = (await esearchRes.json()) as ESearchResponse;
        const idList = esearchData.esearchresult?.idlist || [];

        if (idList.length === 0) {
            return [];
        }

        // Step 2: ESummary to fetch document metadata
        const esummaryUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
        esummaryUrl.search = new URLSearchParams({
            db: 'pubmed',
            id: idList.join(','),
            retmode: 'json',
            ...Object.fromEntries(baseParams),
        }).toString();

        const summaryController = new AbortController();
        const summaryTimer = setTimeout(() => summaryController.abort(), timeoutMs);

        let esummaryRes: Response;
        try {
            esummaryRes = await fetch(esummaryUrl.toString(), {
                signal: summaryController.signal,
                headers: { 'User-Agent': 'AbstractiFy/1.0 (Biomedical Intelligence)' },
            });
        } finally {
            clearTimeout(summaryTimer);
        }

        if (!esummaryRes.ok) {
            console.warn(`[PubMed Search] ESummary HTTP ${esummaryRes.status}`);
            return [];
        }

        const esummaryData = (await esummaryRes.json()) as ESummaryResponse;
        const resultsMap = esummaryData.result || {};
        const uids: string[] = Array.isArray(resultsMap.uids) ? resultsMap.uids : idList;

        const papers: Paper[] = [];

        for (const uid of uids) {
            const item = resultsMap[uid] as NCBIDocSum | undefined;
            if (!item || typeof item !== 'object') continue;

            const title = sanitizeTitle(item.title);
            if (!title) continue;

            // Extract Authors
            const authors = (item.authors || [])
                .map((a) => (a.name || '').trim())
                .filter((name) => name.length > 0);

            // Extract Publication Year
            const year = extractYearFromPubDate(item.pubdate || item.epubdate);

            // Extract DOI if available
            const doiObj = item.articleids?.find((aid) => aid.idtype?.toLowerCase() === 'doi');
            const doi = doiObj?.value?.trim() || undefined;

            // Extract Abstract or synthesize informative scholarly abstract
            const sourceJournal = item.source ? ` Journal: ${item.source}.` : '';
            const abstract =
                item.abstract?.trim() ||
                `${title}.${sourceJournal} Indexed in MEDLINE/PubMed under PMID: ${uid}.`;

            // Citation count heuristic (PubMed Central reference count if present)
            const citations = typeof item.pmcrefcount === 'number' ? item.pmcrefcount : 0;

            papers.push({
                id: `PMID:${uid}`,
                title,
                authors,
                year,
                abstract,
                doi,
                citations,
            });
        }

        return papers;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            console.warn('[PubMed Search] Request timed out gracefully.');
        } else {
            console.warn(
                '[PubMed Search] Unexpected error querying NCBI E-Utilities:',
                err.message || err,
            );
        }
        return [];
    }
}
