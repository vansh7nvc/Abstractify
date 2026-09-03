import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    cacheGet,
    cacheSet,
    saveSession,
    getSession,
    deleteSession,
    setRedisClient,
    getRedis,
} from '../shared/redis.js';
import {
    upsertVector,
    upsertVectors,
    queryNearest,
    deleteVector,
    setVectorIndex,
    getVectorIndex,
} from '../shared/vector.js';

describe('Upstash Redis & Vector Adapters', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        setRedisClient(null);
        setVectorIndex(null);
        process.env = { ...originalEnv };
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        delete process.env.UPSTASH_VECTOR_REST_URL;
        delete process.env.UPSTASH_VECTOR_REST_TOKEN;
    });

    afterEach(() => {
        setRedisClient(null);
        setVectorIndex(null);
        process.env = originalEnv;
    });

    describe('shared/redis.ts in fallback mode (no env vars)', () => {
        it('returns null on cacheGet when Redis is unconfigured', async () => {
            const res = await cacheGet('test:key');
            expect(res).toBeNull();
        });

        it('returns false on cacheSet when Redis is unconfigured', async () => {
            const res = await cacheSet('test:key', { data: 123 });
            expect(res).toBe(false);
        });

        it('returns false on saveSession when Redis is unconfigured', async () => {
            const res = await saveSession({
                id: 'sess_1',
                query: 'Alzheimer hypothesis',
                papers: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            expect(res).toBe(false);
        });

        it('returns null on getSession when Redis is unconfigured', async () => {
            const res = await getSession('sess_1');
            expect(res).toBeNull();
        });

        it('returns false on deleteSession when Redis is unconfigured', async () => {
            const res = await deleteSession('sess_1');
            expect(res).toBe(false);
        });

        it('initializes getRedis when env vars are present', () => {
            process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io';
            process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
            const redis = getRedis();
            expect(redis).toBeDefined();
        });
    });

    describe('shared/redis.ts configured operations', () => {
        it('executes cacheGet and cacheSet when client is initialized', async () => {
            const fakeRedis = {
                get: vi.fn().mockResolvedValue({ cached: true }),
                set: vi.fn().mockResolvedValue('OK'),
                del: vi.fn().mockResolvedValue(1),
            };
            setRedisClient(fakeRedis as any);

            const fetched = await cacheGet('my-key');
            expect(fetched).toEqual({ cached: true });

            const setWithoutTtl = await cacheSet('my-key', { foo: 'bar' }, 0);
            expect(setWithoutTtl).toBe(true);
            expect(fakeRedis.set).toHaveBeenCalledWith('my-key', { foo: 'bar' });

            const setWithTtl = await cacheSet('my-key', { foo: 'bar' }, 3600);
            expect(setWithTtl).toBe(true);
            expect(fakeRedis.set).toHaveBeenCalledWith('my-key', { foo: 'bar' }, { ex: 3600 });
        });

        it('handles Redis cache errors gracefully', async () => {
            const brokenRedis = {
                get: vi.fn().mockRejectedValue(new Error('Redis timeout')),
                set: vi.fn().mockRejectedValue(new Error('Redis quota')),
            };
            setRedisClient(brokenRedis as any);

            const resGet = await cacheGet('fail-key');
            expect(resGet).toBeNull();

            const resSet = await cacheSet('fail-key', 'value');
            expect(resSet).toBe(false);
        });

        it('saves, retrieves, and deletes sessions with mock client', async () => {
            const session = {
                id: 'sess-100',
                query: 'Quantum chemistry',
                papers: [],
                createdAt: '2026-09-01T00:00:00Z',
                updatedAt: '2026-09-01T00:00:00Z',
            };
            const fakeRedis = {
                get: vi.fn().mockResolvedValue(session),
                set: vi.fn().mockResolvedValue('OK'),
                del: vi.fn().mockResolvedValue(1),
                lpush: vi.fn().mockResolvedValue(1),
                ltrim: vi.fn().mockResolvedValue('OK'),
                lrem: vi.fn().mockResolvedValue(1),
            };
            setRedisClient(fakeRedis as any);

            const saved = await saveSession(session);
            expect(saved).toBe(true);

            const retrieved = await getSession('sess-100');
            expect(retrieved).toEqual(session);

            const deleted = await deleteSession('sess-100');
            expect(deleted).toBe(true);
        });

        it('handles session errors gracefully', async () => {
            const brokenRedis = {
                get: vi.fn().mockRejectedValue(new Error('error')),
                set: vi.fn().mockRejectedValue(new Error('error')),
                del: vi.fn().mockRejectedValue(new Error('error')),
            };
            setRedisClient(brokenRedis as any);

            expect(
                await saveSession({
                    id: '1',
                    query: 'q',
                    papers: [],
                    createdAt: '',
                    updatedAt: '',
                }),
            ).toBe(false);
            expect(await getSession('1')).toBeNull();
            expect(await deleteSession('1')).toBe(false);
        });
    });

    describe('shared/vector.ts in fallback mode (no env vars)', () => {
        it('returns false on upsertVector when Vector DB is unconfigured', async () => {
            const res = await upsertVector({
                id: 'vec_1',
                vector: [0.1, 0.2, 0.3],
                metadata: { doi: '10.1038/test' },
            });
            expect(res).toBe(false);
        });

        it('returns false on upsertVectors when Vector DB is unconfigured', async () => {
            const res = await upsertVectors([
                { id: 'vec_1', vector: [0.1, 0.2] },
                { id: 'vec_2', vector: [0.3, 0.4] },
            ]);
            expect(res).toBe(false);
        });

        it('returns empty array on queryNearest when Vector DB is unconfigured', async () => {
            const res = await queryNearest([0.1, 0.2, 0.3], 5);
            expect(res).toEqual([]);
        });

        it('returns false on deleteVector when Vector DB is unconfigured', async () => {
            const res = await deleteVector('vec_1');
            expect(res).toBe(false);
        });

        it('initializes getVectorIndex when env vars are present', () => {
            process.env.UPSTASH_VECTOR_REST_URL = 'https://fake-vector.upstash.io';
            process.env.UPSTASH_VECTOR_REST_TOKEN = 'fake-vector-token';
            const index = getVectorIndex();
            expect(index).toBeDefined();
        });
    });

    describe('shared/vector.ts configured operations', () => {
        it('upserts single and batch vectors, queries nearest, and deletes', async () => {
            const fakeIndex = {
                upsert: vi.fn().mockResolvedValue('OK'),
                query: vi
                    .fn()
                    .mockResolvedValue([{ id: 'v1', score: 0.95, metadata: { title: 'Paper 1' } }]),
                delete: vi.fn().mockResolvedValue(1),
                namespace: vi.fn().mockReturnThis(),
            };
            setVectorIndex(fakeIndex as any);

            const upSingle = await upsertVector({ id: 'v1', vector: [0.1, 0.2] });
            expect(upSingle).toBe(true);

            const upSingleWithNamespace = await upsertVector(
                { id: 'v1', vector: [0.1, 0.2] },
                'custom-ns',
            );
            expect(upSingleWithNamespace).toBe(true);

            const upBatch = await upsertVectors([
                { id: 'v1', vector: [0.1, 0.2] },
                { id: 'v2', vector: [0.3, 0.4] },
            ]);
            expect(upBatch).toBe(true);

            const upBatchWithNs = await upsertVectors(
                [{ id: 'v1', vector: [0.1, 0.2] }],
                'batch-ns',
            );
            expect(upBatchWithNs).toBe(true);

            const nearest = await queryNearest([0.1, 0.2], 3);
            expect(nearest.length).toBe(1);
            expect(nearest[0].score).toBe(0.95);

            const nearestWithNs = await queryNearest([0.1, 0.2], 3, 'test-ns');
            expect(nearestWithNs.length).toBe(1);

            const deleted = await deleteVector('v1', 'test-ns');
            expect(deleted).toBe(true);
        });

        it('handles vector errors gracefully', async () => {
            const brokenIndex = {
                upsert: vi.fn().mockRejectedValue(new Error('Vector API down')),
                query: vi.fn().mockRejectedValue(new Error('Vector query failed')),
                delete: vi.fn().mockRejectedValue(new Error('Delete error')),
                namespace: vi.fn().mockReturnThis(),
            };
            setVectorIndex(brokenIndex as any);

            expect(await upsertVector({ id: 'v1', vector: [1] })).toBe(false);
            expect(await upsertVectors([{ id: 'v1', vector: [1] }])).toBe(false);
            expect(await queryNearest([1], 5)).toEqual([]);
            expect(await deleteVector('v1')).toBe(false);
        });
    });
});
