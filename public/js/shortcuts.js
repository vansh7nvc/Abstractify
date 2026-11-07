/**
 * AbstractiFy - Keyboard Shortcuts & Accessibility System
 * Issue #13: Global keyboard navigation, Command Palette, and WCAG AA accessibility
 */

/**
 * Checks whether the current active element is an editable text field
 * (input, textarea, select, contenteditable) to avoid intercepting normal typing.
 * @param {Element|null} [element=document.activeElement]
 * @returns {boolean}
 */
export function isEditableElement(element = (typeof document !== 'undefined' ? document.activeElement : null)) {
    if (!element) return false;
    const tagName = element.tagName ? element.tagName.toLowerCase() : '';
    if (tagName === 'input') {
        const type = (element.getAttribute('type') || 'text').toLowerCase();
        // Check if it's a text-entry input
        const nonTextTypes = ['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file', 'image'];
        return !nonTextTypes.includes(type);
    }
    if (tagName === 'textarea' || tagName === 'select') return true;
    if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') return true;
    return false;
}

/**
 * Opens a modal dialog with full accessibility state updates and focus management.
 * @param {HTMLElement} modal
 * @param {HTMLElement} [focusTarget]
 */
export function openModal(modal, focusTarget) {
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    // Auto-focus designated input or first focusable element
    const target = focusTarget || modal.querySelector('input, select, textarea, button:not([disabled])');
    if (target && typeof target.focus === 'function') {
        setTimeout(() => target.focus(), 50);
    }
}

/**
 * Closes a modal dialog and synchronizes accessibility attributes.
 * @param {HTMLElement} modal
 */
export function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
}

/**
 * Closes all active/visible modals in the document.
 * @returns {number} Number of modals closed
 */
export function closeAllModals() {
    if (typeof document === 'undefined') return 0;
    const modals = document.querySelectorAll('.modal:not(.hidden), [role="dialog"]:not(.hidden)');
    let count = 0;
    modals.forEach(modal => {
        closeModal(modal);
        count++;
    });
    return count;
}

/**
 * Handles global keydown events for application-wide shortcuts.
 * @param {KeyboardEvent} event
 * @param {Object} actions
 * @param {Function} [actions.onOpenCommandPalette]
 * @param {Function} [actions.onFocusSearch]
 * @param {Function} [actions.onSwitchTab]
 * @param {Function} [actions.onOpenHelp]
 * @param {Function} [actions.onCloseModals]
 */
export function handleGlobalKeyDown(event, actions = {}) {
    if (!event) return;

    const isModifier = Boolean(event.ctrlKey || event.metaKey);
    const key = event.key ? event.key.toLowerCase() : '';

    // ─── 1. Cmd+K / Ctrl+K: Open Quick Command Palette ───
    if (isModifier && key === 'k') {
        event.preventDefault();
        if (typeof actions.onOpenCommandPalette === 'function') {
            actions.onOpenCommandPalette();
        }
        return;
    }

    // ─── 2. Escape: Dismiss any active modal ───
    if (event.key === 'Escape' || event.key === 'Esc') {
        const closedCount = closeAllModals();
        if (typeof actions.onCloseModals === 'function') {
            actions.onCloseModals(closedCount);
        }
        return;
    }

    // ─── 3. Alt+1, Alt+2, Alt+3: Switch Workspace Views ───
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === '1') {
            event.preventDefault();
            if (typeof actions.onSwitchTab === 'function') actions.onSwitchTab('tab-consensus');
            return;
        }
        if (event.key === '2') {
            event.preventDefault();
            if (typeof actions.onSwitchTab === 'function') actions.onSwitchTab('tab-matrix');
            return;
        }
        if (event.key === '3') {
            event.preventDefault();
            if (typeof actions.onSwitchTab === 'function') actions.onSwitchTab('tab-graph');
            return;
        }
    }

    // Don't intercept single-key triggers if user is actively typing in an input
    if (isEditableElement()) {
        return;
    }

    // ─── 4. Forward Slash (/): Focus Search Bar ───
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (typeof actions.onFocusSearch === 'function') {
            actions.onFocusSearch();
        }
        return;
    }

    // ─── 5. Question Mark (?): Open Shortcuts Help Modal ───
    if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (typeof actions.onOpenHelp === 'function') {
            actions.onOpenHelp();
        }
        return;
    }
}

/**
 * Initializes global keyboard listeners and binds UI controls.
 * @param {Object} options
 * @returns {Function} Cleanup function to detach event listeners
 */
export function initShortcuts(options = {}) {
    if (typeof document === 'undefined') return () => {};

    const paletteModal = document.getElementById('command-palette-modal');
    const paletteInput = document.getElementById('palette-search-input');
    const helpModal = document.getElementById('shortcuts-modal');
    const searchInput = document.getElementById('search-input');
    const landingSearchInput = document.getElementById('landing-search-input');

    const listener = (e) => {
        handleGlobalKeyDown(e, {
            onOpenCommandPalette: () => {
                if (paletteModal) {
                    openModal(paletteModal, paletteInput);
                } else if (typeof options.onOpenCommandPalette === 'function') {
                    options.onOpenCommandPalette();
                }
            },
            onFocusSearch: () => {
                const landingView = document.getElementById('landing-view');
                const isLanding = landingView && !landingView.classList.contains('hidden');
                const targetInput = isLanding ? landingSearchInput : searchInput;
                if (targetInput && typeof targetInput.focus === 'function') {
                    targetInput.focus();
                    targetInput.select();
                }
            },
            onSwitchTab: (tabId) => {
                if (typeof options.onSwitchTab === 'function') {
                    options.onSwitchTab(tabId);
                }
            },
            onOpenHelp: () => {
                if (helpModal) {
                    openModal(helpModal);
                } else if (typeof options.onOpenHelp === 'function') {
                    options.onOpenHelp();
                }
            },
            onCloseModals: options.onCloseModals
        });
    };

    document.addEventListener('keydown', listener);

    return () => {
        document.removeEventListener('keydown', listener);
    };
}

// Global browser script attachment
if (typeof window !== 'undefined') {
    window.AbstractifyShortcuts = {
        isEditableElement,
        openModal,
        closeModal,
        closeAllModals,
        handleGlobalKeyDown,
        initShortcuts
    };
}

