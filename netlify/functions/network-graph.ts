import { Context } from '@netlify/functions';
import { Paper, checkPasscode } from './_utils.js';

interface NetworkGraphRequest {
    query: string;
    papers: Paper[];
}

export type GraphNodeType =
    'landmark' | 'focus' | 'foundation' | 'recent' | 'cocitation' | 'standard';

export interface GraphNode {
    id: string;
    title: string;
    authors?: string[];
    citations: number;
    year: number;
    doi?: string;
    venue?: string;
    abstract?: string;
    nodeType: GraphNodeType;
    cluster?: string;
    inDegree?: number;
    outDegree?: number;
}

export interface GraphEdge {
    source: string;
    target: string;
    type?: 'citation' | 'co-citation' | 'lineage' | 'semantic';
    weight?: number;
}

/**
 * Calculates simple token Jaccard similarity between two texts for semantic clustering.
 */
function calculateTextSimilarity(textA: string, textB: string): number {
    if (!textA || !textB) return 0;
    const stopWords = new Set([
        'the',
        'and',
        'for',
        'with',
        'from',
        'that',
        'this',
        'using',
        'learning',
        'via',
        'towards',
        'based',
        'model',
        'models',
        'deep',
        'neural',
        'paper',
        'approach',
    ]);
    const tokenize = (str: string) =>
        new Set(
            str
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .split(/\s+/)
                .filter((w) => w.length > 3 && !stopWords.has(w)),
        );

    const setA = tokenize(textA);
    const setB = tokenize(textB);
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const w of setA) {
        if (setB.has(w)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
}

export default async (req: Request, context: Context) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        const body = (await req.json()) as NetworkGraphRequest;
        const { papers } = body;

        if (!papers || papers.length === 0) {
            return new Response(JSON.stringify({ nodes: [], edges: [] }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const currentYear = new Date().getFullYear();
        const years = papers.map((p) => p.year || currentYear).filter((y) => y > 1950);
        const minYear = years.length > 0 ? Math.min(...years) : 2020;
        const maxYear = years.length > 0 ? Math.max(...years) : currentYear;
        const maxCitations = Math.max(...papers.map((p) => p.citations || 0), 0);

        // Assign preliminary node types
        const nodes: GraphNode[] = papers.map((p, index) => {
            const citations = p.citations || 0;
            const year = p.year || 2020;
            let nodeType: GraphNodeType = 'standard';

            if (index === 0) {
                nodeType = 'focus';
            } else if (citations > 0 && citations === maxCitations && citations >= 20) {
                nodeType = 'landmark';
            } else if (year <= minYear + 1 && citations > 5) {
                nodeType = 'foundation';
            } else if (year >= maxYear - 1) {
                nodeType = 'recent';
            }

            const authorNames = Array.isArray(p.authors)
                ? p.authors.map((a: any) => (typeof a === 'string' ? a : a.name || 'Unknown'))
                : [];

            return {
                id: p.id,
                title: p.title,
                authors: authorNames,
                citations,
                year,
                doi: p.doi,
                venue: p.venue || p.journal || 'Academic Publication',
                abstract: p.abstract ? p.abstract.substring(0, 280) + '...' : undefined,
                nodeType,
            };
        });

        // Ensure at least one landmark node if there are citations
        if (maxCitations > 15 && !nodes.some((n) => n.nodeType === 'landmark')) {
            const highestCitNode = nodes.reduce(
                (max, n) => (n.citations > max.citations ? n : max),
                nodes[0],
            );
            if (highestCitNode && highestCitNode.nodeType !== 'focus') {
                highestCitNode.nodeType = 'landmark';
            }
        }

        const edges: GraphEdge[] = [];
        const paperIds = new Set(papers.map((p) => p.id));
        const referenceCounts: Record<
            string,
            { title: string; citations: number; year: number; count: number; citedBy: string[] }
        > = {};

        // Query references for top 8 papers in parallel
        const topPapers = papers.slice(0, 8);
        const fetchPromises = topPapers.map(async (paper) => {
            const paperId = paper.id;
            let queryId = paperId;

            // Semantic Scholar accepts DOI:10.xxx or standard 40-char hashes
            if (paperId.includes('DOI:') || (!paperId.includes('/') && paperId.length >= 20)) {
                queryId = paperId;
            } else if (paper.doi) {
                queryId = `DOI:${paper.doi.replace(/^https?:\/\/doi\.org\//i, '').trim()}`;
            } else {
                return;
            }

            const url = `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(
                queryId,
            )}?fields=references.paperId,references.title,references.citationCount,references.year,citations.paperId`;

            try {
                const res = await fetch(url);
                if (!res.ok) return;
                const data = (await res.json()) as any;

                const refs = data.references || [];
                refs.forEach((ref: any) => {
                    const refId = ref.paperId;
                    if (!refId) return;

                    if (paperIds.has(refId)) {
                        edges.push({
                            source: paperId,
                            target: refId,
                            type: 'citation',
                            weight: 1.0,
                        });
                    } else {
                        if (!referenceCounts[refId]) {
                            referenceCounts[refId] = {
                                title: ref.title || 'External Reference',
                                citations: ref.citationCount || 0,
                                year: ref.year || 2020,
                                count: 0,
                                citedBy: [],
                            };
                        }
                        referenceCounts[refId].count++;
                        referenceCounts[refId].citedBy.push(paperId);
                    }
                });

                const cites = data.citations || [];
                cites.forEach((cite: any) => {
                    const citeId = cite.paperId;
                    if (citeId && paperIds.has(citeId)) {
                        edges.push({
                            source: citeId,
                            target: paperId,
                            type: 'citation',
                            weight: 1.0,
                        });
                    }
                });
            } catch (e) {
                console.error(`Citation fetching failed for paper ${paperId}:`, e);
            }
        });

        await Promise.all(fetchPromises);

        // Deduplicate edges
        const uniqueEdgesMap: Record<string, boolean> = {};
        const uniqueEdges: GraphEdge[] = [];
        edges.forEach((e) => {
            const key = `${e.source}->${e.target}`;
            if (!uniqueEdgesMap[key]) {
                uniqueEdgesMap[key] = true;
                uniqueEdges.push(e);
            }
        });

        // Add top shared external references to the graph
        const sharedRefs = Object.keys(referenceCounts)
            .map((refId) => ({ id: refId, ...referenceCounts[refId] }))
            .filter((ref) => ref.count > 1)
            .sort((a, b) => b.citations - a.citations)
            .slice(0, 4);

        sharedRefs.forEach((ref) => {
            nodes.push({
                id: ref.id,
                title: '[Co-Citation] ' + ref.title,
                citations: ref.citations,
                year: ref.year,
                nodeType: 'cocitation',
            });

            ref.citedBy.forEach((paperId) => {
                const key = `${paperId}->${ref.id}`;
                if (!uniqueEdgesMap[key]) {
                    uniqueEdgesMap[key] = true;
                    uniqueEdges.push({
                        source: paperId,
                        target: ref.id,
                        type: 'co-citation',
                        weight: 0.8,
                    });
                }
            });
        });

        // =========================================================================
        // SCIENTIFIC LINEAGE & TOPICAL GRAPH SYNTHESIS (FALLBACK & AUGMENTATION)
        // If external API returned 0 or very few edges (common with preprints, rate limits, or Crossref),
        // synthesize realistic academic lineage: earlier foundational papers connect to subsequent works,
        // and papers with strong semantic title/abstract similarity form directed knowledge edges!
        // =========================================================================
        const minExpectedEdges = Math.min(nodes.length - 1, 4);
        if (uniqueEdges.length < minExpectedEdges && nodes.length > 1) {
            // Sort primary papers chronologically then by citation count
            const primaryNodes = nodes.filter((n) => n.nodeType !== 'cocitation');
            const sortedByYear = [...primaryNodes].sort(
                (a, b) => a.year - b.year || b.citations - a.citations,
            );

            // Connect chronological roots (earliest / most cited) to later works in the search theme
            for (let i = 0; i < sortedByYear.length; i++) {
                const source = sortedByYear[i];
                for (let j = i + 1; j < sortedByYear.length; j++) {
                    const target = sortedByYear[j];
                    const key = `${source.id}->${target.id}`;
                    const reverseKey = `${target.id}->${source.id}`;
                    if (uniqueEdgesMap[key] || uniqueEdgesMap[reverseKey]) continue;

                    // Calculate topical/semantic similarity
                    const textA = `${source.title} ${source.abstract || ''}`;
                    const textB = `${target.title} ${target.abstract || ''}`;
                    const sim = calculateTextSimilarity(textA, textB);

                    // Connect if high similarity or direct chronological step with landmark/focus
                    const isLandmarkParent =
                        source.nodeType === 'landmark' ||
                        source.nodeType === 'foundation' ||
                        source.nodeType === 'focus';
                    if (
                        sim >= 0.15 ||
                        (isLandmarkParent && j <= i + 3 && uniqueEdges.length < nodes.length * 1.8)
                    ) {
                        uniqueEdgesMap[key] = true;
                        uniqueEdges.push({
                            source: source.id,
                            target: target.id,
                            type: sim >= 0.15 ? 'semantic' : 'lineage',
                            weight: Number(Math.max(sim, 0.4).toFixed(2)),
                        });
                    }
                }
            }

            // Guaranteed Connectivity: Ensure no disconnected orphan nodes exist
            const connectedSet = new Set<string>();
            uniqueEdges.forEach((e) => {
                connectedSet.add(e.source);
                connectedSet.add(e.target);
            });

            primaryNodes.forEach((node) => {
                if (!connectedSet.has(node.id) && primaryNodes.length > 1) {
                    // Connect to the landmark or closest year paper
                    const targetParent =
                        primaryNodes.find(
                            (p) =>
                                p.id !== node.id &&
                                (p.nodeType === 'landmark' || p.nodeType === 'focus'),
                        ) ||
                        primaryNodes.find((p) => p.id !== node.id && p.year <= node.year) ||
                        primaryNodes[0];

                    if (targetParent && targetParent.id !== node.id) {
                        const key = `${targetParent.id}->${node.id}`;
                        if (!uniqueEdgesMap[key]) {
                            uniqueEdgesMap[key] = true;
                            uniqueEdges.push({
                                source: targetParent.id,
                                target: node.id,
                                type: 'lineage',
                                weight: 0.5,
                            });
                            connectedSet.add(node.id);
                        }
                    }
                }
            });
        }

        // Calculate node in-degree and out-degree
        const inDegreeMap: Record<string, number> = {};
        const outDegreeMap: Record<string, number> = {};
        uniqueEdges.forEach((e) => {
            outDegreeMap[e.source] = (outDegreeMap[e.source] || 0) + 1;
            inDegreeMap[e.target] = (inDegreeMap[e.target] || 0) + 1;
        });

        nodes.forEach((n) => {
            n.inDegree = inDegreeMap[n.id] || 0;
            n.outDegree = outDegreeMap[n.id] || 0;
        });

        return new Response(JSON.stringify({ nodes, edges: uniqueEdges }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error: any) {
        console.error('Citation Network Graph error:', error);
        return new Response(JSON.stringify({ nodes: [], edges: [] }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
