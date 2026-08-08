// Shared utilities for Netlify Serverless Functions
export interface Paper {
    id: string;
    title: string;
    authors: string[];
    year: number;
    abstract: string;
    doi?: string;
    citations: number;
    consensusStance?: string;
}

// Retrieve API keys from headers or environment
export function getApiKey(headers: Headers, type: 'gemini' | 'groq'): string {
    const headerName = type === 'gemini' ? 'x-gemini-key' : 'x-groq-key';
    const envName = type === 'gemini' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY';

    const keyFromHeader = headers.get(headerName);
    if (keyFromHeader && keyFromHeader.trim()) {
        return keyFromHeader.trim();
    }

    return process.env[envName] || '';
}

// Exponential backoff wrapper
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        const jitter = Math.random();
        const backoffDelay = delay * Math.pow(2, 3 - retries) + jitter * 1000;
        console.warn(`API call failed, retrying in ${Math.round(backoffDelay)}ms... Error:`, error);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return retryWithBackoff(fn, retries - 1, delay);
    }
}

// Raw HTTP client for Gemini Generation API
export async function callGemini(
    prompt: string,
    responseMimeType: 'text/plain' | 'application/json' = 'text/plain',
    apiKey: string,
): Promise<string> {
    if (!apiKey) {
        throw new Error('Gemini API key is required. Please configure it in Settings.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const body = {
        contents: [
            {
                parts: [{ text: prompt }],
            },
        ],
        generationConfig: {
            responseMimeType: responseMimeType,
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error (HTTP ${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        throw new Error('Malformed Gemini response: ' + JSON.stringify(data));
    }

    return data.candidates[0].content.parts[0].text;
}

// Raw HTTP client for Gemini Embeddings API
export async function callGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
    if (!apiKey) {
        throw new Error('Gemini API key is required for embeddings.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

    const body = {
        content: {
            parts: [{ text: text }],
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Embedding Error: ${errorText}`);
    }

    const data = (await response.json()) as any;
    if (!data.embedding || !data.embedding.values) {
        throw new Error('Malformed Gemini embedding response');
    }

    return data.embedding.values;
}

// Cosine similarity in JS
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
