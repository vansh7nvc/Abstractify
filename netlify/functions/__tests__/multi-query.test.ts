import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@netlify/functions';
import multiQueryHandler from '../multi-query.js';

const { callGeminiMock } = vi.hoisted(() => ({ callGeminiMock: vi.fn() }));

vi.mock('../_utils.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('../_utils.js')>();
    return {
        ...original,
        callGemini: callGeminiMock,
    };
});

describe('multi-query endpoint', () => {
    const context = {} as Context;

    beforeEach(() => {
        vi.clearAllMocks();
        callGeminiMock.mockImplementation(async (prompt: string) =>
            prompt.includes('executive research supervisor')
                ? 'final synthesis'
                : 'specialist report',
        );
    });

    it('validates methods, query, and API key', async () => {
        const getResponse = await multiQueryHandler(
            new Request('http://localhost/api/agent/multi-query'),
            context,
        );
        expect(getResponse.status).toBe(405);

        const emptyResponse = await multiQueryHandler(
            new Request('http://localhost/api/agent/multi-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-gemini-key': 'key' },
                body: JSON.stringify({ query: '  ' }),
            }),
            context,
        );
        expect(emptyResponse.status).toBe(400);

        const keyResponse = await multiQueryHandler(
            new Request('http://localhost/api/agent/multi-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'valid query' }),
            }),
            context,
        );
        expect(keyResponse.status).toBe(400);

        const agentsResponse = await multiQueryHandler(
            new Request('http://localhost/api/agent/multi-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-gemini-key': 'key' },
                body: JSON.stringify({ query: 'valid query', agents: 'search' }),
            }),
            context,
        );
        expect(agentsResponse.status).toBe(400);
    });

    it('returns 400 for malformed, non-object, and invalid-mode bodies', async () => {
        const malformed = await multiQueryHandler(
            new Request('http://localhost/api/agent/multi-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-gemini-key': 'key' },
                body: '{invalid json',
            }),
            context,
        );
        const nullBody = await multiQueryHandler(
            new Request('http://localhost/api/agent/multi-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-gemini-key': 'key' },
                body: 'null',
            }),
            context,
        );
        const invalidMode = await multiQueryHandler(
            new Request('http://localhost/api/agent/multi-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-gemini-key': 'key' },
                body: JSON.stringify({ query: 'valid query', mode: 0 }),
            }),
            context,
        );

        expect(malformed.status).toBe(400);
        expect(nullBody.status).toBe(400);
        expect(invalidMode.status).toBe(400);
        expect(callGeminiMock).not.toHaveBeenCalled();
    });

    it('returns delegated reports and lifecycle events as JSON', async () => {
        const response = await multiQueryHandler(
            new Request('http://localhost/api/agent/multi-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-gemini-key': 'key' },
                body: JSON.stringify({
                    query: 'Assess a disputed intervention',
                    agents: ['search', 'analysis', 'writing'],
                }),
            }),
            context,
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.finalAnswer).toBe('final synthesis');
        expect(body.results.map((result: { agent: string }) => result.agent)).toEqual([
            'search',
            'analysis',
            'writing',
        ]);
        expect(body.events).toHaveLength(6);
    });

    it('streams lifecycle and completion events for visualizers', async () => {
        const response = await multiQueryHandler(
            new Request('http://localhost/api/agent/multi-query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream',
                    'x-gemini-key': 'key',
                },
                body: JSON.stringify({ query: 'Stream this', agents: ['search'] }),
            }),
            context,
        );
        const stream = await response.text();

        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
        expect(stream).toContain('event: agent:start');
        expect(stream).toContain('event: agent:done');
        expect(stream).toContain('event: orchestration:done');
    });

    it('handles a stream cancellation while orchestration is still running', async () => {
        let rejectGeneration: ((reason: Error) => void) | undefined;
        callGeminiMock.mockImplementation(
            () => new Promise((_resolve, reject) => (rejectGeneration = reject)),
        );

        const response = await multiQueryHandler(
            new Request('http://localhost/api/agent/multi-query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream',
                    'x-gemini-key': 'key',
                },
                body: JSON.stringify({ query: 'Cancel this', agents: ['search'] }),
            }),
            context,
        );
        const reader = response.body!.getReader();
        await vi.waitFor(() => expect(rejectGeneration).toBeTypeOf('function'));

        await reader.cancel();
        rejectGeneration!(new Error('generation stopped'));
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
});
