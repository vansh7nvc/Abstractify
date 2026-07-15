import { Context } from "@netlify/functions";
import { getApiKey, callGemini, Paper, checkPasscode } from "./_utils.js";

interface CompareRequest {
    papers: Paper[];
}

interface MatrixRow {
    title: string;
    datasetSize: string;
    methodology: string;
    outcomes: string;
    limitations: string;
}

export default async (req: Request, context: Context) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        const body = await req.json() as CompareRequest;
        const { papers } = body;

        if (!papers || papers.length === 0) {
            return new Response(JSON.stringify({ message: "Papers list is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const geminiKey = getApiKey(req.headers, "gemini");
        if (!geminiKey) {
            // Local fallback extraction
            console.log("No API key provided, running fallback comparison matrix...");
            const matrix = papers.map(p => ({
                title: p.title,
                datasetSize: "N/A (Key Missing)",
                methodology: "TF-IDF extraction fallback",
                outcomes: `Indexed with ${p.citations} citations`,
                limitations: "Requires Gemini API Key for parameter extraction"
            }));

            return new Response(JSON.stringify({ matrix }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        // Batch Prompt for parameter extraction
        let prompt = `You are a research extraction system. For each of the following research papers, extract the key study design parameters from their title and abstract.

Papers:
`;

        papers.forEach((p, idx) => {
            prompt += `---
Paper ${idx + 1}:
Title: ${p.title}
Abstract: ${p.abstract}
`;
        });

        prompt += `
Extract the details into a strict JSON list. Each object must have these attributes:
- "title": The title of the paper.
- "datasetSize": The sample size, dataset size, or type of data used (e.g. "N=1,024 images", "15,000 text articles", or "Not specified").
- "methodology": The core model architecture, algorithm, or methodology (e.g. "ResNet50 with transfer learning", "Reinforcement learning from human feedback").
- "outcomes": Primary quantitative or qualitative metrics achieved (e.g. "92% accuracy, 10% reduction in delay").
- "limitations": Key limitation, drawbacks, or vulnerabilities discussed (e.g. "High latency, prone to hallucination").

Provide your response in JSON format. Do not add markdown backticks outside of the JSON. Format must be:
[
  {
    "title": "...",
    "datasetSize": "...",
    "methodology": "...",
    "outcomes": "...",
    "limitations": "..."
  }
]
`;

        const responseText = await callGemini(prompt, "application/json", geminiKey);
        
        // Clean JSON formatting if Gemini adds markdown codeblocks
        const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const matrix = JSON.parse(cleanedText) as MatrixRow[];

        return new Response(JSON.stringify({ matrix }), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });

    } catch (error: any) {
        console.error("Comparison Matrix API error:", error);
        return new Response(JSON.stringify({ message: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config = {
    path: "/api/compare"
};
