/**
 * AbstractiFy - Reading Time & Academic Complexity Estimator
 * Issue #05: Accurate reading time estimation and complexity scoring for academic texts and PDFs.
 */

/**
 * Calculates academic reading metrics including adjusted reading time, word count,
 * formula density, and structural complexity level.
 *
 * @param {string} text - Raw text (abstract, article body, or PDF text chunks)
 * @param {Object} [options={}]
 * @param {number} [options.formulaCount] - Explicit formula count if already extracted
 * @param {number} [options.wpm=180] - Words per minute baseline (default: 180 for academic prose)
 * @returns {Object} Reading metrics object
 */
export function calculateReadingMetrics(text, options = {}) {
    if (!text || typeof text !== 'string') {
        return {
            minutes: 1,
            words: 0,
            sentences: 0,
            formulas: 0,
            complexity: 'Low',
            icon: '📖',
            label: '1 min read',
            tooltip: '0 words • 0 formulas • Complexity: Low'
        };
    }

    const trimmed = text.trim();
    if (!trimmed) {
        return {
            minutes: 1,
            words: 0,
            sentences: 0,
            formulas: 0,
            complexity: 'Low',
            icon: '📖',
            label: '1 min read',
            tooltip: '0 words • 0 formulas • Complexity: Low'
        };
    }

    // 1. Word Count Extraction
    const wordsArray = trimmed.match(/\S+/g) || [];
    const wordCount = wordsArray.length;

    // 2. Sentence Count Extraction
    const sentencesArray = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentencesArray.length);

    // 3. Formula / Mathematical Notation Density
    let formulaCount = typeof options.formulaCount === 'number' ? options.formulaCount : 0;
    if (typeof options.formulaCount !== 'number') {
        const mathMatches = trimmed.match(/\\begin\{equation\}|\$\$|\$|\\int|\\sum|\\nabla|\\partial|\\alpha|\\beta|\\gamma|\\sigma|\\mu/g);
        formulaCount = mathMatches ? mathMatches.length : 0;
    }

    const wordsPerSentence = wordCount / sentenceCount;
    const formulaRatio = formulaCount / sentenceCount;

    // 4. Base Reading Time & Multipliers
    const wpm = options.wpm || 180;
    const baseMinutes = wordCount / wpm;

    // Academic Complexity Adjustments:
    // Long sentences (>25 words/sentence) add +15% cognitive load
    const sentenceMultiplier = wordsPerSentence > 25 ? 0.15 : 0;
    // Formula density adds proportional reading time
    const formulaMultiplier = 0.2 * formulaRatio;

    const totalMultiplier = 1 + sentenceMultiplier + formulaMultiplier;
    const rawMinutes = baseMinutes * totalMultiplier;
    const adjustedMinutes = Math.max(1, Math.round(rawMinutes));

    // 5. Complexity Categorization
    let complexity = 'Low';
    let icon = '📖';

    if (formulaRatio > 0.35 || wordsPerSentence > 30 || formulaCount >= 10) {
        complexity = 'Dense';
        icon = '🧪';
    } else if (formulaRatio > 0.12 || wordsPerSentence > 22 || formulaCount >= 3) {
        complexity = 'Moderate';
        icon = '📊';
    }

    const tooltip = `${wordCount.toLocaleString()} words • ${formulaCount} formulas • Complexity: ${complexity}`;
    const label = `~${adjustedMinutes} min read`;

    return {
        minutes: adjustedMinutes,
        words: wordCount,
        sentences: sentenceCount,
        formulas: formulaCount,
        complexity,
        icon,
        label,
        tooltip
    };
}

/**
 * Generates an HTML badge string or element for displaying reading time in the UI.
 * @param {Object} metrics - Result from calculateReadingMetrics
 * @returns {string} Sanitized HTML string for the badge
 */
export function formatReadingTimeBadge(metrics) {
    if (!metrics) return '';
    const safeComplexity = (metrics.complexity || 'Low').toLowerCase();
    const safeMinutes = metrics.minutes || 1;
    const safeIcon = metrics.icon || '⏱';
    const safeTooltip = (metrics.tooltip || '').replace(/"/g, '&quot;');
    const safeLabel = `${safeIcon} ~${safeMinutes} min read • ${metrics.complexity}`;

    return `<span class="badge-reading-time ${safeComplexity}" title="${safeTooltip}" aria-label="${safeTooltip}">${safeLabel}</span>`;
}

// Global browser script attachment
if (typeof window !== 'undefined') {
    window.AbstractifyReadingTime = {
        calculateReadingMetrics,
        formatReadingTimeBadge
    };
}

