import { Context } from '@netlify/functions';
import { saveSession, getSession, deleteSession, ResearchSession } from './shared/redis.js';

export default async (req: Request, context: Context) => {
    // Enable CORS for frontend requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    const url = new URL(req.url);

    try {
        // GET /api/sessions?id={sessionId}
        if (req.method === 'GET') {
            const id = url.searchParams.get('id');
            if (!id) {
                return new Response(
                    JSON.stringify({ error: 'Missing session id query parameter' }),
                    {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    },
                );
            }

            const session = await getSession(id);
            if (!session) {
                return new Response(JSON.stringify({ error: 'Session not found' }), {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }

            return new Response(JSON.stringify({ session }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        // POST /api/sessions
        if (req.method === 'POST') {
            const body = (await req.json()) as Partial<ResearchSession>;
            if (!body.id || !body.query) {
                return new Response(
                    JSON.stringify({ error: 'Session id and query are required' }),
                    {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    },
                );
            }

            const sessionData: ResearchSession = {
                id: body.id,
                query: body.query,
                papers: body.papers || [],
                consensus: body.consensus || null,
                matrix: body.matrix || [],
                notes: body.notes || '',
                createdAt: body.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const saved = await saveSession(sessionData);
            if (!saved) {
                return new Response(
                    JSON.stringify({
                        warning:
                            'Redis not configured or write failed, session not persisted server-side',
                        session: sessionData,
                    }),
                    {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    },
                );
            }

            return new Response(JSON.stringify({ success: true, session: sessionData }), {
                status: 201,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        // DELETE /api/sessions?id={sessionId}
        if (req.method === 'DELETE') {
            const id = url.searchParams.get('id');
            if (!id) {
                return new Response(
                    JSON.stringify({ error: 'Missing session id query parameter' }),
                    {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                    },
                );
            }

            await deleteSession(id);
            return new Response(JSON.stringify({ success: true, deletedId: id }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        return new Response(JSON.stringify({ error: `Method ${req.method} not allowed` }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    } catch (error: any) {
        console.error('[Sessions API] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
};

export const config = {
    path: '/api/sessions',
};
