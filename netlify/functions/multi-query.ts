import { Context } from '@netlify/functions';
import { getApiKey, checkPasscode } from './_utils.js';
import { orchestrate } from './agent/orchestrator.js';
import {
    AGENT_NAMES,
    AgentLifecycleEvent,
    AgentName,
    OrchestrationRequest,
} from './agent/types.js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-gemini-key',
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

function validateRequest(body: Partial<OrchestrationRequest>): string | null {
    if (typeof body.query !== 'string' || body.query.trim().length === 0) {
        return 'A non-empty query is required.';
    }
    if (body.query.length > 8_000) return 'Query must be 8,000 characters or fewer.';
    if (body.context !== undefined) {
        if (typeof body.context !== 'string') return 'Context must be a string.';
        if (body.context.length > 20_000) return 'Context must be 20,000 characters or fewer.';
    }
    if (body.sessionId !== undefined && typeof body.sessionId !== 'string') {
        return 'Session id must be a string.';
    }
    if (body.mode && body.mode !== 'parallel' && body.mode !== 'sequential') {
        return 'Mode must be either parallel or sequential.';
    }
    if (body.agents !== undefined) {
        if (!Array.isArray(body.agents)) return 'Agents must be an array.';
        const allowed = new Set<string>(AGENT_NAMES);
        if (
            body.agents.length === 0 ||
            new Set(body.agents).size !== body.agents.length ||
            body.agents.some((agent) => !allowed.has(agent))
        ) {
            return `Agents must be a unique, non-empty subset of: ${AGENT_NAMES.join(', ')}.`;
        }
    }
    return null;
}

function sseResponse(request: OrchestrationRequest, apiKey: string): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const send = (event: string, payload: unknown) => {
                controller.enqueue(
                    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
                );
            };
            const onEvent = (event: AgentLifecycleEvent) => send(event.type, event);

            void orchestrate(request, apiKey, { onEvent })
                .then((result) => {
                    send('orchestration:done', result);
                    controller.close();
                })
                .catch((error) => {
                    send('orchestration:error', {
                        message: error instanceof Error ? error.message : 'Orchestration failed',
                    });
                    controller.close();
                });
        },
    });

    return new Response(stream, {
        headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}

export default async (req: Request, _context: Context) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return jsonResponse({ message: 'Method not allowed.' }, 405);

    const unauthorized = checkPasscode(req.headers);
    if (unauthorized) return unauthorized;

    try {
        const body = (await req.json()) as Partial<OrchestrationRequest> & { stream?: boolean };
        const validationError = validateRequest(body);
        if (validationError) return jsonResponse({ message: validationError }, 400);

        const apiKey = getApiKey(req.headers, 'gemini');
        if (!apiKey) return jsonResponse({ message: 'Gemini API key is required.' }, 400);

        const request: OrchestrationRequest = {
            query: body.query!.trim(),
            context: body.context,
            sessionId: body.sessionId,
            mode: body.mode,
            agents: body.agents as AgentName[] | undefined,
        };

        if (body.stream || req.headers.get('accept')?.includes('text/event-stream')) {
            return sseResponse(request, apiKey);
        }

        return jsonResponse(await orchestrate(request, apiKey));
    } catch (error) {
        console.error('[Multi-agent API] Error:', error);
        return jsonResponse(
            { message: error instanceof Error ? error.message : 'Orchestration failed.' },
            500,
        );
    }
};

export const config = {
    path: '/api/agent/multi-query',
};
