// Upstash Redis Serverless Client Adapter
import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
    if (redisClient) return redisClient;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token && url.trim() && token.trim()) {
        try {
            redisClient = new Redis({
                url: url.trim(),
                token: token.trim(),
            });
            return redisClient;
        } catch (err) {
            console.warn('[Redis] Failed to initialize Upstash Redis client:', err);
            return null;
        }
    }

    return null;
}

export function setRedisClient(client: Redis | null): void {
    redisClient = client;
}

// Key-Value Caching
export async function cacheGet<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    if (!redis) return null;

    try {
        const data = await redis.get<T>(key);
        return data ?? null;
    } catch (err) {
        console.warn(`[Redis] cacheGet error for key "${key}":`, err);
        return null;
    }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 86400): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    try {
        if (ttlSeconds > 0) {
            await redis.set(key, value, { ex: ttlSeconds });
        } else {
            await redis.set(key, value);
        }
        return true;
    } catch (err) {
        console.warn(`[Redis] cacheSet error for key "${key}":`, err);
        return false;
    }
}

// Research Session Persistence
export interface ResearchSession {
    id: string;
    query: string;
    papers: any[];
    consensus?: any;
    matrix?: any[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export async function saveSession(session: ResearchSession): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    const key = `session:${session.id}`;
    const now = new Date().toISOString();
    const payload: ResearchSession = {
        ...session,
        createdAt: session.createdAt || now,
        updatedAt: now,
    };

    try {
        // Save session data with a 30-day retention period
        await redis.set(key, payload, { ex: 30 * 24 * 3600 });
        // Track in recent session list
        await redis.lpush('sessions:recent', session.id);
        await redis.ltrim('sessions:recent', 0, 99);
        return true;
    } catch (err) {
        console.warn(`[Redis] saveSession error for session "${session.id}":`, err);
        return false;
    }
}

export async function getSession(sessionId: string): Promise<ResearchSession | null> {
    const redis = getRedis();
    if (!redis) return null;

    const key = `session:${sessionId}`;
    try {
        const session = await redis.get<ResearchSession>(key);
        return session ?? null;
    } catch (err) {
        console.warn(`[Redis] getSession error for session "${sessionId}":`, err);
        return null;
    }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    const key = `session:${sessionId}`;
    try {
        await redis.del(key);
        await redis.lrem('sessions:recent', 0, sessionId);
        return true;
    } catch (err) {
        console.warn(`[Redis] deleteSession error for session "${sessionId}":`, err);
        return false;
    }
}
