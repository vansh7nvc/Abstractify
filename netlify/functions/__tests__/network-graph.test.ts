import { describe, it, expect, vi, beforeEach } from 'vitest';
import networkGraphHandler from '../network-graph.js';

describe('network-graph.ts comprehensive test suite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 400 when papers is missing or empty', async () => {
        const req = new Request('http://localhost/api/network-graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'test', papers: [] }),
        });
        const res = await networkGraphHandler(req, {} as any);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.nodes).toEqual([]);
        expect(data.edges).toEqual([]);
    });

    it('synthesizes realistic citation lineage DAG when external API returns no edges', async () => {
        // Mock fetch returning 404 or empty references for all external lookups
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
        });
        vi.stubGlobal('fetch', fetchMock);

        const papers = [
            {
                id: 'paper-root',
                title: 'Deep Reinforcement Learning from Human Preferences',
                authors: [{ name: 'Paul Christiano' }],
                year: 2017,
                citations: 1800,
                doi: '10.48550/arXiv.1706.03741',
                abstract:
                    'We explore training neural networks using human feedback and preferences.',
            },
            {
                id: 'paper-ppo',
                title: 'Proximal Policy Optimization Algorithms',
                authors: [{ name: 'John Schulman' }],
                year: 2017,
                citations: 15000,
                abstract: 'Policy gradient methods using clipped surrogate objective.',
            },
            {
                id: 'paper-instruct',
                title: 'Training language models to follow instructions with human feedback',
                authors: [{ name: 'Long Ouyang' }],
                year: 2022,
                citations: 4500,
                abstract: 'InstructGPT applies RLHF to fine-tune GPT-3.',
            },
            {
                id: 'paper-rlaif',
                title: 'RLAIF: Scaling Reinforcement Learning from Human Feedback with AI',
                authors: [{ name: 'Harrison Lee' }],
                year: 2023,
                citations: 210,
                abstract: 'RLAIF uses AI feedback instead of human annotations.',
            },
        ];

        const req = new Request('http://localhost/api/network-graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'RLHF Alignment', papers }),
        });

        const res = await networkGraphHandler(req, {} as any);
        expect(res.status).toBe(200);
        const data = await res.json();

        expect(data.nodes.length).toBe(4);
        expect(data.edges.length).toBeGreaterThanOrEqual(3);

        // Verify node classifications
        const ppoNode = data.nodes.find((n: any) => n.id === 'paper-ppo');
        expect(ppoNode).toBeDefined();
        expect(ppoNode.nodeType).toBe('landmark');

        const rlaifNode = data.nodes.find((n: any) => n.id === 'paper-rlaif');
        expect(rlaifNode).toBeDefined();
        expect(rlaifNode.nodeType).toBe('recent');

        const focusNode = data.nodes.find((n: any) => n.id === 'paper-root');
        expect(focusNode).toBeDefined();
        expect(focusNode.nodeType).toBe('focus');

        // Check that degrees are computed
        data.nodes.forEach((n: any) => {
            expect(typeof n.inDegree).toBe('number');
            expect(typeof n.outDegree).toBe('number');
            expect(n.inDegree + n.outDegree).toBeGreaterThan(0);
        });
    });
});
