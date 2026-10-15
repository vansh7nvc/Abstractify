import { describe, expect, it, vi } from 'vitest';
import { orchestrate } from '../orchestrator.js';
import { AgentName } from '../types.js';

describe('multi-agent orchestrator', () => {
    it('runs independent specialists in staged parallel phases', async () => {
        const active = new Set<AgentName>();
        let peakConcurrency = 0;
        const invokeAgent = vi.fn(async (agent) => {
            active.add(agent.name);
            peakConcurrency = Math.max(peakConcurrency, active.size);
            await Promise.resolve();
            active.delete(agent.name);
            return `${agent.name} report`;
        });

        const result = await orchestrate(
            { query: 'Do intervention effects generalize?', mode: 'parallel' },
            'test-key',
            {
                invokeAgent,
                invokeSupervisor: async () => 'executive synthesis',
            },
        );

        expect(peakConcurrency).toBe(2);
        expect(invokeAgent).toHaveBeenCalledTimes(5);
        expect(result.results.map((item) => item.agent)).toEqual([
            'memory',
            'search',
            'analysis',
            'methodology',
            'writing',
        ]);
        expect(result.events.filter((event) => event.type === 'agent:start')).toHaveLength(5);
        expect(result.events.filter((event) => event.type === 'agent:done')).toHaveLength(5);
        expect(result.finalAnswer).toBe('executive synthesis');
    });

    it('passes earlier reports to later agents in sequential mode', async () => {
        const seenPriorResults: Array<Partial<Record<AgentName, string>>> = [];

        await orchestrate(
            { query: 'Compare the evidence', mode: 'sequential', agents: ['search', 'writing'] },
            'test-key',
            {
                invokeAgent: async (agent, input) => {
                    seenPriorResults.push(input.priorResults);
                    return `${agent.name} output`;
                },
                invokeSupervisor: async (prompt) => prompt,
            },
        );

        expect(seenPriorResults[0]).toEqual({});
        expect(seenPriorResults[1]).toEqual({ search: 'search output' });
    });

    it('emits an error event when a delegated agent fails', async () => {
        const observed: string[] = [];

        await expect(
            orchestrate({ query: 'test', agents: ['search'] }, 'test-key', {
                invokeAgent: async () => {
                    throw new Error('search unavailable');
                },
                invokeSupervisor: async () => 'unused',
                onEvent: (event) => observed.push(event.type),
            }),
        ).rejects.toThrow('search unavailable');

        expect(observed).toEqual(['agent:start', 'agent:error']);
    });
});
