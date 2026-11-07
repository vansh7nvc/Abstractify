/**
 * AbstractiFy - KaTeX Math Rendering Engine Integration
 * Issue #02: Render inline and block LaTeX formulas seamlessly throughout the UI.
 */

/**
 * Normalizes a raw LaTeX string by trimming and stripping outer delimiters ($...$ or $$...$$)
 * if passed directly to katex.render.
 * @param {string} formula Raw equation or LaTeX string
 * @returns {string} Clean formula string ready for KaTeX
 */
export function cleanFormulaString(formula) {
    if (!formula || typeof formula !== 'string') return '';
    let trimmed = formula.trim();

    // Check and strip $$ ... $$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length >= 4) {
        trimmed = trimmed.slice(2, -2).trim();
    }
    // Check and strip $ ... $
    else if (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length >= 2) {
        trimmed = trimmed.slice(1, -1).trim();
    }
    // Check and strip \\[ ... \\]
    else if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]') && trimmed.length >= 4) {
        trimmed = trimmed.slice(2, -2).trim();
    }
    // Check and strip \\( ... \\)
    else if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)') && trimmed.length >= 4) {
        trimmed = trimmed.slice(2, -2).trim();
    }

    return trimmed;
}

/**
 * Renders a LaTeX equation into a target DOM element with KaTeX.
 * Gracefully falls back to plain text if KaTeX is unavailable or if parsing fails.
 *
 * @param {string} formula Raw or delimited LaTeX string
 * @param {HTMLElement} element DOM container to render into
 * @param {Object} [options={}] KaTeX render options
 * @param {boolean} [options.displayMode=false] Render as display block (true) or inline (false)
 * @param {boolean} [options.throwOnError=false] Throw JS error on invalid syntax (defaults to false)
 * @returns {boolean} True if rendered via KaTeX, false if fallback used
 */
export function renderLatex(formula, element, options = {}) {
    if (!element || typeof element !== 'object') return false;

    const raw = typeof formula === 'string' ? formula : String(formula || '');
    const clean = cleanFormulaString(raw);

    const katexGlobal = (typeof window !== 'undefined' && window.katex)
        ? window.katex
        : (typeof globalThis !== 'undefined' && globalThis.katex)
            ? globalThis.katex
            : null;

    if (katexGlobal && typeof katexGlobal.render === 'function') {
        try {
            katexGlobal.render(clean, element, {
                throwOnError: false,
                displayMode: Boolean(options.displayMode),
                errorColor: '#cc0000',
                strict: false,
                ...options
            });
            return true;
        } catch (_err) {
            element.textContent = raw;
            return false;
        }
    }

    // Fallback when KaTeX library is not loaded
    element.textContent = raw;
    return false;
}

/**
 * Scans a DOM container and automatically renders all inline ($...$) and block ($$...$$)
 * LaTeX math expressions in-place using KaTeX auto-render extension.
 *
 * @param {HTMLElement} container DOM element containing text with LaTeX delimiters
 * @param {Object} [options={}] Configuration options
 * @returns {boolean} True if auto-render succeeded, false otherwise
 */
export function renderMathInContainer(container, options = {}) {
    if (!container || typeof container !== 'object') return false;

    const renderMathFunc = (typeof window !== 'undefined' && window.renderMathInElement)
        ? window.renderMathInElement
        : (typeof globalThis !== 'undefined' && globalThis.renderMathInElement)
            ? globalThis.renderMathInElement
            : null;

    if (typeof renderMathFunc === 'function') {
        try {
            renderMathFunc(container, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false,
                errorColor: '#cc0000',
                ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
                ...options
            });
            return true;
        } catch (_err) {
            return false;
        }
    }

    return false;
}

// Global browser script attachment
if (typeof window !== 'undefined') {
    window.AbstractifyKatex = {
        cleanFormulaString,
        renderLatex,
        renderMathInContainer
    };
}

