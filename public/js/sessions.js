/**
 * AbstractiFy Saved Research Sessions (Issue #18)
 * Manages saving, listing, restoring, and deleting research sessions in localStorage
 * with quota protection, max capacity capping (10 sessions), and tagging.
 */

export const SESSIONS_STORAGE_KEY = 'abstractify_saved_sessions';
export const MAX_SESSIONS = 10;

/**
 * Parses user input tags into a clean array of strings.
 * @param {string|string[]} input Comma or whitespace separated tags
 * @returns {string[]}
 */
export function parseTags(input) {
    if (Array.isArray(input)) {
        return input
            .map(t => String(t || '').trim())
            .filter(t => t.length > 0);
    }
    if (typeof input !== 'string') return [];
    return input
        .split(/[,\n]/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
}

/**
 * Formats an ISO date string into a user-friendly academic timestamp.
 * @param {string|number|Date} dateVal
 * @returns {string}
 */
export function formatSessionDate(dateVal) {
    if (!dateVal) return 'Unknown Date';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Unknown Date';

    return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Retrieves all saved research sessions from localStorage.
 * @param {Storage} [storage=window.localStorage]
 * @returns {Array<Object>}
 */
export function getSavedSessions(storage) {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!s) return [];

    try {
        const raw = s.getItem(SESSIONS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (err) {
        console.error('Failed to parse saved sessions from localStorage:', err);
        return [];
    }
}

/**
 * Saves a new research session into localStorage.
 * Automatically caps total saved sessions at MAX_SESSIONS (10) and handles QuotaExceededError.
 * @param {Object} sessionData
 * @param {Storage} [storage=window.localStorage]
 * @returns {{ success: boolean, session?: Object, sessions?: Object[], error?: string }}
 */
export function saveSession(sessionData, storage) {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!s) return { success: false, error: 'localStorage is not available.' };
    if (!sessionData || typeof sessionData !== 'object') {
        return { success: false, error: 'Invalid session data provided.' };
    }

    const title = String(sessionData.title || sessionData.query || 'Untitled Session').trim();
    const query = String(sessionData.query || sessionData.title || '').trim();
    const tags = parseTags(sessionData.tags);
    const searchResults = Array.isArray(sessionData.searchResults) ? sessionData.searchResults : [];
    const matrixData = Array.isArray(sessionData.matrixData) ? sessionData.matrixData : [];
    const consensusData = sessionData.consensusData && typeof sessionData.consensusData === 'object'
        ? sessionData.consensusData
        : null;

    const paperCount = typeof sessionData.paperCount === 'number'
        ? sessionData.paperCount
        : searchResults.length;

    const consensusScore = typeof sessionData.consensusScore === 'number'
        ? sessionData.consensusScore
        : (consensusData && typeof consensusData.consensusScore === 'number' ? consensusData.consensusScore : null);

    const newSession = {
        id: sessionData.id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: title || 'Untitled Research Session',
        query,
        date: sessionData.date || new Date().toISOString(),
        tags,
        paperCount,
        consensusScore,
        searchResults,
        consensusData,
        matrixData
    };

    let existingSessions = getSavedSessions(s);
    // Remove if duplicate ID exists, then prepend new session
    existingSessions = [newSession, ...existingSessions.filter(item => item.id !== newSession.id)];

    // Cap at MAX_SESSIONS
    if (existingSessions.length > MAX_SESSIONS) {
        existingSessions = existingSessions.slice(0, MAX_SESSIONS);
    }

    // Attempt to write with QuotaExceededError resilience
    while (existingSessions.length > 0) {
        try {
            s.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(existingSessions));
            return {
                success: true,
                session: newSession,
                sessions: existingSessions
            };
        } catch (err) {
            const isQuotaError = err && (
                err.name === 'QuotaExceededError' ||
                err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                err.code === 22 ||
                err.code === 1014
            );

            if (isQuotaError && existingSessions.length > 1) {
                console.warn('localStorage quota exceeded. Evicting oldest session to make space.');
                existingSessions.pop();
            } else {
                console.error('Failed to write session to localStorage:', err);
                return {
                    success: false,
                    error: isQuotaError ? 'Storage quota exceeded. Please delete some saved sessions.' : (err.message || 'Write failed.')
                };
            }
        }
    }

    return { success: false, error: 'Storage quota exceeded.' };
}

/**
 * Deletes a session by ID from localStorage.
 * @param {string} sessionId
 * @param {Storage} [storage=window.localStorage]
 * @returns {Array<Object>} Updated list of saved sessions
 */
export function deleteSession(sessionId, storage) {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!s) return [];

    const existing = getSavedSessions(s);
    const updated = existing.filter(item => item.id !== sessionId);

    try {
        s.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
        console.error('Failed to update sessions in localStorage:', err);
    }

    return updated;
}

/**
 * Clears all saved research sessions from localStorage.
 * @param {Storage} [storage=window.localStorage]
 * @returns {boolean}
 */
export function clearAllSessions(storage) {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!s) return false;

    try {
        s.removeItem(SESSIONS_STORAGE_KEY);
        return true;
    } catch (err) {
        console.error('Failed to clear sessions from localStorage:', err);
        return false;
    }
}
