import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    isEditableElement,
    openModal,
    closeModal,
    closeAllModals,
    handleGlobalKeyDown,
    initShortcuts
} from '../js/shortcuts.js';

describe('public/js/shortcuts.js - Keyboard Shortcuts & Accessibility System', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="landing-view">
                <input id="landing-search-input" type="text" />
            </div>
            <div id="app-view" class="hidden">
                <input id="search-input" type="text" />
            </div>
            <div id="command-palette-modal" class="modal hidden" role="dialog" aria-hidden="true">
                <input id="palette-search-input" type="text" />
            </div>
            <div id="shortcuts-modal" class="modal hidden" role="dialog" aria-hidden="true">
                <button id="shortcuts-close-btn">&times;</button>
            </div>
            <div id="settings-modal" class="modal hidden" role="dialog" aria-hidden="true">
                <button id="settings-close-btn">&times;</button>
            </div>
            <textarea id="test-textarea"></textarea>
            <button id="test-button">Click Me</button>
        `;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    describe('isEditableElement', () => {
        it('identifies text input as editable', () => {
            const input = document.getElementById('search-input');
            expect(isEditableElement(input)).toBe(true);
        });

        it('identifies textarea and select as editable', () => {
            const textarea = document.getElementById('test-textarea');
            expect(isEditableElement(textarea)).toBe(true);
        });

        it('identifies contenteditable elements as editable', () => {
            const div = document.createElement('div');
            div.setAttribute('contenteditable', 'true');
            expect(isEditableElement(div)).toBe(true);
        });

        it('does not treat buttons or non-text inputs as editable text fields', () => {
            const button = document.getElementById('test-button');
            expect(isEditableElement(button)).toBe(false);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            expect(isEditableElement(checkbox)).toBe(false);
        });

        it('returns false when element is null or undefined', () => {
            expect(isEditableElement(null)).toBe(false);
            expect(isEditableElement(undefined)).toBe(false);
        });
    });

    describe('openModal and closeModal', () => {
        it('opens modal, removes hidden class, and sets aria-hidden to false', () => {
            const modal = document.getElementById('command-palette-modal');
            openModal(modal);

            expect(modal.classList.contains('hidden')).toBe(false);
            expect(modal.getAttribute('aria-hidden')).toBe('false');
        });

        it('closes modal, adds hidden class, and sets aria-hidden to true', () => {
            const modal = document.getElementById('command-palette-modal');
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');

            closeModal(modal);

            expect(modal.classList.contains('hidden')).toBe(true);
            expect(modal.getAttribute('aria-hidden')).toBe('true');
        });

        it('closes all visible modals via closeAllModals', () => {
            const modal1 = document.getElementById('command-palette-modal');
            const modal2 = document.getElementById('shortcuts-modal');
            const modal3 = document.getElementById('settings-modal');

            modal1.classList.remove('hidden');
            modal2.classList.remove('hidden');
            modal3.classList.remove('hidden');

            const count = closeAllModals();
            expect(count).toBe(3);
            expect(modal1.classList.contains('hidden')).toBe(true);
            expect(modal2.classList.contains('hidden')).toBe(true);
            expect(modal3.classList.contains('hidden')).toBe(true);
        });
    });

    describe('handleGlobalKeyDown', () => {
        it('triggers onOpenCommandPalette on Ctrl+K (Windows/Linux) or Cmd+K (Mac)', () => {
            const onOpenCommandPalette = vi.fn();

            // Simulate Ctrl+K
            const ctrlEvent = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
            handleGlobalKeyDown(ctrlEvent, { onOpenCommandPalette });
            expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);

            // Simulate Cmd+K
            const metaEvent = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
            handleGlobalKeyDown(metaEvent, { onOpenCommandPalette });
            expect(onOpenCommandPalette).toHaveBeenCalledTimes(2);
        });

        it('triggers onCloseModals and dismisses modals on Escape key', () => {
            const onCloseModals = vi.fn();
            const modal = document.getElementById('command-palette-modal');
            modal.classList.remove('hidden');

            const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            handleGlobalKeyDown(escEvent, { onCloseModals });

            expect(modal.classList.contains('hidden')).toBe(true);
            expect(onCloseModals).toHaveBeenCalledWith(1);
        });

        it('triggers view switching on Alt+1, Alt+2, Alt+3', () => {
            const onSwitchTab = vi.fn();

            handleGlobalKeyDown(new KeyboardEvent('keydown', { key: '1', altKey: true }), { onSwitchTab });
            expect(onSwitchTab).toHaveBeenCalledWith('tab-consensus');

            handleGlobalKeyDown(new KeyboardEvent('keydown', { key: '2', altKey: true }), { onSwitchTab });
            expect(onSwitchTab).toHaveBeenCalledWith('tab-matrix');

            handleGlobalKeyDown(new KeyboardEvent('keydown', { key: '3', altKey: true }), { onSwitchTab });
            expect(onSwitchTab).toHaveBeenCalledWith('tab-graph');
        });

        it('triggers onFocusSearch on "/" when not actively typing', () => {
            const onFocusSearch = vi.fn();
            const slashEvent = new KeyboardEvent('keydown', { key: '/', bubbles: true });

            document.getElementById('test-button').focus();
            handleGlobalKeyDown(slashEvent, { onFocusSearch });

            expect(onFocusSearch).toHaveBeenCalledTimes(1);
        });

        it('does NOT trigger onFocusSearch on "/" when typing inside an input', () => {
            const onFocusSearch = vi.fn();
            const input = document.getElementById('search-input');
            input.focus();

            const slashEvent = new KeyboardEvent('keydown', { key: '/', bubbles: true });
            handleGlobalKeyDown(slashEvent, { onFocusSearch });

            expect(onFocusSearch).not.toHaveBeenCalled();
        });

        it('triggers onOpenHelp on "?" when not typing in an input', () => {
            const onOpenHelp = vi.fn();
            document.getElementById('test-button').focus();

            const helpEvent = new KeyboardEvent('keydown', { key: '?', bubbles: true });
            handleGlobalKeyDown(helpEvent, { onOpenHelp });

            expect(onOpenHelp).toHaveBeenCalledTimes(1);
        });
    });

    describe('initShortcuts lifecycle', () => {
        it('binds listeners and executes cleanup on return', () => {
            const onSwitchTab = vi.fn();
            const cleanup = initShortcuts({ onSwitchTab });

            document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', altKey: true }));
            expect(onSwitchTab).toHaveBeenCalledWith('tab-consensus');

            cleanup();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', altKey: true }));
            expect(onSwitchTab).not.toHaveBeenCalledWith('tab-matrix');
        });
    });

    describe('Global Attachment', () => {
        it('attaches AbstractifyShortcuts to window', () => {
            expect(window.AbstractifyShortcuts).toBeDefined();
            expect(typeof window.AbstractifyShortcuts.initShortcuts).toBe('function');
            expect(typeof window.AbstractifyShortcuts.openModal).toBe('function');
            expect(typeof window.AbstractifyShortcuts.closeModal).toBe('function');
            expect(typeof window.AbstractifyShortcuts.closeAllModals).toBe('function');
            expect(typeof window.AbstractifyShortcuts.handleGlobalKeyDown).toBe('function');
        });
    });
});

