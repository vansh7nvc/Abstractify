import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    cleanFormulaString,
    renderLatex,
    renderMathInContainer
} from '../js/katex-helper.js';

describe('public/js/katex-helper.js - KaTeX Math Rendering Engine', () => {
    let mockKatex;
    let mockRenderMathInElement;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="container">
                <span id="formula-target"></span>
                <div id="chat-bubble">This is an inline formula $E = mc^2$ and a block $$\\int_0^1 x dx$$.</div>
            </div>
        `;

        mockKatex = {
            render: vi.fn((tex, element, options) => {
                element.innerHTML = `<span class="katex"><span class="katex-html">${tex}</span></span>`;
            })
        };

        mockRenderMathInElement = vi.fn((element, options) => {
            element.setAttribute('data-math-rendered', 'true');
        });

        window.katex = mockKatex;
        window.renderMathInElement = mockRenderMathInElement;
    });

    afterEach(() => {
        delete window.katex;
        delete window.renderMathInElement;
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    describe('cleanFormulaString', () => {
        it('strips surrounding $$ delimiters', () => {
            expect(cleanFormulaString('$$\\sum_{i=1}^n x_i$$')).toBe('\\sum_{i=1}^n x_i');
            expect(cleanFormulaString('  $$ E = mc^2 $$  ')).toBe('E = mc^2');
        });

        it('strips surrounding $ inline delimiters', () => {
            expect(cleanFormulaString('$\\sigma = \\sqrt{V}$')).toBe('\\sigma = \\sqrt{V}');
            expect(cleanFormulaString('  $x + y = z$  ')).toBe('x + y = z');
        });

        it('strips LaTeX bracket delimiters \\[ and \\]', () => {
            expect(cleanFormulaString('\\[\\alpha + \\beta\\]')).toBe('\\alpha + \\beta');
        });

        it('strips LaTeX parenthesis delimiters \\( and \\)', () => {
            expect(cleanFormulaString('\\(\\theta\\)')).toBe('\\theta');
        });

        it('returns bare formulas unchanged', () => {
            expect(cleanFormulaString('\\nabla \\times \\mathbf{B}')).toBe('\\nabla \\times \\mathbf{B}');
        });

        it('handles null, undefined, or empty values safely', () => {
            expect(cleanFormulaString('')).toBe('');
            expect(cleanFormulaString(null)).toBe('');
            expect(cleanFormulaString(undefined)).toBe('');
            expect(cleanFormulaString(123)).toBe('');
        });
    });

    describe('renderLatex', () => {
        it('renders LaTeX into element using katex.render with throwOnError: false', () => {
            const target = document.getElementById('formula-target');
            const success = renderLatex('$\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}$', target);

            expect(success).toBe(true);
            expect(mockKatex.render).toHaveBeenCalledWith(
                '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}',
                target,
                expect.objectContaining({
                    throwOnError: false,
                    displayMode: false
                })
            );
            expect(target.querySelector('.katex')).not.toBeNull();
        });

        it('respects displayMode: true for block equations', () => {
            const target = document.getElementById('formula-target');
            const success = renderLatex('$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$', target, { displayMode: true });

            expect(success).toBe(true);
            expect(mockKatex.render).toHaveBeenCalledWith(
                '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}',
                target,
                expect.objectContaining({
                    throwOnError: false,
                    displayMode: true
                })
            );
        });

        it('falls back to element.textContent when katex is undefined', () => {
            delete window.katex;
            const target = document.getElementById('formula-target');
            const rawTex = '\\sigma = \\sqrt{\\frac{1}{N} \\sum (x_i - \\mu)^2}';

            const success = renderLatex(rawTex, target);
            expect(success).toBe(false);
            expect(target.textContent).toBe(rawTex);
        });

        it('falls back to element.textContent without throwing if katex.render throws', () => {
            mockKatex.render.mockImplementation(() => {
                throw new Error('KaTeX rendering internal error');
            });

            const target = document.getElementById('formula-target');
            const rawTex = '\\invalid{\\syntax';

            const success = renderLatex(rawTex, target);
            expect(success).toBe(false);
            expect(target.textContent).toBe(rawTex);
        });

        it('returns false safely when element is invalid', () => {
            expect(renderLatex('x=1', null)).toBe(false);
            expect(renderLatex('x=1', undefined)).toBe(false);
        });
    });

    describe('renderMathInContainer', () => {
        it('invokes renderMathInElement with standard delimiters and throwOnError: false', () => {
            const container = document.getElementById('chat-bubble');
            const success = renderMathInContainer(container);

            expect(success).toBe(true);
            expect(mockRenderMathInElement).toHaveBeenCalledWith(
                container,
                expect.objectContaining({
                    throwOnError: false,
                    delimiters: expect.arrayContaining([
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false }
                    ])
                })
            );
        });

        it('returns false safely when renderMathInElement is undefined', () => {
            delete window.renderMathInElement;
            const container = document.getElementById('chat-bubble');

            const success = renderMathInContainer(container);
            expect(success).toBe(false);
        });

        it('handles exceptions thrown by renderMathInElement gracefully', () => {
            mockRenderMathInElement.mockImplementation(() => {
                throw new Error('Auto-render error');
            });
            const container = document.getElementById('chat-bubble');

            const success = renderMathInContainer(container);
            expect(success).toBe(false);
        });

        it('returns false when container is invalid', () => {
            expect(renderMathInContainer(null)).toBe(false);
            expect(renderMathInContainer(undefined)).toBe(false);
        });
    });

    describe('Global Attachment', () => {
        it('exposes AbstractifyKatex on window object', () => {
            expect(window.AbstractifyKatex).toBeDefined();
            expect(typeof window.AbstractifyKatex.cleanFormulaString).toBe('function');
            expect(typeof window.AbstractifyKatex.renderLatex).toBe('function');
            expect(typeof window.AbstractifyKatex.renderMathInContainer).toBe('function');
        });
    });
});

