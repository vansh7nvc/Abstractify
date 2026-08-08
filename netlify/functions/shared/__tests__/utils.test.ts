import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getApiKey,
    retryWithBackoff,
    callGemini,
    callGeminiEmbedding,
    cosineSimilarity,
} from '../utils.js';

describe('netlify/functions/shared/utils.ts', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getApiKey', () => {
        it('extracts gemini key from header when header is present', () => {
            const headers = new Headers({ 'x-gemini-key': 'header-gemini-123' });
            expect(getApiKey(headers, 'gemini')).toBe('header-gemini-123');
        });

        it('extracts groq key from header when header is present', () => {
            const headers = new Headers({ 'x-groq-key': 'header-groq-456' });
            expect(getApiKey(headers, 'groq')).toBe('header-groq-456');
        });

        it('falls back to environment variable if header key is missing', () => {
            process.env.GEMINI_API_KEY = 'env-gemini-789';
            const headers = new Headers();
            expect(getApiKey(headers, 'gemini')).toBe('env-gemini-789');
        });

        it('falls back to env for groq if header is empty whitespace', () => {
            process.env.GROQ_API_KEY = 'env-groq-321';
            const headers = new Headers({ 'x-groq-key': '   ' });
            expect(getApiKey(headers, 'groq')).toBe('env-groq-321');
        });

        it('returns empty string if neither header nor env exists', () => {
            delete process.env.GEMINI_API_KEY;
            const headers = new Headers();
            expect(getApiKey(headers, 'gemini')).toBe('');
        });
    });

    describe('retryWithBackoff', () => {
        it('returns result immediately on successful execution', async () => {
            const fn = vi.fn().mockResolvedValue('success');
            const result = await retryWithBackoff(fn, 3, 10);
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('retries up to specified count on error before succeeding', async () => {
            const fn = vi
                .fn()
                .mockRejectedValueOnce(new Error('Transient Error 1'))
                .mockRejectedValueOnce(new Error('Transient Error 2'))
                .mockResolvedValue('eventual success');

            const result = await retryWithBackoff(fn, 2, 5);
            expect(result).toBe('eventual success');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('throws error when max retries are exceeded', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('Persistent Failure'));
            await expect(retryWithBackoff(fn, 1, 5)).rejects.toThrow('Persistent Failure');
            expect(fn).toHaveBeenCalledTimes(2);
        });
    });

    describe('cosineSimilarity', () => {
        it('calculates correct cosine similarity for identical vectors', () => {
            const vec = [1, 2, 3];
            expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
        });

        it('calculates 0 for orthogonal vectors', () => {
            const vecA = [1, 0, 0];
            const vecB = [0, 1, 0];
            expect(cosineSimilarity(vecA, vecB)).toBe(0);
        });

        it('calculates correct cosine similarity for arbitrary vectors', () => {
            const vecA = [1, 2, 3];
            const vecB = [4, 5, 6];
            // dot = 4 + 10 + 18 = 32
            // normA = sqrt(14), normB = sqrt(77)
            // sim = 32 / sqrt(1078) ≈ 0.9746318...
            expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.97463, 4);
        });

        it('returns 0 if either vector has norm of 0', () => {
            expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
            expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
        });
    });

    describe('callGemini', () => {
        it('throws an error if API key is missing', async () => {
            await expect(callGemini('test prompt', 'text/plain', '')).rejects.toThrow(
                'Gemini API key is required. Please configure it in Settings.',
            );
        });

        it('calls Gemini API and returns generated text on success', async () => {
            const mockResponseText = 'Generated response content';
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: mockResponseText }],
                            },
                        },
                    ],
                }),
            });
            vi.stubGlobal('fetch', fetchMock);

            const result = await callGemini('Hello Gemini', 'text/plain', 'valid-key');
            expect(result).toBe(mockResponseText);
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('generativelanguage.googleapis.com'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('Hello Gemini'),
                }),
            );
        });

        it('throws an error on HTTP failure response', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                text: async () => 'Invalid Argument',
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(callGemini('Test', 'text/plain', 'valid-key')).rejects.toThrow(
                'Gemini API Error (HTTP 400): Invalid Argument',
            );
        });

        it('throws an error if candidates payload is malformed', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ candidates: [] }),
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(callGemini('Test', 'text/plain', 'valid-key')).rejects.toThrow(
                'Malformed Gemini response',
            );
        });
    });

    describe('callGeminiEmbedding', () => {
        it('throws error if API key is missing', async () => {
            await expect(callGeminiEmbedding('sample text', '')).rejects.toThrow(
                'Gemini API key is required for embeddings.',
            );
        });

        it('returns embedding array on success', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    embedding: { values: mockEmbedding },
                }),
            });
            vi.stubGlobal('fetch', fetchMock);

            const result = await callGeminiEmbedding('sample text', 'valid-key');
            expect(result).toEqual(mockEmbedding);
        });

        it('throws error on HTTP failure', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: false,
                text: async () => 'Server Error',
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(callGeminiEmbedding('sample text', 'valid-key')).rejects.toThrow(
                'Gemini Embedding Error: Server Error',
            );
        });

        it('throws error on malformed embedding response', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({}),
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(callGeminiEmbedding('sample text', 'valid-key')).rejects.toThrow(
                'Malformed Gemini embedding response',
            );
        });
    });
});
