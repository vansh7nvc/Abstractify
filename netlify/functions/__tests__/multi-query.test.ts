import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@netlify/functions';
import multiQueryHandler from '../multi-query.js';

vi.mock('../_utils.js', async (importOriginal) => {
    const original = await importOriginal<typeof import('../_utils.js')>();
    return {
        ...original,
        callGemini: vi.fn(async (prompt: string) =>
            prompt.includes('executive research supervisor')
                ? 'final synthesis'
                : 'specialist report',
        ),
    };
});

describe('multi-query endpoint', () => {
    const context = {} as Context;

    beforeEach(() => vi.clearAllMocks());

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
});
