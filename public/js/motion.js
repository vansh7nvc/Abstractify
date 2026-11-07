/**
 * AbstractiFy Modern Motion Design & Kinetic Interaction Suite
 * Powers 3D perspective card tilts, specular mouse-tracking glares,
 * and kinetic micro-interactions inspired by award-winning interactive design.
 */

/**
 * Calculates 3D tilt angles and glare coordinates from pointer offset.
 * @param {number} offsetX Pointer X coordinate relative to element
 * @param {number} offsetY Pointer Y coordinate relative to element
 * @param {number} width Element bounding client width
 * @param {number} height Element bounding client height
 * @param {number} [maxTilt=8] Maximum tilt degrees
 * @returns {{ rotateX: number, rotateY: number, glareX: number, glareY: number }}
 */
export function calculateTilt(offsetX, offsetY, width, height, maxTilt = 8) {
    if (!width || !height) {
        return { rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 };
    }

    const normX = Math.min(Math.max(offsetX / width, 0), 1);
    const normY = Math.min(Math.max(offsetY / height, 0), 1);

    const rotateX = Number(((0.5 - normY) * maxTilt * 2).toFixed(2));
    const rotateY = Number(((normX - 0.5) * maxTilt * 2).toFixed(2));
    const glareX  = Number((normX * 100).toFixed(1));
    const glareY  = Number((normY * 100).toFixed(1));

    return { rotateX, rotateY, glareX, glareY };
}

/**
 * Initializes 3D card tilt and glare highlight interactions across target cards.
 * @param {string} [selector='.folio-card, .paper-card']
 * @returns {Function} Cleanup function to detach event listeners
 */
export function initTiltCards(selector = '.folio-card, .paper-card') {
    if (typeof document === 'undefined') return () => {};

    const cards = document.querySelectorAll(selector);
    const listeners = [];

    cards.forEach(card => {
        // Ensure card has 3D perspective styling
        card.style.transformStyle = 'preserve-3d';
        card.style.transition = 'transform 0.15s ease-out, box-shadow 0.25s ease';

        // Add specular glare overlay if not present
        let glare = card.querySelector('.specular-glare');
        if (!glare) {
            glare = document.createElement('div');
            glare.className = 'specular-glare pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300';
            glare.style.zIndex = '2';
            if (getComputedStyle(card).position === 'static') {
                card.style.position = 'relative';
            }
            card.appendChild(glare);
        }

        const onMouseMove = (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const { rotateX, rotateY, glareX, glareY } = calculateTilt(x, y, rect.width, rect.height, 6);

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;

            const isDark = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
            const glareColor = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.35)';

            glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, ${glareColor}, transparent 65%)`;
            glare.style.opacity = '1';
        };

        const onMouseLeave = () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
            glare.style.opacity = '0';
        };

        card.addEventListener('mousemove', onMouseMove);
        card.addEventListener('mouseleave', onMouseLeave);

        listeners.push({ card, onMouseMove, onMouseLeave });
    });

    return () => {
        listeners.forEach(({ card, onMouseMove, onMouseLeave }) => {
            card.removeEventListener('mousemove', onMouseMove);
            card.removeEventListener('mouseleave', onMouseLeave);
        });
    };
}

/**
 * Initializes subtle magnetic pull on CTA buttons.
 * @param {string} [selector='.oxford-btn']
 * @returns {Function}
 */
export function initMagneticButtons(selector = '.oxford-btn') {
    if (typeof document === 'undefined') return () => {};

    const buttons = document.querySelectorAll(selector);
    const listeners = [];

    buttons.forEach(btn => {
        btn.style.transition = 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s ease';

        const onMouseMove = (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - (rect.left + rect.width / 2);
            const y = e.clientY - (rect.top + rect.height / 2);

            const pullX = Number((x * 0.12).toFixed(2));
            const pullY = Number((y * 0.12).toFixed(2));

            btn.style.transform = `translate(${pullX}px, ${pullY}px)`;
        };

        const onMouseLeave = () => {
            btn.style.transform = 'translate(0px, 0px)';
        };

        btn.addEventListener('mousemove', onMouseMove);
        btn.addEventListener('mouseleave', onMouseLeave);

        listeners.push({ btn, onMouseMove, onMouseLeave });
    });

    return () => {
        listeners.forEach(({ btn, onMouseMove, onMouseLeave }) => {
            btn.removeEventListener('mousemove', onMouseMove);
            btn.removeEventListener('mouseleave', onMouseLeave);
        });
    };
}
