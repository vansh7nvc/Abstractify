import { Context } from "@netlify/functions";
import { getApiKey, retryWithBackoff, callGeminiEmbedding, cosineSimilarity, Paper, checkPasscode } from "./_utils.js";

export default async (req: Request, context: Context) => {
    // Enable CORS for localhost testing if needed (though Netlify takes care of routing)
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        const body = await req.json() as { query: string };
        const query = body.query;
        if (!query) {
            return new Response(JSON.stringify({ message: "Query parameter is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const geminiKey = getApiKey(req.headers, "gemini");

        // 1. Fetch papers from Semantic Scholar search API
        const sScholarUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=25&fields=title,authors,year,abstract,externalIds,citationCount`;
        
        let papers: Paper[] = [];

        try {
            const fetchPromise = retryWithBackoff(async () => {
                const response = await fetch(sScholarUrl, {
                    headers: { "User-Agent": "AbstractiFy Research App" }
                });
                if (!response.ok) {
                    throw new Error(`Semantic Scholar response not OK (HTTP ${response.status})`);
                }
                const data = await response.json() as any;
                return data.data || [];
            });

            const ssData = await fetchPromise;

            papers = ssData.map((item: any) => ({
                id: item.paperId || Math.random().toString(36).substr(2, 9),
                title: item.title || "",
                authors: item.authors ? item.authors.map((a: any) => a.name) : [],
                year: item.year || null,
                abstract: item.abstract || "",
                doi: item.externalIds ? item.externalIds.DOI : undefined,
                citations: item.citationCount || 0
            })).filter((p: Paper) => p.abstract.length > 30); // only keep papers with abstracts

        } catch (err) {
            console.error("Semantic Scholar search error:", err);
            // Fallback to OpenAlex
            console.log("Searching OpenAlex as fallback...");
            const openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=15`;
            const response = await fetch(openAlexUrl);
            if (response.ok) {
                const data = await response.json() as any;
                papers = (data.results || []).map((item: any) => {
                    const abstractObj = item.abstract_inverted_index || {};
                    // Reconstruct abstract from inverted index
                    let abstract = "";
                    try {
                        const words: string[] = [];
                        Object.keys(abstractObj).forEach(word => {
                            abstractObj[word].forEach((pos: number) => {
                                words[pos] = word;
                            });
                        });
                        abstract = words.join(" ");
                    } catch (e) {
                        abstract = "";
                    }

                    return {
                        id: item.id || Math.random().toString(36).substr(2, 9),
                        title: item.display_name || "",
                        authors: item.authorships ? item.authorships.map((a: any) => a.author.display_name) : [],
                        year: item.publication_year || null,
                        abstract: abstract,
                        doi: item.doi ? item.doi.replace("https://doi.org/", "") : undefined,
                        citations: item.cited_by_count || 0
                    };
                }).filter((p: Paper) => p.abstract.length > 30);
            }
        }

        if (papers.length === 0) {
            return new Response(JSON.stringify({ papers: [] }), {
                headers: { "Content-Type": "application/json" }
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
                papers = scoredPapers.map(sp => sp.paper);

            } catch (err) {
                console.error("Vector re-ranking failed:", err);
                // Fallback to sorting by citation count + relevance
                papers.sort((a, b) => b.citations - a.citations);
            }
        } else {
            // No Gemini API Key: Fallback to sorting by citations count
            papers.sort((a, b) => b.citations - a.citations);
        }

        // Keep top 10 papers
        const finalPapers = papers.slice(0, 10);

        return new Response(JSON.stringify({ papers: finalPapers }), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });

    } catch (error: any) {
        console.error("Global search error handler:", error);
        return new Response(JSON.stringify({ message: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config = {
    path: "/api/search"
};
