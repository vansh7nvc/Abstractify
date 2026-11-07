import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    THEME_KEY,
    THEMES,
    getStoredTheme,
    setStoredTheme,
    getSystemTheme,
    getCurrentTheme,
    updateThemeToggleUI,
    setTheme,
    toggleTheme,
    initTheme,
    resetThemeState
} from '../js/theme.js';

describe('public/js/theme.js - Dynamic Theme System', () => {
    let originalMatchMedia;
    let matchMediaListeners = [];

    beforeEach(() => {
        // Reset DOM state
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('light', 'dark');
        document.body.innerHTML = `
            <button id="theme-toggle" class="theme-toggle-btn" aria-label="Toggle theme">
                <span id="theme-toggle-icon" class="theme-toggle-icon">🌙</span>
            </button>
            <button id="landing-theme-toggle" class="theme-toggle-btn" aria-label="Toggle theme">
                <span class="theme-toggle-icon">🌙</span>
            </button>
        `;

        // Clear localStorage
        localStorage.clear();

        // Setup mock matchMedia
        originalMatchMedia = window.matchMedia;
        matchMediaListeners = [];
        window.matchMedia = vi.fn().mockImplementation((query) => {
            return {
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn((fn) => matchMediaListeners.push(fn)),
                removeListener: vi.fn(),
                addEventListener: vi.fn((event, fn) => {
                    if (event === 'change') matchMediaListeners.push(fn);
                }),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn()
            };
        });
    });

    afterEach(() => {
        resetThemeState();
        vi.restoreAllMocks();
        window.matchMedia = originalMatchMedia;
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('light', 'dark');
    });

    describe('Constants', () => {
        it('exports correct theme key and theme constants', () => {
            expect(THEME_KEY).toBe('theme');
            expect(THEMES.LIGHT).toBe('light');
            expect(THEMES.DARK).toBe('dark');
        });
    });

    describe('getStoredTheme & setStoredTheme', () => {
        it('returns null when no theme is stored', () => {
            expect(getStoredTheme()).toBeNull();
        });

        it('returns stored theme when set to light or dark', () => {
            localStorage.setItem(THEME_KEY, 'dark');
            expect(getStoredTheme()).toBe('dark');

            localStorage.setItem(THEME_KEY, 'light');
            expect(getStoredTheme()).toBe('light');
        });

        it('ignores invalid or corrupted stored values', () => {
            localStorage.setItem(THEME_KEY, 'blue');
            expect(getStoredTheme()).toBeNull();

            localStorage.setItem(THEME_KEY, '{"theme":"dark"}');
            expect(getStoredTheme()).toBeNull();

            localStorage.setItem(THEME_KEY, '');
            expect(getStoredTheme()).toBeNull();
        });

        it('handles localStorage exceptions gracefully in getStoredTheme', () => {
            vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
                throw new Error('Access denied');
            });
            expect(getStoredTheme()).toBeNull();
        });

        it('persists theme via setStoredTheme', () => {
            const success = setStoredTheme('dark');
            expect(success).toBe(true);
            expect(localStorage.getItem(THEME_KEY)).toBe('dark');
        });

        it('handles localStorage exceptions gracefully in setStoredTheme', () => {
            vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
                throw new Error('QuotaExceededError');
            });
            const success = setStoredTheme('dark');
            expect(success).toBe(false);
        });
    });

    describe('getSystemTheme', () => {
        it('returns "dark" when prefers-color-scheme matches dark', () => {
            window.matchMedia = vi.fn().mockReturnValue({ matches: true });
            expect(getSystemTheme()).toBe('dark');
        });

        it('returns "light" when prefers-color-scheme matches false', () => {
            window.matchMedia = vi.fn().mockReturnValue({ matches: false });
            expect(getSystemTheme()).toBe('light');
        });

        it('returns "light" if matchMedia is undefined', () => {
            delete window.matchMedia;
            expect(getSystemTheme()).toBe('light');
        });

        it('returns "light" if matchMedia throws an exception', () => {
            window.matchMedia = vi.fn().mockImplementation(() => {
                throw new Error('matchMedia not supported');
            });
            expect(getSystemTheme()).toBe('light');
        });
    });

    describe('getCurrentTheme', () => {
        it('prioritizes document data-theme attribute if valid', () => {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem(THEME_KEY, 'light');
            expect(getCurrentTheme()).toBe('dark');

            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem(THEME_KEY, 'dark');
            expect(getCurrentTheme()).toBe('light');
        });

        it('falls back to stored theme if data-theme attribute is not set', () => {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem(THEME_KEY, 'dark');
            expect(getCurrentTheme()).toBe('dark');
        });

        it('falls back to system theme if neither attribute nor storage is present', () => {
            document.documentElement.removeAttribute('data-theme');
            localStorage.removeItem(THEME_KEY);
            window.matchMedia = vi.fn().mockReturnValue({ matches: true });
            expect(getCurrentTheme()).toBe('dark');

            window.matchMedia = vi.fn().mockReturnValue({ matches: false });
            expect(getCurrentTheme()).toBe('light');
        });
    });

    describe('updateThemeToggleUI', () => {
        it('updates toggle attributes and icons for dark mode', () => {
            updateThemeToggleUI('dark');
            const toggle = document.getElementById('theme-toggle');
            const icon = document.getElementById('theme-toggle-icon');

            expect(toggle.getAttribute('aria-label')).toBe('Switch to light mode');
            expect(toggle.getAttribute('title')).toBe('Switch to Light Mode');
            expect(toggle.getAttribute('aria-pressed')).toBe('true');
            expect(toggle.getAttribute('data-theme')).toBe('dark');
            expect(icon.textContent).toBe('☀️');
        });

        it('updates toggle attributes and icons for light mode', () => {
            updateThemeToggleUI('light');
            const toggle = document.getElementById('theme-toggle');
            const icon = document.getElementById('theme-toggle-icon');

            expect(toggle.getAttribute('aria-label')).toBe('Switch to dark mode');
            expect(toggle.getAttribute('title')).toBe('Switch to Dark Mode');
            expect(toggle.getAttribute('aria-pressed')).toBe('false');
            expect(toggle.getAttribute('data-theme')).toBe('light');
            expect(icon.textContent).toBe('🌙');
        });

        it('handles buttons without nested icon spans gracefully', () => {
            document.body.innerHTML = `<button id="theme-toggle" class="theme-toggle-btn">🌙</button>`;
            updateThemeToggleUI('dark');
            const toggle = document.getElementById('theme-toggle');
            expect(toggle.textContent).toBe('☀️');
        });
    });

    describe('setTheme', () => {
        it('applies dark theme: sets data-theme, classes, localStorage, and UI', () => {
            const eventSpy = vi.fn();
            window.addEventListener('themechange', eventSpy);

            const result = setTheme('dark');

            expect(result).toBe('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            expect(document.documentElement.classList.contains('dark')).toBe(true);
            expect(document.documentElement.classList.contains('light')).toBe(false);
            expect(localStorage.getItem(THEME_KEY)).toBe('dark');

            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(eventSpy.mock.calls[0][0].detail.theme).toBe('dark');
        });

        it('applies light theme: sets data-theme, classes, localStorage, and UI', () => {
            const result = setTheme('light');

            expect(result).toBe('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
            expect(document.documentElement.classList.contains('light')).toBe(true);
            expect(document.documentElement.classList.contains('dark')).toBe(false);
            expect(localStorage.getItem(THEME_KEY)).toBe('light');
        });

        it('normalizes invalid theme arguments to "light"', () => {
            const result = setTheme('invalid-mode');
            expect(result).toBe('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });
    });

    describe('toggleTheme', () => {
        it('toggles from light to dark', () => {
            setTheme('light');
            const next = toggleTheme();
            expect(next).toBe('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            expect(localStorage.getItem(THEME_KEY)).toBe('dark');
        });

        it('toggles from dark to light', () => {
            setTheme('dark');
            const next = toggleTheme();
            expect(next).toBe('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
            expect(localStorage.getItem(THEME_KEY)).toBe('light');
        });
    });

    describe('initTheme', () => {
        it('initializes from stored preference when available', () => {
            localStorage.setItem(THEME_KEY, 'dark');
            window.matchMedia = vi.fn().mockReturnValue({ matches: false });

            const init = initTheme();
            expect(init).toBe('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it('initializes from system preference when no stored preference exists', () => {
            localStorage.removeItem(THEME_KEY);
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: true,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            const init = initTheme();
            expect(init).toBe('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it('defaults to light when neither stored nor system dark match', () => {
            localStorage.removeItem(THEME_KEY);
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            }));

            const init = initTheme();
            expect(init).toBe('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });

        it('wires up click handlers on toggle buttons', () => {
            localStorage.setItem(THEME_KEY, 'light');
            initTheme();

            const toggle = document.getElementById('theme-toggle');
            toggle.click();

            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            expect(localStorage.getItem(THEME_KEY)).toBe('dark');
        });

        it('clicks a rendered toggle once and verifies that root theme changes once and stored value matches it', () => {
            localStorage.setItem(THEME_KEY, 'light');
            initTheme();

            const landingToggle = document.getElementById('landing-theme-toggle');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');

            landingToggle.click();

            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
            expect(localStorage.getItem(THEME_KEY)).toBe('dark');

            // Click again to confirm clean toggling back
            landingToggle.click();
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
            expect(localStorage.getItem(THEME_KEY)).toBe('light');
        });

        it('responds to system media query change when user has not saved an override', () => {
            localStorage.removeItem(THEME_KEY);
            initTheme();

            // Simulate OS theme switch to dark
            matchMediaListeners.forEach(listener => listener({ matches: true }));
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

            // Simulate OS theme switch to light
            matchMediaListeners.forEach(listener => listener({ matches: false }));
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });

        it('does not override user saved preference on system theme change', () => {
            localStorage.setItem(THEME_KEY, 'light');
            initTheme();

            // Simulate OS theme switch to dark while user explicitly chose light
            matchMediaListeners.forEach(listener => listener({ matches: true }));
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });

        it('supports legacy addListener and removeListener when addEventListener is absent', () => {
            localStorage.removeItem(THEME_KEY);
            const legacyListeners = [];
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: false,
                media: query,
                addListener: vi.fn((fn) => legacyListeners.push(fn)),
                removeListener: vi.fn()
            }));

            initTheme();
            expect(legacyListeners.length).toBe(1);

            legacyListeners[0]({ matches: true });
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

            resetThemeState();
        });
    });

    describe('Global Attachment', () => {
        it('attaches AbstractifyTheme to window', () => {
            expect(window.AbstractifyTheme).toBeDefined();
            expect(typeof window.AbstractifyTheme.initTheme).toBe('function');
            expect(typeof window.AbstractifyTheme.toggleTheme).toBe('function');
            expect(typeof window.AbstractifyTheme.setTheme).toBe('function');
            expect(typeof window.AbstractifyTheme.getCurrentTheme).toBe('function');
        });
    });
});
