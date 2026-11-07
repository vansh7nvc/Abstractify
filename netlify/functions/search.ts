import { Context } from '@netlify/functions';
import {
    getApiKey,
    retryWithBackoff,
    callGeminiEmbedding,
    cosineSimilarity,
    Paper,
    checkPasscode,
} from './_utils.js';
import { cacheGet, cacheSet } from './shared/redis.js';
import { searchPubMed } from './search/sources/pubmed.js';
import { searchCoreApi } from './search/sources/core-api.js';
import { searchArxiv } from './search/sources/arxiv.js';

export default async (req: Request, context: Context) => {
    // Enable CORS for localhost testing if needed (though Netlify takes care of routing)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        const body = (await req.json()) as { query: string };
        const query = body.query;
        if (!query) {
            return new Response(JSON.stringify({ message: 'Query parameter is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check Redis distributed cache first
        const cacheKey = `search:${query.trim().toLowerCase()}`;
        const cachedResults = await cacheGet<Paper[]>(cacheKey);
        if (cachedResults && cachedResults.length > 0) {
            return new Response(JSON.stringify({ papers: cachedResults, fromCache: true }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        const geminiKey = getApiKey(req.headers, 'gemini');

        // 1. Fetch papers from Semantic Scholar search API
        const sScholarUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=25&fields=title,authors,year,abstract,externalIds,citationCount`;

        let papers: Paper[] = [];

        try {
            const fetchPromise = retryWithBackoff(async () => {
                const response = await fetch(sScholarUrl, {
                    headers: { 'User-Agent': 'AbstractiFy Research App' },
                });
                if (!response.ok) {
                    throw new Error(`Semantic Scholar response not OK (HTTP ${response.status})`);
                }
                const data = (await response.json()) as any;
                return data.data || [];
            });

            const ssData = await fetchPromise;

            papers = ssData
                .map((item: any) => ({
                    id: item.paperId || Math.random().toString(36).substr(2, 9),
                    title: item.title || '',
                    authors: item.authors ? item.authors.map((a: any) => a.name) : [],
                    year: item.year || null,
                    abstract: item.abstract || '',
                    doi: item.externalIds ? item.externalIds.DOI : undefined,
                    citations: item.citationCount || 0,
                }))
                .filter((p: Paper) => p.abstract.length > 30); // only keep papers with abstracts
        } catch (err) {
            console.error('Semantic Scholar search error:', err);
            // Fallback to OpenAlex
            console.log('Searching OpenAlex as fallback...');
            const openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=15`;
            const response = await fetch(openAlexUrl);
            if (response.ok) {
                const data = (await response.json()) as any;
                papers = (data.results || [])
                    .map((item: any) => {
                        const abstractObj = item.abstract_inverted_index || {};
                        // Reconstruct abstract from inverted index
                        let abstract = '';
                        try {
                            const words: string[] = [];
                            Object.keys(abstractObj).forEach((word) => {
                                abstractObj[word].forEach((pos: number) => {
                                    words[pos] = word;
                                });
                            });
                            abstract = words.join(' ');
                        } catch (e) {
                            abstract = '';
                        }

                        return {
                            id: item.id || Math.random().toString(36).substr(2, 9),
                            title: item.display_name || '',
                            authors: item.authorships
                                ? item.authorships.map((a: any) => a.author.display_name)
                                : [],
                            year: item.publication_year || null,
                            abstract: abstract,
                            doi: item.doi ? item.doi.replace('https://doi.org/', '') : undefined,
                            citations: item.cited_by_count || 0,
                        };
                    })
                    .filter((p: Paper) => p.abstract.length > 30);
            }
        }

        // 2. Query PubMed & MEDLINE Biomedical Repository (Issue #25)
        try {
            const pubmedPapers = await searchPubMed(query, 15);
            if (pubmedPapers.length > 0) {
                const seenDois = new Set(papers.map((p) => p.doi?.toLowerCase()).filter(Boolean));
                const seenTitles = new Set(papers.map((p) => p.title.toLowerCase().trim()));

                for (const pmPaper of pubmedPapers) {
                    const doiMatch = pmPaper.doi && seenDois.has(pmPaper.doi.toLowerCase());
                    const titleMatch = seenTitles.has(pmPaper.title.toLowerCase().trim());
                    if (!doiMatch && !titleMatch) {
                        papers.push(pmPaper);
                        if (pmPaper.doi) seenDois.add(pmPaper.doi.toLowerCase());
                        seenTitles.add(pmPaper.title.toLowerCase().trim());
                    }
                }
            }
        } catch (pubmedErr) {
            console.warn('[Search] PubMed integration error:', pubmedErr);
        }

        // 3. Query CORE API v3 Open-Access Repository (Issue #26)
        try {
            const corePapers = await searchCoreApi(query, 15);
            if (corePapers.length > 0) {
                const seenDois = new Map(
                    papers.filter((p) => p.doi).map((p) => [p.doi!.toLowerCase(), p]),
                );
                const seenTitles = new Map(papers.map((p) => [p.title.toLowerCase().trim(), p]));

                for (const corePaper of corePapers) {
                    const existingByDoi = corePaper.doi
                        ? seenDois.get(corePaper.doi.toLowerCase())
                        : undefined;
                    const existingByTitle = seenTitles.get(corePaper.title.toLowerCase().trim());
                    const existing = existingByDoi || existingByTitle;

                    if (existing) {
                        // Enrich existing paper with downloadUrl if missing
                        if (!existing.downloadUrl && corePaper.downloadUrl) {
                            existing.downloadUrl = corePaper.downloadUrl;
                        }
                    } else {
                        papers.push(corePaper);
                        if (corePaper.doi) seenDois.set(corePaper.doi.toLowerCase(), corePaper);
                        seenTitles.set(corePaper.title.toLowerCase().trim(), corePaper);
                    }
                }
            }
        } catch (coreErr) {
            console.warn('[Search] CORE API integration error:', coreErr);
        }

        // 4. Query arXiv Preprint Server (Issue #27)
        try {
            const arxivPapers = await searchArxiv(query, 15);
            if (arxivPapers.length > 0) {
                const seenDois = new Map(
                    papers.filter((p) => p.doi).map((p) => [p.doi!.toLowerCase(), p]),
                );
                const seenTitles = new Map(papers.map((p) => [p.title.toLowerCase().trim(), p]));

                for (const axPaper of arxivPapers) {
                    const existingByDoi = axPaper.doi
                        ? seenDois.get(axPaper.doi.toLowerCase())
                        : undefined;
                    const existingByTitle = seenTitles.get(axPaper.title.toLowerCase().trim());
                    const existing = existingByDoi || existingByTitle;

                    if (existing) {
                        if (!existing.downloadUrl && axPaper.downloadUrl) {
                            existing.downloadUrl = axPaper.downloadUrl;
                        }
                        if (!existing.primaryCategory && axPaper.primaryCategory) {
                            existing.primaryCategory = axPaper.primaryCategory;
                        }
                    } else {
                        papers.push(axPaper);
                        if (axPaper.doi) seenDois.set(axPaper.doi.toLowerCase(), axPaper);
                        seenTitles.set(axPaper.title.toLowerCase().trim(), axPaper);
                    }
                }
            }
        } catch (arxivErr) {
            console.warn('[Search] arXiv integration error:', arxivErr);
        }

        if (papers.length === 0) {
            return new Response(JSON.stringify({ papers: [] }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 2. Vector re-ranking if Gemini API key is available
        if (geminiKey) {
            try {
                // Embed query
                const queryVector = await callGeminiEmbedding(query, geminiKey);

                // Embed abstracts in parallel (using Promise.all)
                const embedPromises = papers.map(async (paper) => {
                    try {
                        const textToEmbed = `${paper.title}. ${paper.abstract}`;
                        const vector = await callGeminiEmbedding(textToEmbed, geminiKey);
                        const score = cosineSimilarity(queryVector, vector);
                        return { paper, score };
                    } catch (e) {
                        // fallback score
                        return { paper, score: 0 };
                    }
                });

                const scoredPapers = await Promise.all(embedPromises);

                // Sort by score descending
                scoredPapers.sort((a, b) => b.score - a.score);
                papers = scoredPapers.map((sp) => sp.paper);
            } catch (err) {
                console.error('Vector re-ranking failed:', err);
                // Fallback to sorting by citation count + relevance
                papers.sort((a, b) => b.citations - a.citations);
            }
        } else {
            // No Gemini API Key: Fallback to sorting by citations count
            papers.sort((a, b) => b.citations - a.citations);
        }

        // Keep top 10 papers
        const finalPapers = papers.slice(0, 10);

        // Asynchronously populate Redis cache
        cacheSet(cacheKey, finalPapers, 86400).catch((err) =>
            console.warn('[Search Cache] Failed to write to Redis:', err),
        );

        return new Response(JSON.stringify({ papers: finalPapers }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error: any) {
        console.error('Global search error handler:', error);
        return new Response(JSON.stringify({ message: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: '/api/search',
};
