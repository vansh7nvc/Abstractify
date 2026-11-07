import { describe, it, expect } from 'vitest';
import {
    calculateReadingMetrics,
    formatReadingTimeBadge
} from '../js/reading-time.js';

describe('public/js/reading-time.js - Reading Time & Academic Complexity Estimator', () => {
    describe('calculateReadingMetrics', () => {
        it('handles null, undefined, and empty text safely', () => {
            const nullRes = calculateReadingMetrics(null);
            expect(nullRes.minutes).toBe(1);
            expect(nullRes.words).toBe(0);
            expect(nullRes.complexity).toBe('Low');

            const emptyRes = calculateReadingMetrics('   ');
            expect(emptyRes.minutes).toBe(1);
            expect(emptyRes.words).toBe(0);
        });

        it('calculates expected reading time for normal academic abstract', () => {
            // Exactly 180 words, 10 sentences (18 words/sentence, Low complexity)
            const words = Array.from({ length: 180 }, (_, i) => `word${i}`);
            // Add periods every 18 words
            const text = words.map((w, idx) => (idx + 1) % 18 === 0 ? `${w}.` : w).join(' ');

            const metrics = calculateReadingMetrics(text);
            expect(metrics.words).toBe(180);
            expect(metrics.minutes).toBe(1);
            expect(metrics.complexity).toBe('Low');
            expect(metrics.icon).toBe('📖');
            expect(metrics.label).toBe('~1 min read');
        });

        it('applies 15% penalty for high sentence length (>25 words/sentence)', () => {
            // 360 words across 6 sentences = 60 words/sentence
            const words = Array.from({ length: 360 }, (_, i) => `academic${i}`);
            const text = words.map((w, idx) => (idx + 1) % 60 === 0 ? `${w}.` : w).join(' ');

            const metrics = calculateReadingMetrics(text);
            expect(metrics.words).toBe(360);
            // Base = 360/180 = 2.0. Multiplier = 1 + 0.15 = 2.3 -> rounds to 2
            expect(metrics.minutes).toBeGreaterThanOrEqual(2);
            expect(metrics.complexity).toBe('Dense');
        });

        it('factors in mathematical notation and elevates complexity to Dense', () => {
            const mathText = `
                We define the Hamiltonian \\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\epsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}.
                Furthermore, the integral is given by $$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$.
                The eigenvalues satisfy \\sum_{i=1}^n \\lambda_i = \\text{Tr}(A).
                Additional terms include \\alpha, \\beta, \\gamma, \\sigma, \\mu.
            `;

            const metrics = calculateReadingMetrics(mathText);
            expect(metrics.formulas).toBeGreaterThanOrEqual(5);
            expect(metrics.complexity).toBe('Dense');
            expect(metrics.icon).toBe('🧪');
            expect(metrics.tooltip).toContain('formulas');
        });

        it('accepts explicit formula count option from PDF extraction', () => {
            const text = 'Simple academic summary of an algorithmic optimization benchmark.';
            const metrics = calculateReadingMetrics(text, { formulaCount: 12 });

            expect(metrics.formulas).toBe(12);
            expect(metrics.complexity).toBe('Dense');
        });
    });

    describe('formatReadingTimeBadge', () => {
        it('returns accessible HTML badge string with appropriate classes', () => {
            const metrics = {
                minutes: 14,
                words: 2400,
                sentences: 60,
                formulas: 8,
                complexity: 'Dense',
                icon: '🧪',
                tooltip: '2,400 words • 8 formulas • Complexity: Dense'
            };

            const html = formatReadingTimeBadge(metrics);
            expect(html).toContain('badge-reading-time');
            expect(html).toContain('dense');
            expect(html).toContain('~14 min read');
            expect(html).toContain('🧪');
            expect(html).toContain('title="2,400 words • 8 formulas • Complexity: Dense"');
            expect(html).toContain('aria-label=');
        });

        it('handles null or empty metrics gracefully', () => {
            expect(formatReadingTimeBadge(null)).toBe('');
        });
    });

    describe('Global Attachment', () => {
        it('attaches AbstractifyReadingTime to window', () => {
            expect(window.AbstractifyReadingTime).toBeDefined();
            expect(typeof window.AbstractifyReadingTime.calculateReadingMetrics).toBe('function');
            expect(typeof window.AbstractifyReadingTime.formatReadingTimeBadge).toBe('function');
        });
    });
});

