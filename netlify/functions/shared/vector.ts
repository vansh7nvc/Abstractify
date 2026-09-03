// Upstash Vector Serverless Client Adapter
import { Index } from '@upstash/vector';

let vectorIndex: Index | null = null;

export function getVectorIndex(): Index | null {
    if (vectorIndex) return vectorIndex;

    const url = process.env.UPSTASH_VECTOR_REST_URL;
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

    if (url && token && url.trim() && token.trim()) {
        try {
            vectorIndex = new Index({
                url: url.trim(),
                token: token.trim(),
            });
            return vectorIndex;
        } catch (err) {
            console.warn('[Vector] Failed to initialize Upstash Vector index:', err);
            return null;
        }
    }

    return null;
}

export function setVectorIndex(index: Index | null): void {
    vectorIndex = index;
}

export interface VectorRecord {
    id: string;
    vector: number[];
    metadata?: Record<string, any>;
    data?: string;
}

export interface VectorSearchResult {
    id: string;
    score: number;
    metadata?: Record<string, any>;
    data?: string;
}

// Upsert a single vector with metadata
export async function upsertVector(record: VectorRecord, namespace?: string): Promise<boolean> {
    const index = getVectorIndex();
    if (!index) return false;

    try {
        const target = namespace ? index.namespace(namespace) : index;
        await target.upsert({
            id: record.id,
            vector: record.vector,
            metadata: record.metadata,
            data: record.data,
        });
        return true;
    } catch (err) {
        console.warn(`[Vector] upsertVector error for id "${record.id}":`, err);
        return false;
    }
}

// Batch upsert vectors
export async function upsertVectors(records: VectorRecord[], namespace?: string): Promise<boolean> {
    const index = getVectorIndex();
    if (!index || records.length === 0) return false;

    try {
        const target = namespace ? index.namespace(namespace) : index;
        await target.upsert(
            records.map((r) => ({
                id: r.id,
                vector: r.vector,
                metadata: r.metadata,
                data: r.data,
            })),
        );
        return true;
    } catch (err) {
        console.warn(`[Vector] upsertVectors error for ${records.length} records:`, err);
        return false;
    }
}

// Query nearest vectors by vector embedding
export async function queryNearest(
    queryVector: number[],
    topK = 5,
    namespace?: string,
    filter?: string,
): Promise<VectorSearchResult[]> {
    const index = getVectorIndex();
    if (!index) return [];

    try {
        const target = namespace ? index.namespace(namespace) : index;
        const results = await target.query({
            vector: queryVector,
            topK,
            includeMetadata: true,
            includeVectors: false,
            filter,
        });

        return results.map((r) => ({
            id: String(r.id),
            score: r.score,
            metadata: r.metadata as Record<string, any>,
            data: r.data,
        }));
    } catch (err) {
        console.warn('[Vector] queryNearest error:', err);
        return [];
    }
}

// Delete vector by ID
export async function deleteVector(id: string, namespace?: string): Promise<boolean> {
    const index = getVectorIndex();
    if (!index) return false;

    try {
        const target = namespace ? index.namespace(namespace) : index;
        await target.delete(id);
        return true;
    } catch (err) {
        console.warn(`[Vector] deleteVector error for id "${id}":`, err);
        return false;
    }
}
