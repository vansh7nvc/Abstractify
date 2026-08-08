import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getApiKey,
    retryWithBackoff,
    callGemini,
    callGeminiEmbedding,
    cosineSimilarity,
    checkPasscode,
} from '../_utils.js';

describe('netlify/functions/_utils.ts', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('checkPasscode', () => {
        it('returns null for passcode verification', () => {
            const headers = new Headers();
            expect(checkPasscode(headers)).toBeNull();
        });
    });

    describe('getApiKey', () => {
        it('prioritizes header key over env key', () => {
            process.env.GEMINI_API_KEY = 'env-gemini-key';
            const headers = new Headers({ 'x-gemini-key': 'header-gemini-key' });
            expect(getApiKey(headers, 'gemini')).toBe('header-gemini-key');
        });

        it('uses env key if header key is missing or blank', () => {
            process.env.GROQ_API_KEY = 'env-groq-key';
            const headers = new Headers({ 'x-groq-key': '   ' });
            expect(getApiKey(headers, 'groq')).toBe('env-groq-key');
        });

        it('returns empty string if neither header nor env key is available', () => {
            delete process.env.GEMINI_API_KEY;
            const headers = new Headers();
            expect(getApiKey(headers, 'gemini')).toBe('');
        });
    });

    describe('retryWithBackoff', () => {
        it('returns result on first attempt if successful', async () => {
            const fn = vi.fn().mockResolvedValue('ok');
            const res = await retryWithBackoff(fn, 3, 5);
            expect(res).toBe('ok');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('retries until retries count reaches 0', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('Failure'));
            await expect(retryWithBackoff(fn, 1, 5)).rejects.toThrow('Failure');
            expect(fn).toHaveBeenCalledTimes(2);
        });
    });

    describe('cosineSimilarity', () => {
        it('returns 0 if norm is zero', () => {
            expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
        });

        it('computes correct similarity score', () => {
            expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
            expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
        });
    });

    describe('callGemini with handleGoogleApiError branches', () => {
        it('throws error if API key is missing', async () => {
            await expect(callGemini('prompt', 'text/plain', '')).rejects.toThrow(
                'Gemini API key is required. Please configure it in Settings.',
            );
        });

        it('handles API_KEY_SERVICE_BLOCKED error message formatting', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: false,
                status: 403,
                text: async () =>
                    JSON.stringify({
                        error: {
                            message: 'API_KEY_SERVICE_BLOCKED',
                            details: [{ reason: 'API_KEY_SERVICE_BLOCKED' }],
                        },
                    }),
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(callGemini('prompt', 'text/plain', 'key')).rejects.toThrow(
                'Your Gemini API Key is restricted',
            );
        });

        it('handles quota exceeded HTTP 429 error formatting', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: false,
                status: 429,
                text: async () =>
                    JSON.stringify({
                        error: { message: 'Quota exceeded for quota metric' },
                    }),
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(callGemini('prompt', 'text/plain', 'key')).rejects.toThrow(
                'Gemini API Rate Limit Exceeded (HTTP 429)',
            );
        });

        it('handles non-JSON error response fallback', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                text: async () => 'Raw internal server error',
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(callGemini('prompt', 'text/plain', 'key')).rejects.toThrow(
                'Gemini API Error (HTTP 500): Raw internal server error',
            );
        });

        it('returns generated text on successful response', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Response from model' }] } }],
                }),
            });
            vi.stubGlobal('fetch', fetchMock);

            const result = await callGemini('prompt', 'text/plain', 'key');
            expect(result).toBe('Response from model');
        });

        it('throws error if response payload candidates is missing', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ candidates: [] }),
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(callGemini('prompt', 'text/plain', 'key')).rejects.toThrow(
                'Malformed Gemini response',
            );
        });
    });

    describe('callGeminiEmbedding', () => {
        it('throws error when API key is blank', async () => {
            await expect(callGeminiEmbedding('text', '')).rejects.toThrow(
                'Gemini API key is required for embeddings.',
            );
        });

        it('returns embedding array on success', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    embedding: { values: [0.5, 0.6, 0.7] },
                }),
            });
            vi.stubGlobal('fetch', fetchMock);

            const res = await callGeminiEmbedding('text', 'key');
            expect(res).toEqual([0.5, 0.6, 0.7]);
        });

        it('handles error in callGeminiEmbedding', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                text: async () => 'Bad request',
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(callGeminiEmbedding('text', 'key')).rejects.toThrow('Gemini API Error');
        });

        it('throws error if embedding values are missing in response', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ embedding: {} }),
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(callGeminiEmbedding('text', 'key')).rejects.toThrow(
                'Malformed Gemini embedding response',
            );
        });
    });
});
