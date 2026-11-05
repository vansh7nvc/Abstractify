/**
 * AbstractiFy Dynamic Theme & Dark Mode System
 * Handles theme toggling, system preference detection, and localStorage persistence.
 */

export const THEME_KEY = 'theme';

export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
};

/**
 * Safely retrieves stored theme from localStorage.
 * Returns 'light', 'dark', or null if not set or invalid.
 * @returns {string|null}
 */
export function getStoredTheme() {
    if (typeof localStorage === 'undefined') return null;
    try {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored === THEMES.LIGHT || stored === THEMES.DARK) {
            return stored;
        }
        return null;
    } catch (_err) {
        return null;
    }
}

/**
 * Safely persists theme to localStorage.
 * @param {string} theme
 * @returns {boolean} Whether save succeeded
 */
export function setStoredTheme(theme) {
    if (typeof localStorage === 'undefined') return false;
    try {
        localStorage.setItem(THEME_KEY, theme);
        return true;
    } catch (_err) {
        return false;
    }
}

/**
 * Detects system color scheme preference.
 * @returns {string} 'dark' if prefers-color-scheme: dark matches, else 'light'
 */
export function getSystemTheme() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        try {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            return mq && mq.matches ? THEMES.DARK : THEMES.LIGHT;
        } catch (_err) {
            return THEMES.LIGHT;
        }
    }
    return THEMES.LIGHT;
}

/**
 * Resolves current theme according to hierarchy:
 * 1. Root data-theme attribute if valid
 * 2. User saved preference in localStorage
 * 3. System prefers-color-scheme
 * @returns {string} 'dark' | 'light'
 */
export function getCurrentTheme() {
    if (typeof document !== 'undefined' && document.documentElement) {
        const attr = document.documentElement.getAttribute('data-theme');
        if (attr === THEMES.LIGHT || attr === THEMES.DARK) {
            return attr;
        }
    }
    const stored = getStoredTheme();
    if (stored) {
        return stored;
    }
    return getSystemTheme();
}

/**
 * Updates UI attributes and icons on all theme toggle buttons.
 * @param {string} theme 'dark' | 'light'
 */
export function updateThemeToggleUI(theme) {
    if (typeof document === 'undefined') return;
    const isDark = theme === THEMES.DARK;
    const toggles = document.querySelectorAll('#theme-toggle, .theme-toggle-btn');
    
    toggles.forEach(toggle => {
        toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        toggle.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        toggle.setAttribute('data-theme', theme);

        const iconSpan = toggle.querySelector('.theme-toggle-icon, #theme-toggle-icon') || toggle;
        if (iconSpan) {
            iconSpan.textContent = isDark ? '☀️' : '🌙';
        }
    });
}

/**
 * Sets active theme on the document root, updates storage (optional), dispatches change event.
 * @param {string} theme 'dark' | 'light'
 * @param {boolean} [persist=true] Whether to save to localStorage
 * @returns {string} The normalized theme applied
 */
export function setTheme(theme, persist = true) {
    const normalized = theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;

    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute('data-theme', normalized);
        document.documentElement.classList.remove(THEMES.LIGHT, THEMES.DARK);
        document.documentElement.classList.add(normalized);
    }

    if (persist) {
        setStoredTheme(normalized);
    }
    updateThemeToggleUI(normalized);

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
            const event = (typeof CustomEvent === 'function')
                ? new CustomEvent('themechange', { detail: { theme: normalized } })
                : document.createEvent ? document.createEvent('CustomEvent') : null;
            if (event && event.initCustomEvent) {
                event.initCustomEvent('themechange', true, true, { theme: normalized });
            }
            if (event) {
                window.dispatchEvent(event);
            }
        } catch (_err) {}
    }

    return normalized;
}

/**
 * Toggles theme between light and dark modes. Always persists the new selection.
 * @returns {string} The newly applied theme
 */
export function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    return setTheme(next, true);
}

let mediaQueryCleanup = null;

/**
 * Resets any active media query listener (useful for tests and dynamic reloads).
 */
export function resetThemeState() {
    if (typeof mediaQueryCleanup === 'function') {
        mediaQueryCleanup();
        mediaQueryCleanup = null;
    }
}

/**
 * Initializes theme on page load.
 * Respects stored preference, falls back to system preference.
 * Sets up system media query listener and button click handlers.
 * @returns {string} The theme initialized
 */
export function initTheme() {
    const stored = getStoredTheme();
    const hasStoredPreference = Boolean(stored);
    const initialTheme = stored || getSystemTheme();
    
    // Only persist if the user already had an explicit stored preference
    setTheme(initialTheme, hasStoredPreference);

    // Clean up previous media query listener if any
    resetThemeState();

    // Watch for system preference changes (only active if no stored override)
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        try {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            if (mq) {
                const handler = (e) => {
                    const userOverride = getStoredTheme();
                    if (!userOverride) {
                        setTheme(e.matches ? THEMES.DARK : THEMES.LIGHT, false);
                    }
                };
                if (typeof mq.addEventListener === 'function') {
                    mq.addEventListener('change', handler);
                    mediaQueryCleanup = () => {
                        if (typeof mq.removeEventListener === 'function') {
                            mq.removeEventListener('change', handler);
                        }
                    };
                } else if (typeof mq.addListener === 'function') {
                    mq.addListener(handler);
                    mediaQueryCleanup = () => {
                        if (typeof mq.removeListener === 'function') {
                            mq.removeListener(handler);
                        }
                    };
                }
            }
        } catch (_err) {}
    }

    // Attach click listeners to toggle buttons
    if (typeof document !== 'undefined') {
        const toggleButtons = document.querySelectorAll('#theme-toggle, .theme-toggle-btn');
        toggleButtons.forEach(btn => {
            btn.removeEventListener('click', toggleTheme);
            btn.addEventListener('click', toggleTheme);
        });
    }

    return initialTheme;
}

// Global attachment for browser scripts
if (typeof window !== 'undefined') {
    window.AbstractifyTheme = {
        THEME_KEY,
        THEMES,
        getStoredTheme,
        setStoredTheme,
        getSystemTheme,
        getCurrentTheme,
        updateThemeToggleUI,
        setTheme,
        toggleTheme,
        initTheme
    };
}
