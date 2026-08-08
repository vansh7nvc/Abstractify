// Shared utilities for Netlify Serverless Functions
// Supports both AIza... and new AQ... Google API keys by using the x-goog-api-key header

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

    // Prioritize header key first if provided (allows BYOK override)
    const keyFromHeader = headers.get(headerName);
    if (keyFromHeader && keyFromHeader.trim()) {
        return keyFromHeader.trim();
    }

    // Fall back to environment variable (secure background usage)
    const envKey = process.env[envName];
    if (envKey && envKey.trim()) {
        return envKey.trim();
    }

    return '';
}

// Exponential backoff wrapper
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = process.env.VITEST ? 0 : 1000,
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        const jitter = delay > 0 ? Math.random() * 1000 : 0;
        const backoffDelay = delay > 0 ? delay * Math.pow(2, 3 - retries) + jitter : 0;
        if (backoffDelay > 0) {
            console.warn(`API call failed, retrying in ${Math.round(backoffDelay)}ms... Error:`, error);
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
        return retryWithBackoff(fn, retries - 1, delay);
    }
}

// Helper to format/beautify Google API error messages
function handleGoogleApiError(status: number, errorText: string): Error {
    try {
        const parsed = JSON.parse(errorText);
        const errObj = parsed.error || {};
        const message = errObj.message || '';
        const details = errObj.details || [];

        const isBlocked =
            details.some((d: any) => d.reason === 'API_KEY_SERVICE_BLOCKED') ||
            message.includes('API_KEY_SERVICE_BLOCKED') ||
            message.includes('blocked');

        const isQuotaExceeded =
            status === 429 ||
            message.includes('quota') ||
            message.includes('limit') ||
            message.includes('exceeded') ||
            message.includes('RESOURCE_EXHAUSTED');

        if (isBlocked) {
            return new Error(
                `Your Gemini API Key is restricted. In your Google Cloud Console (APIs & Services > Credentials), edit this API key and ensure "Generative Language API" is checked under "API restrictions".`,
            );
        }

        if (isQuotaExceeded) {
            return new Error(
                `Gemini API Rate Limit Exceeded (HTTP 429). Please wait a few seconds before retrying or ensure billing is configured on Google AI Studio if you require higher limits.`,
            );
        }

        return new Error(`Gemini API Error (HTTP ${status}): ${message || errorText}`);
    } catch {
        return new Error(`Gemini API Error (HTTP ${status}): ${errorText}`);
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`;

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

    console.log(`[Backend] Executing Gemini API generation request...`);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw handleGoogleApiError(response.status, errorText);
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent`;

    const body = {
        content: {
            parts: [{ text: text }],
        },
    };

    console.log(`[Backend] Executing Gemini Embedding request...`);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw handleGoogleApiError(response.status, errorText);
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

// Workspace passcode verification helper (bypassed)
export function checkPasscode(headers: Headers): Response | null {
    return null;
}
