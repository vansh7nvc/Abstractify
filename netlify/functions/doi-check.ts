import { Context } from '@netlify/functions';
import { checkPasscode } from './_utils.js';
import { cacheGet, cacheSet } from './shared/redis.js';
import { resolveCrossrefDoi, normalizeDoi, CrossrefDoiResult } from './search/sources/crossref.js';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
        'Content-Type, Authorization, x-gemini-key, x-groq-key, x-app-passcode',
};

export default async (req: Request, context: Context) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const rawDoi = url.searchParams.get('doi');

            if (!rawDoi || !rawDoi.trim()) {
                return new Response(JSON.stringify({ error: 'DOI query parameter is required' }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        ...CORS_HEADERS,
                    },
                });
            }

            const cleanDoi = normalizeDoi(rawDoi);
            if (!cleanDoi) {
                return new Response(JSON.stringify({ error: 'Invalid DOI format' }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        ...CORS_HEADERS,
                    },
                });
            }

            const cacheKey = `crossref:doi:${cleanDoi.toLowerCase()}`;
            const cached = await cacheGet<CrossrefDoiResult>(cacheKey);
            if (cached) {
                return new Response(JSON.stringify(cached), {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Cache': 'HIT',
                        ...CORS_HEADERS,
                    },
                });
            }

            const result = await resolveCrossrefDoi(cleanDoi);

            if (!result) {
                return new Response(
                    JSON.stringify({
                        error: 'DOI not found in Crossref',
                        doi: cleanDoi,
                        isRetracted: false,
                        hasCorrections: false,
                        status: 'unknown',
                    }),
                    {
                        status: 404,
                        headers: {
                            'Content-Type': 'application/json',
                            ...CORS_HEADERS,
                        },
                    },
                );
            }

            // Cache for 24 hours
            await cacheSet(cacheKey, result, 86400).catch((err) =>
                console.warn('[doi-check] Redis cache error:', err),
            );

            return new Response(JSON.stringify(result), {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cache': 'MISS',
                    ...CORS_HEADERS,
                },
            });
        }

        if (req.method === 'POST') {
            const body = (await req.json().catch(() => ({}))) as {
                doi?: string;
                dois?: string[];
            };

            // Single DOI POST
            if (body.doi) {
                const cleanDoi = normalizeDoi(body.doi);
                if (!cleanDoi) {
                    return new Response(JSON.stringify({ error: 'Invalid DOI format' }), {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            ...CORS_HEADERS,
                        },
                    });
                }

                const cacheKey = `crossref:doi:${cleanDoi.toLowerCase()}`;
                const cached = await cacheGet<CrossrefDoiResult>(cacheKey);
                if (cached) {
                    return new Response(JSON.stringify(cached), {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Cache': 'HIT',
                            ...CORS_HEADERS,
                        },
                    });
                }

                const result = await resolveCrossrefDoi(cleanDoi);
                if (!result) {
                    return new Response(
                        JSON.stringify({
                            error: 'DOI not found in Crossref',
                            doi: cleanDoi,
                            isRetracted: false,
                            hasCorrections: false,
                            status: 'unknown',
                        }),
                        {
                            status: 404,
                            headers: {
                                'Content-Type': 'application/json',
                                ...CORS_HEADERS,
                            },
                        },
                    );
                }

                await cacheSet(cacheKey, result, 86400).catch((err) =>
                    console.warn('[doi-check] Redis cache error:', err),
                );

                return new Response(JSON.stringify(result), {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Cache': 'MISS',
                        ...CORS_HEADERS,
                    },
                });
            }

            // Batch DOIs POST
            if (Array.isArray(body.dois)) {
                const cleanDois = body.dois
                    .map((d) => normalizeDoi(d))
                    .filter(Boolean)
                    .slice(0, 50);

                if (cleanDois.length === 0) {
                    return new Response(
                        JSON.stringify({ error: 'No valid DOIs provided in batch' }),
                        {
                            status: 400,
                            headers: {
                                'Content-Type': 'application/json',
                                ...CORS_HEADERS,
                            },
                        },
                    );
                }

                const results: Record<string, CrossrefDoiResult | null> = {};

                await Promise.all(
                    cleanDois.map(async (doi) => {
                        const cacheKey = `crossref:doi:${doi.toLowerCase()}`;
                        try {
                            const cached = await cacheGet<CrossrefDoiResult>(cacheKey);
                            if (cached) {
                                results[doi] = cached;
                                return;
                            }
                            const resolved = await resolveCrossrefDoi(doi);
                            results[doi] = resolved;
                            if (resolved) {
                                await cacheSet(cacheKey, resolved, 86400).catch(() => {});
                            }
                        } catch {
                            results[doi] = null;
                        }
                    }),
                );

                return new Response(JSON.stringify({ results }), {
                    headers: {
                        'Content-Type': 'application/json',
                        ...CORS_HEADERS,
                    },
                });
            }

            return new Response(
                JSON.stringify({ error: 'Either doi or dois field is required in request body' }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        ...CORS_HEADERS,
                    },
                },
            );
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                ...CORS_HEADERS,
            },
        });
    } catch (err: any) {
        console.error('[doi-check] Handler error:', err);
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                message: err.message || 'Unknown error',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...CORS_HEADERS,
                },
            },
        );
    }
};
