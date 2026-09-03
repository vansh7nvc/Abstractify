import { describe, it, expect, vi, beforeEach } from 'vitest';
import sessionsHandler from '../sessions.js';
import * as redisModule from '../shared/redis.js';

describe('sessions.ts endpoint handler', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('handles OPTIONS preflight requests', async () => {
        const req = new Request('http://localhost/api/sessions', { method: 'OPTIONS' });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(200);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('rejects GET without id parameter', async () => {
        const req = new Request('http://localhost/api/sessions', { method: 'GET' });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/Missing session id/);
    });

    it('returns 404 when GET finds no session', async () => {
        vi.spyOn(redisModule, 'getSession').mockResolvedValueOnce(null);
        const req = new Request('http://localhost/api/sessions?id=missing-123', { method: 'GET' });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.error).toBe('Session not found');
    });

    it('returns session data on successful GET', async () => {
        const mockSession = {
            id: 'sess-1',
            query: 'quantum computing',
            papers: [],
            consensus: null,
            matrix: [],
            notes: '',
            createdAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-09-01T00:00:00.000Z',
        };
        vi.spyOn(redisModule, 'getSession').mockResolvedValueOnce(mockSession);
        const req = new Request('http://localhost/api/sessions?id=sess-1', { method: 'GET' });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.session.id).toBe('sess-1');
        expect(data.session.query).toBe('quantum computing');
    });

    it('rejects POST with missing id or query', async () => {
        const req = new Request('http://localhost/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ notes: 'no query or id' }),
            headers: { 'Content-Type': 'application/json' },
        });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/Session id and query are required/);
    });

    it('handles POST fallback when redis is not configured (saveSession returns false)', async () => {
        vi.spyOn(redisModule, 'saveSession').mockResolvedValueOnce(false);
        const req = new Request('http://localhost/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ id: 'sess-fallback', query: 'ai safety' }),
            headers: { 'Content-Type': 'application/json' },
        });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.warning).toBeDefined();
        expect(data.session.id).toBe('sess-fallback');
    });

    it('returns 201 on successful POST when saved', async () => {
        vi.spyOn(redisModule, 'saveSession').mockResolvedValueOnce(true);
        const req = new Request('http://localhost/api/sessions', {
            method: 'POST',
            body: JSON.stringify({ id: 'sess-persisted', query: 'deep learning' }),
            headers: { 'Content-Type': 'application/json' },
        });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.session.query).toBe('deep learning');
    });

    it('rejects DELETE without id parameter', async () => {
        const req = new Request('http://localhost/api/sessions', { method: 'DELETE' });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/Missing session id/);
    });

    it('deletes session on DELETE with id parameter', async () => {
        const deleteSpy = vi.spyOn(redisModule, 'deleteSession').mockResolvedValueOnce(true);
        const req = new Request('http://localhost/api/sessions?id=sess-to-delete', {
            method: 'DELETE',
        });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.deletedId).toBe('sess-to-delete');
        expect(deleteSpy).toHaveBeenCalledWith('sess-to-delete');
    });

    it('returns 405 for unsupported HTTP methods', async () => {
        const req = new Request('http://localhost/api/sessions', { method: 'PATCH' });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(405);
    });

    it('catches and returns 500 on unexpected errors', async () => {
        vi.spyOn(redisModule, 'getSession').mockRejectedValueOnce(new Error('Database explosion'));
        const req = new Request('http://localhost/api/sessions?id=err-1', { method: 'GET' });
        const res = await sessionsHandler(req, {} as any);
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe('Database explosion');
    });
});
