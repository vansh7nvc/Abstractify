import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callGeminiEmbedding } from '../../_utils.js';
import { getSession } from '../../shared/redis.js';
import { getVectorIndex, queryNearest } from '../../shared/vector.js';
import { memoryAgent } from '../sub-agents/memory-agent.js';
import { AgentRunInput } from '../types.js';

vi.mock('../../_utils.js', () => ({ callGeminiEmbedding: vi.fn() }));
vi.mock('../../shared/redis.js', () => ({ getSession: vi.fn() }));
vi.mock('../../shared/vector.js', () => ({ getVectorIndex: vi.fn(), queryNearest: vi.fn() }));

describe('memory agent context', () => {
    const input: AgentRunInput = {
        query: 'Compare recent evidence',
        sessionId: 'session-1',
        priorResults: {},
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getSession).mockResolvedValue(null);
        vi.mocked(getVectorIndex).mockReturnValue(null);
    });

    it('keeps a session usable when old records have no papers array', async () => {
        vi.mocked(getSession).mockResolvedValue({
            id: 'session-1',
            query: 'Previous question',
            notes: 'Important note',
            createdAt: '',
            updatedAt: '',
        } as Awaited<ReturnType<typeof getSession>>);

        const result = await memoryAgent.loadContext!(input, 'test-key');

        expect(JSON.parse(result)).toEqual({
            session: {
                query: 'Previous question',
                notes: 'Important note',
                recentPaperTitles: [],
            },
        });
    });

    it('keeps vector recall when session loading fails', async () => {
        vi.mocked(getSession).mockRejectedValue(new Error('Redis unavailable'));
        vi.mocked(getVectorIndex).mockReturnValue({} as ReturnType<typeof getVectorIndex>);
        vi.mocked(callGeminiEmbedding).mockResolvedValue([0.1, 0.2]);
        vi.mocked(queryNearest).mockResolvedValue([
            { id: 'trace-1', score: 0.9, data: 'Prior reasoning' },
        ]);

        const result = await memoryAgent.loadContext!(input, 'test-key');

        expect(JSON.parse(result)).toEqual({
            reasoningTraces: [{ id: 'trace-1', score: 0.9, data: 'Prior reasoning' }],
        });
    });

    it('keeps session memory when vector recall fails', async () => {
        vi.mocked(getSession).mockResolvedValue({
            id: 'session-1',
            query: 'Previous question',
            papers: [],
            createdAt: '',
            updatedAt: '',
        });
        vi.mocked(getVectorIndex).mockReturnValue({} as ReturnType<typeof getVectorIndex>);
        vi.mocked(callGeminiEmbedding).mockRejectedValue(new Error('Embedding unavailable'));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        const result = await memoryAgent.loadContext!(input, 'test-key');

        expect(JSON.parse(result)).toEqual({
            session: { query: 'Previous question', notes: undefined, recentPaperTitles: [] },
        });
        expect(warn).toHaveBeenCalledWith(
            '[Memory Agent] Vector recall failed; continuing without it:',
            expect.any(Error),
        );
        warn.mockRestore();
    });
});
