import { Context } from "@netlify/functions";
import { Paper, checkPasscode } from "./_utils.js";

interface NetworkGraphRequest {
    query: string;
    papers: Paper[];
}

interface GraphNode {
    id: string;
    title: string;
    citations: number;
    year: number;
}

interface GraphEdge {
    source: string;
    target: string;
}

export default async (req: Request, context: Context) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        const body = await req.json() as NetworkGraphRequest;
        const { papers } = body;

        if (!papers || papers.length === 0) {
            return new Response(JSON.stringify({ nodes: [], edges: [] }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const nodes: GraphNode[] = papers.map(p => ({
            id: p.id,
            title: p.title,
            citations: p.citations,
            year: p.year || 2020
        }));

        const edges: GraphEdge[] = [];
        const paperIds = new Set(papers.map(p => p.id));
        const referenceCounts: Record<string, { title: string; citations: number; year: number; count: number; citedBy: string[] }> = {};

        // Query references for top 8 papers in parallel (limit to 8 to avoid rate limits and timeouts)
        const topPapers = papers.slice(0, 8);
        const fetchPromises = topPapers.map(async (paper) => {
            const paperId = paper.id;
            // Only query if it looks like a valid Semantic Scholar paper ID
            if (paperId.length < 5 || paperId.includes("DOI:")) return;

            const url = `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=references.paperId,references.title,references.citationCount,references.year,citations.paperId`;
            
            try {
                const res = await fetch(url);
                if (!res.ok) return;
                const data = await res.json() as any;
                
                // Process references (outgoing links)
                const refs = data.references || [];
                refs.forEach((ref: any) => {
                    const refId = ref.paperId;
                    if (!refId) return;

                    // If referenced paper is in our list of top papers, add direct edge
                    if (paperIds.has(refId)) {
                        edges.push({ source: paperId, target: refId });
                    } else {
                        // Aggregate external references to find common co-citations
                        if (!referenceCounts[refId]) {
                            referenceCounts[refId] = {
                                title: ref.title || "External Reference",
                                citations: ref.citationCount || 0,
                                year: ref.year || 2020,
                                count: 0,
                                citedBy: []
                            };
                        }
                        referenceCounts[refId].count++;
                        referenceCounts[refId].citedBy.push(paperId);
                    }
                });

                // Process citations (incoming links)
                const cites = data.citations || [];
                cites.forEach((cite: any) => {
                    const citeId = cite.paperId;
                    if (citeId && paperIds.has(citeId)) {
                        edges.push({ source: citeId, target: paperId });
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
        edges.forEach(e => {
            const key = `${e.source}->${e.target}`;
            if (!uniqueEdgesMap[key]) {
                uniqueEdgesMap[key] = true;
                uniqueEdges.push(e);
            }
        });

        // Add top 3 shared external references to the graph to make it dense and interesting
        const sharedRefs = Object.keys(referenceCounts)
            .map(refId => ({ id: refId, ...referenceCounts[refId] }))
            .filter(ref => ref.count > 1) // must be cited by at least 2 papers
            .sort((a, b) => b.citations - a.citations) // sort by citation count
            .slice(0, 4);

        sharedRefs.forEach(ref => {
            // Add as node
            nodes.push({
                id: ref.id,
                title: "[Co-Citation] " + ref.title,
                citations: ref.citations,
                year: ref.year
            });

            // Add edges from our papers citing it
            ref.citedBy.forEach(paperId => {
                uniqueEdges.push({ source: paperId, target: ref.id });
            });
        });

        return new Response(JSON.stringify({ nodes, edges: uniqueEdges }), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });

    } catch (error: any) {
        console.error("Citation Network Graph error:", error);
        return new Response(JSON.stringify({ nodes: [], edges: [] }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config = {
    path: "/api/network-graph"
};
