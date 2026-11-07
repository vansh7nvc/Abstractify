import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    SESSIONS_STORAGE_KEY,
    MAX_SESSIONS,
    parseTags,
    formatSessionDate,
    getSavedSessions,
    saveSession,
    deleteSession,
    clearAllSessions
} from '../js/sessions.js';

describe('public/js/sessions.js (Issue #18)', () => {
    let mockStorage;
    let store;

    beforeEach(() => {
        store = {};
        mockStorage = {
            getItem: vi.fn(key => store[key] !== undefined ? store[key] : null),
            setItem: vi.fn((key, value) => { store[key] = String(value); }),
            removeItem: vi.fn(key => { delete store[key]; }),
            clear: vi.fn(() => { store = {}; })
        };
    });

    describe('parseTags', () => {
        it('parses comma-separated tag strings', () => {
            const tags = parseTags('Quantum, Biology, Machine Learning');
            expect(tags).toEqual(['Quantum', 'Biology', 'Machine Learning']);
        });

        it('cleans up extra whitespace and empty tags', () => {
            const tags = parseTags('  AI ,  , NLP ,  ');
            expect(tags).toEqual(['AI', 'NLP']);
        });

        it('handles array input cleanly', () => {
            const tags = parseTags([' Medicine ', ' Oncology ']);
            expect(tags).toEqual(['Medicine', 'Oncology']);
        });

        it('returns empty array on non-string falsy inputs', () => {
            expect(parseTags('')).toEqual([]);
            expect(parseTags(null)).toEqual([]);
            expect(parseTags(undefined)).toEqual([]);
        });
    });

    describe('formatSessionDate', () => {
        it('formats valid ISO date into readable string', () => {
            const formatted = formatSessionDate('2026-08-08T17:00:00Z');
            expect(formatted).not.toBe('Unknown Date');
            expect(formatted).toContain('2026');
        });

        it('returns "Unknown Date" for invalid or missing dates', () => {
            expect(formatSessionDate(null)).toBe('Unknown Date');
            expect(formatSessionDate('invalid-date')).toBe('Unknown Date');
        });
    });

    describe('getSavedSessions', () => {
        it('returns empty array when storage is empty', () => {
            const sessions = getSavedSessions(mockStorage);
            expect(sessions).toEqual([]);
            expect(mockStorage.getItem).toHaveBeenCalledWith(SESSIONS_STORAGE_KEY);
        });

        it('returns parsed sessions array', () => {
            const testData = [{ id: 's1', title: 'Test 1' }, { id: 's2', title: 'Test 2' }];
            store[SESSIONS_STORAGE_KEY] = JSON.stringify(testData);

            const sessions = getSavedSessions(mockStorage);
            expect(sessions).toHaveLength(2);
            expect(sessions[0].title).toBe('Test 1');
        });

        it('returns empty array when JSON is malformed', () => {
            store[SESSIONS_STORAGE_KEY] = 'not-valid-json{{{';
            const sessions = getSavedSessions(mockStorage);
            expect(sessions).toEqual([]);
        });
    });

    describe('saveSession', () => {
        it('saves a valid session to empty storage', () => {
            const sessionData = {
                title: 'Quantum ML',
                query: 'Quantum ML',
                tags: 'Quantum, AI',
                searchResults: [{ id: 'p1', title: 'Paper 1' }],
                consensusData: { consensusScore: 85 }
            };

            const res = saveSession(sessionData, mockStorage);
            expect(res.success).toBe(true);
            expect(res.session.title).toBe('Quantum ML');
            expect(res.session.paperCount).toBe(1);
            expect(res.session.consensusScore).toBe(85);
            expect(res.session.tags).toEqual(['Quantum', 'AI']);
            expect(res.sessions).toHaveLength(1);

            const stored = JSON.parse(store[SESSIONS_STORAGE_KEY]);
            expect(stored).toHaveLength(1);
            expect(stored[0].title).toBe('Quantum ML');
        });

        it('prepends new session to existing sessions', () => {
            saveSession({ title: 'First Session', query: 'First' }, mockStorage);
            saveSession({ title: 'Second Session', query: 'Second' }, mockStorage);

            const sessions = getSavedSessions(mockStorage);
            expect(sessions).toHaveLength(2);
            expect(sessions[0].title).toBe('Second Session');
            expect(sessions[1].title).toBe('First Session');
        });

        it('enforces MAX_SESSIONS capacity of 10 items', () => {
            for (let i = 1; i <= 15; i++) {
                saveSession({ title: `Session ${i}`, query: `Query ${i}` }, mockStorage);
            }

            const sessions = getSavedSessions(mockStorage);
            expect(sessions).toHaveLength(MAX_SESSIONS);
            expect(sessions[0].title).toBe('Session 15');
            expect(sessions[MAX_SESSIONS - 1].title).toBe('Session 6');
        });

        it('evicts oldest sessions when encountering QuotaExceededError', () => {
            // Seed 3 sessions
            saveSession({ title: 'S1' }, mockStorage);
            saveSession({ title: 'S2' }, mockStorage);
            saveSession({ title: 'S3' }, mockStorage);

            // Mock setItem throwing QuotaExceededError once, then succeeding
            let callCount = 0;
            mockStorage.setItem = vi.fn((key, val) => {
                callCount++;
                if (callCount === 1) {
                    const err = new Error('Quota exceeded');
                    err.name = 'QuotaExceededError';
                    throw err;
                }
                store[key] = String(val);
            });

            const res = saveSession({ title: 'S4' }, mockStorage);
            expect(res.success).toBe(true);
            expect(callCount).toBe(2);
        });

        it('returns failure when storage is invalid or QuotaExceeded persists', () => {
            mockStorage.setItem = vi.fn(() => {
                const err = new Error('Storage full');
                err.name = 'QuotaExceededError';
                throw err;
            });

            const res = saveSession({ title: 'Huge Session' }, mockStorage);
            expect(res.success).toBe(false);
            expect(res.error).toContain('quota exceeded');
        });
    });

    describe('deleteSession', () => {
        it('removes the specified session by id', () => {
            saveSession({ id: 'sess_1', title: 'Session 1' }, mockStorage);
            saveSession({ id: 'sess_2', title: 'Session 2' }, mockStorage);

            const remaining = deleteSession('sess_1', mockStorage);
            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).toBe('sess_2');

            const reloaded = getSavedSessions(mockStorage);
            expect(reloaded).toHaveLength(1);
            expect(reloaded[0].id).toBe('sess_2');
        });
    });

    describe('clearAllSessions', () => {
        it('removes all sessions from storage', () => {
            saveSession({ title: 'Session 1' }, mockStorage);
            saveSession({ title: 'Session 2' }, mockStorage);

            const cleared = clearAllSessions(mockStorage);
            expect(cleared).toBe(true);
            expect(getSavedSessions(mockStorage)).toEqual([]);
            expect(mockStorage.removeItem).toHaveBeenCalledWith(SESSIONS_STORAGE_KEY);
        });
    });
});
