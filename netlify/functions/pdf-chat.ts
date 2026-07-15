import { Context } from "@netlify/functions";
import { getApiKey, callGemini, callGeminiEmbedding, cosineSimilarity, Paper, checkPasscode } from "./_utils.js";

interface ChatRequest {
    message: string;
    chunks?: string[];
    searchResults?: Paper[];
}

interface AgentResponse {
    thought?: string;
    tool?: "retrieve_context" | "analyze_search_results" | "none";
    tool_query?: string;
    reply?: string;
}

export default async (req: Request, context: Context) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        const body = await req.json() as ChatRequest;
        const { message, chunks = [], searchResults = [] } = body;

        if (!message) {
            return new Response(JSON.stringify({ message: "Message is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const geminiKey = getApiKey(req.headers, "gemini");
        if (!geminiKey) {
            return new Response(JSON.stringify({
                reply: "[Local Fallback Mode] Hello! To chat about your uploaded document or run advanced synthesis agent tools, please configure a Gemini API Key in the Settings panel (top right). You can still ask me general questions, but PDF RAG is disabled without an API Key.",
                logs: ["Fallback loaded (Key Missing)"]
            }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        const logs: string[] = [];
        let conversationHistory = `User query: "${message}"\n`;
        let agentStep = 1;
        let finalReply = "";

        // Run Agentic loop (Max 2 tool iterations to stay within Netlify's 10s timeout limit)
        while (agentStep <= 2) {
            const agentPrompt = `You are a research assistant agent called AbstractiFy. You have access to an uploaded PDF and a set of online academic papers.
            
Conversation history:
${conversationHistory}

Determine if you need to call a tool to answer the user query, or if you can answer it directly.
Available Tools:
1. "retrieve_context": Search the uploaded PDF document for relevant snippets. Use this if the user asks about the uploaded document, its formulas, or findings.
2. "analyze_search_results": Inspect the global papers search results loaded from the online database. Use this if the user asks to compare, list, or synthesize findings from the search results.
3. "none": No tool needed. You have enough information in history to construct the final response.

Respond ONLY with a JSON object. Do not include markdown codeblocks. The schema is:
{
  "thought": "Your step-by-step reasoning on what information is needed.",
  "tool": "retrieve_context" | "analyze_search_results" | "none",
  "tool_query": "Optional query string for the tool (required if tool is retrieve_context)",
  "reply": "Your final detailed markdown answer if tool is 'none'"
}
`;

            const rawResponse = await callGemini(agentPrompt, "application/json", geminiKey);
            const cleanedResponse = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
            
            let agentDecision: AgentResponse;
            try {
                agentDecision = JSON.parse(cleanedResponse) as AgentResponse;
            } catch (e) {
                // If parsing fails, default to direct reply
                finalReply = rawResponse;
                break;
            }

            console.log(`Agent Step ${agentStep}:`, agentDecision);

            if (agentDecision.tool === "none" || !agentDecision.tool) {
                finalReply = agentDecision.reply || "I'm ready to answer.";
                logs.push("Formulated final response.");
                break;
            }

            if (agentDecision.tool === "retrieve_context") {
                const toolQuery = agentDecision.tool_query || message;
                logs.push(`Invoking tool retrieve_context("${toolQuery}")`);

                // Run similarity search on chunks
                let matchedChunks: string[] = [];
                
                if (chunks.length > 0) {
                    try {
                        const queryEmbedding = await callGeminiEmbedding(toolQuery, geminiKey);
                        const scoredChunks = await Promise.all(chunks.map(async (chunk) => {
                            try {
                                const chunkEmbedding = await callGeminiEmbedding(chunk.substring(0, 400), geminiKey);
                                const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
                                return { chunk, score };
                            } catch (e) {
                                return { chunk, score: 0 };
                            }
                        }));
                        scoredChunks.sort((a, b) => b.score - a.score);
                        matchedChunks = scoredChunks.slice(0, 3).map(sc => sc.chunk);
                    } catch (e) {
                        // Fallback keyword search
                        const keywords = toolQuery.toLowerCase().split(" ");
                        matchedChunks = chunks
                            .map(chunk => {
                                const lower = chunk.toLowerCase();
                                let score = 0;
                                keywords.forEach(kw => {
                                    if (lower.includes(kw)) score++;
                                });
                                return { chunk, score };
                            })
                            .filter(sc => sc.score > 0)
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 3)
                            .map(sc => sc.chunk);
                    }
                }

                logs.push(`Found ${matchedChunks.length} relevant chunks in uploaded PDF.`);
                conversationHistory += `\nAction: retrieve_context("${toolQuery}")\nResult: PDF segments found:\n${matchedChunks.map((c, i) => `[Segment ${i+1}]: ${c}`).join("\n")}\n`;
            } 
            else if (agentDecision.tool === "analyze_search_results") {
                logs.push("Invoking tool analyze_search_results()");
                
                const resultsStr = searchResults.map((r, i) => `[Paper ${i+1}] Title: ${r.title}, Stance: ${r.consensusStance || 'N/A'}, Abstract: ${r.abstract}`).join("\n");
                
                logs.push(`Fetched details for ${searchResults.length} online research papers.`);
                conversationHistory += `\nAction: analyze_search_results()\nResult: Global database search papers:\n${resultsStr}\n`;
            }

            agentStep++;
        }

        // If loop finished without direct reply, compile final summary
        if (!finalReply) {
            logs.push("Compiling final answers from tool observations.");
            const finalPrompt = `Synthesize all the tool execution observations in the history below into a final, detailed markdown response to the user's initial query. Do not reference any tool names or internal JSON variables, just give a professional academic response with markdown sections.
            
History:
${conversationHistory}
`;
            finalReply = await callGemini(finalPrompt, "text/plain", geminiKey);
        }

        return new Response(JSON.stringify({ reply: finalReply, logs }), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });

    } catch (error: any) {
        console.error("Agent Chat error:", error);
        return new Response(JSON.stringify({ message: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config = {
    path: "/api/pdf-chat"
};
