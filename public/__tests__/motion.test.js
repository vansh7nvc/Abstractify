import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateTilt, initTiltCards, initMagneticButtons } from '../js/motion.js';

describe('public/js/motion.js (Kinetic Motion Suite)', () => {
    describe('calculateTilt', () => {
        it('returns zero tilt and centered glare when pointer is at the center', () => {
            const tilt = calculateTilt(100, 100, 200, 200, 10);
            expect(tilt.rotateX).toBe(0);
            expect(tilt.rotateY).toBe(0);
            expect(tilt.glareX).toBe(50);
            expect(tilt.glareY).toBe(50);
        });

        it('returns correct maximum angles at top-left corner', () => {
            const tilt = calculateTilt(0, 0, 200, 100, 8);
            expect(tilt.rotateX).toBe(8);
            expect(tilt.rotateY).toBe(-8);
            expect(tilt.glareX).toBe(0);
            expect(tilt.glareY).toBe(0);
        });

        it('returns correct maximum angles at bottom-right corner', () => {
            const tilt = calculateTilt(200, 100, 200, 100, 8);
            expect(tilt.rotateX).toBe(-8);
            expect(tilt.rotateY).toBe(8);
            expect(tilt.glareX).toBe(100);
            expect(tilt.glareY).toBe(100);
        });

        it('handles zero or falsy dimensions gracefully', () => {
            const zeroWidth = calculateTilt(10, 10, 0, 100);
            expect(zeroWidth).toEqual({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });

            const zeroHeight = calculateTilt(10, 10, 100, 0);
            expect(zeroHeight).toEqual({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
        });

        it('clamps pointer coordinates outside of card boundaries', () => {
            const outNegative = calculateTilt(-50, -50, 100, 100, 10);
            expect(outNegative.rotateX).toBe(10);
            expect(outNegative.rotateY).toBe(-10);
            expect(outNegative.glareX).toBe(0);
            expect(outNegative.glareY).toBe(0);

            const outExcess = calculateTilt(300, 300, 100, 100, 10);
            expect(outExcess.rotateX).toBe(-10);
            expect(outExcess.rotateY).toBe(10);
            expect(outExcess.glareX).toBe(100);
            expect(outExcess.glareY).toBe(100);
        });
    });

    describe('initTiltCards', () => {
        let container;

        beforeEach(() => {
            container = document.createElement('div');
            container.innerHTML = `
                <div class="folio-card" style="width: 200px; height: 100px;">
                    <h3>Card 1</h3>
                </div>
                <div class="folio-card" style="width: 200px; height: 100px;">
                    <h3>Card 2</h3>
                </div>
            `;
            document.body.appendChild(container);
        });

        afterEach(() => {
            document.body.removeChild(container);
            document.documentElement.removeAttribute('data-theme');
        });

        it('injects specular-glare overlay and registers event listeners', () => {
            const cleanup = initTiltCards('.folio-card');
            const cards = container.querySelectorAll('.folio-card');

            cards.forEach(card => {
                const glare = card.querySelector('.specular-glare');
                expect(glare).not.toBeNull();
                expect(card.style.transformStyle).toBe('preserve-3d');
            });

            cleanup();
        });

        it('updates transform on mousemove and resets on mouseleave', () => {
            const cleanup = initTiltCards('.folio-card');
            const card = container.querySelector('.folio-card');
            const glare = card.querySelector('.specular-glare');

            // Mock getBoundingClientRect
            vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
                left: 0,
                top: 0,
                width: 200,
                height: 100,
                right: 200,
                bottom: 100,
                x: 0,
                y: 0,
                toJSON: () => {}
            });

            // Simulate pointer movement near bottom-right
            const moveEvent = new MouseEvent('mousemove', {
                clientX: 180,
                clientY: 90,
                bubbles: true
            });
            card.dispatchEvent(moveEvent);

            expect(card.style.transform).toContain('rotateX');
            expect(card.style.transform).toContain('rotateY');
            expect(glare.style.opacity).toBe('1');
            expect(glare.style.background).toContain('radial-gradient');

            // Simulate mouseleave
            const leaveEvent = new MouseEvent('mouseleave', { bubbles: true });
            card.dispatchEvent(leaveEvent);

            expect(card.style.transform).toBe('perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)');
            expect(glare.style.opacity).toBe('0');

            cleanup();
        });

        it('uses dark theme glare highlights when data-theme is dark', () => {
            document.documentElement.setAttribute('data-theme', 'dark');
            const cleanup = initTiltCards('.folio-card');
            const card = container.querySelector('.folio-card');
            const glare = card.querySelector('.specular-glare');

            vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
                left: 0,
                top: 0,
                width: 200,
                height: 100,
                right: 200,
                bottom: 100,
                x: 0,
                y: 0,
                toJSON: () => {}
            });

            card.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 50 }));
            expect(glare.style.background).toContain('rgba(56, 189, 248');

            cleanup();
        });
    });

    describe('initMagneticButtons', () => {
        let btnContainer;

        beforeEach(() => {
            btnContainer = document.createElement('div');
            btnContainer.innerHTML = `<button class="oxford-btn">Explore</button>`;
            document.body.appendChild(btnContainer);
        });

        afterEach(() => {
            document.body.removeChild(btnContainer);
        });

        it('translates button toward cursor on mousemove and resets on mouseleave', () => {
            const cleanup = initMagneticButtons('.oxford-btn');
            const btn = btnContainer.querySelector('.oxford-btn');

            vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
                left: 100,
                top: 100,
                width: 100,
                height: 40,
                right: 200,
                bottom: 140,
                x: 100,
                y: 100,
                toJSON: () => {}
            });

            // Pointer slightly to the right and bottom of button center (center is 150, 120)
            btn.dispatchEvent(new MouseEvent('mousemove', { clientX: 180, clientY: 135 }));
            expect(btn.style.transform).toContain('translate(');

            btn.dispatchEvent(new MouseEvent('mouseleave'));
            expect(btn.style.transform).toBe('translate(0px, 0px)');

            cleanup();
        });
    });
});
