/**
 * AbstractiFy Interactive 3D Knowledge Universe (Three.js)
 * Renders an ethereal, interactive 3D particle constellation and scientific geometry
 * background for the landing page with mouse parallax, inertial damping, and dual-theme calibration.
 */

/**
 * Creates a glowing circular dot sprite texture on an offscreen 2D canvas.
 * Eliminates external image asset dependencies.
 * @returns {HTMLCanvasElement}
 */
export function createGlowTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return canvas;
}

/**
 * Calculates theme-specific 3D colors.
 * @param {boolean} isDark
 * @returns {Object}
 */
export function getHero3DColors(isDark = false) {
    if (isDark) {
        return {
            particlePrimary: 0x38BDF8,   // Celestial Sky Blue
            particleSecondary: 0x818CF8, // Luminous Indigo
            lineColor: 0x38BDF8,         // Cyan Filaments
            lineOpacity: 0.18,
            meshWireframe: 0x6366F1,     // Electric Indigo
            meshOpacity: 0.25,
            clearColor: 0x0B1120,
            clearAlpha: 0.0
        };
    }
    return {
        particlePrimary: 0x002147,     // Oxford Navy
        particleSecondary: 0x1E40AF,   // Scholarly Cobalt
        lineColor: 0x002147,           // Deep Navy Filaments
        lineOpacity: 0.12,
        meshWireframe: 0x2563EB,       // Blueprint Blue
        meshOpacity: 0.18,
        clearColor: 0xFDFAF6,
        clearAlpha: 0.0
    };
}

/**
 * Initializes the interactive Three.js 3D background.
 * @param {HTMLCanvasElement|string} canvasElement Canvas element or element ID
 * @param {Object} [options={}]
 * @returns {Object|null} Controller object with pause, resume, setTheme, and destroy methods
 */
export function initHero3D(canvasElement, options = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;

    const THREE = options.three || window.THREE;
    if (!THREE) {
        console.warn('Three.js library not detected. Skipping 3D hero background.');
        return null;
    }

    const canvas = typeof canvasElement === 'string'
        ? document.getElementById(canvasElement)
        : canvasElement;

    if (!canvas) return null;

    let width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    let height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
    if (width === 0 || height === 0) {
        width = window.innerWidth;
        height = window.innerHeight;
    }

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 28;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
    } catch (e) {
        console.warn('WebGL initialization failed for Hero 3D:', e);
        return null;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    let isDark = options.isDark !== undefined
        ? options.isDark
        : (document.documentElement.getAttribute('data-theme') === 'dark');

    let colors = getHero3DColors(isDark);

    // 2. Particle Constellation Nodes
    const particleCount = options.particleCount || 160;
    const particleCoords = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleVelocities = [];

    const color1 = new THREE.Color(colors.particlePrimary);
    const color2 = new THREE.Color(colors.particleSecondary);

    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 55;
        const y = (Math.random() - 0.5) * 35;
        const z = (Math.random() - 0.5) * 30;

        particleCoords[i * 3]     = x;
        particleCoords[i * 3 + 1] = y;
        particleCoords[i * 3 + 2] = z;

        particleVelocities.push({
            x: (Math.random() - 0.5) * 0.015,
            y: (Math.random() - 0.5) * 0.015,
            z: (Math.random() - 0.5) * 0.012
        });

        const mixed = Math.random() > 0.4 ? color1 : color2;
        particleColors[i * 3]     = mixed.r;
        particleColors[i * 3 + 1] = mixed.g;
        particleColors[i * 3 + 2] = mixed.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particleCoords, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const spriteTexture = new THREE.CanvasTexture(createGlowTexture());
    const particleMaterial = new THREE.PointsMaterial({
        size: 1.25,
        map: spriteTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.NormalBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 3. Dynamic Interconnecting Lines (Citations Web)
    const maxConnections = particleCount * 6;
    const linePositions = new Float32Array(maxConnections * 6);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
        color: colors.lineColor,
        transparent: true,
        opacity: colors.lineOpacity,
        depthWrite: false
    });

    const linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(linesMesh);

    // 4. Floating Scientific Polyhedra (Knowledge Nodes)
    const polyGroup = new THREE.Group();

    const icosahedronGeom = new THREE.IcosahedronGeometry(3.2, 0);
    const octahedronGeom   = new THREE.OctahedronGeometry(2.4, 0);
    const dodecahedronGeom = new THREE.DodecahedronGeometry(2.0, 0);

    const wireMat = new THREE.MeshBasicMaterial({
        color: colors.meshWireframe,
        wireframe: true,
        transparent: true,
        opacity: colors.meshOpacity
    });

    const icosahedron = new THREE.Mesh(icosahedronGeom, wireMat);
    icosahedron.position.set(-18, 6, -8);

    const octahedron = new THREE.Mesh(octahedronGeom, wireMat.clone());
    octahedron.position.set(19, -5, -6);

    const dodecahedron = new THREE.Mesh(dodecahedronGeom, wireMat.clone());
    dodecahedron.position.set(-14, -10, -4);

    polyGroup.add(icosahedron);
    polyGroup.add(octahedron);
    polyGroup.add(dodecahedron);
    scene.add(polyGroup);

    // 5. Mouse Parallax Tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const onPointerMove = (e) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // 6. Responsive Resize
    const onResize = () => {
        if (!canvas) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 7. Animation Loop
    let animationFrameId = null;
    let isRunning = true;
    let clock = new THREE.Clock();

    function renderFrame() {
        if (!isRunning) return;
        animationFrameId = requestAnimationFrame(renderFrame);

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // Camera gentle spring interpolation
        currentMouseX += (targetMouseX - currentMouseX) * 0.04;
        currentMouseY += (targetMouseY - currentMouseY) * 0.04;

        camera.position.x = currentMouseX * 3.5;
        camera.position.y = -currentMouseY * 2.5;
        camera.lookAt(0, 0, 0);

        // Update particle positions
        const posAttr = particleGeometry.attributes.position;
        const positions = posAttr.array;

        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3;
            positions[idx]     += particleVelocities[i].x;
            positions[idx + 1] += particleVelocities[i].y;
            positions[idx + 2] += particleVelocities[i].z;

            // Bounce on boundary
            if (positions[idx] < -28 || positions[idx] > 28) particleVelocities[i].x *= -1;
            if (positions[idx + 1] < -18 || positions[idx + 1] > 18) particleVelocities[i].y *= -1;
            if (positions[idx + 2] < -15 || positions[idx + 2] > 15) particleVelocities[i].z *= -1;
        }
        posAttr.needsUpdate = true;

        // Build dynamic citation line connections
        let lineVertexCount = 0;
        const connectDistance = 7.0;
        const connectDistanceSq = connectDistance * connectDistance;

        for (let i = 0; i < particleCount; i++) {
            const ix = positions[i * 3];
            const iy = positions[i * 3 + 1];
            const iz = positions[i * 3 + 2];

            for (let j = i + 1; j < particleCount; j++) {
                const jx = positions[j * 3];
                const jy = positions[j * 3 + 1];
                const jz = positions[j * 3 + 2];

                const dx = ix - jx;
                const dy = iy - jy;
                const dz = iz - jz;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < connectDistanceSq) {
                    if (lineVertexCount + 6 <= linePositions.length) {
                        linePositions[lineVertexCount++] = ix;
                        linePositions[lineVertexCount++] = iy;
                        linePositions[lineVertexCount++] = iz;
                        linePositions[lineVertexCount++] = jx;
                        linePositions[lineVertexCount++] = jy;
                        linePositions[lineVertexCount++] = jz;
                    }
                }
            }
        }

        lineGeometry.setDrawRange(0, lineVertexCount / 3);
        lineGeometry.attributes.position.needsUpdate = true;

        // Rotate polyhedra
        icosahedron.rotation.x += delta * 0.25;
        icosahedron.rotation.y += delta * 0.35;
        icosahedron.position.y += Math.sin(elapsedTime * 0.8) * 0.008;

        octahedron.rotation.x += delta * 0.3;
        octahedron.rotation.z += delta * 0.2;
        octahedron.position.y += Math.cos(elapsedTime * 0.7) * 0.008;

        dodecahedron.rotation.y += delta * 0.22;
        dodecahedron.rotation.z += delta * 0.18;

        polyGroup.rotation.y = elapsedTime * 0.03;

        renderer.render(scene, camera);
    }

    renderFrame();

    // 8. Public API Controller
    return {
        pause() {
            isRunning = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        },
        resume() {
            if (!isRunning) {
                isRunning = true;
                clock.start();
                renderFrame();
            }
        },
        setTheme(darkTheme) {
            isDark = Boolean(darkTheme);
            colors = getHero3DColors(isDark);

            const c1 = new THREE.Color(colors.particlePrimary);
            const c2 = new THREE.Color(colors.particleSecondary);
            const colAttr = particleGeometry.attributes.color;
            const pColors = colAttr.array;

            for (let i = 0; i < particleCount; i++) {
                const mixed = Math.random() > 0.4 ? c1 : c2;
                pColors[i * 3]     = mixed.r;
                pColors[i * 3 + 1] = mixed.g;
                pColors[i * 3 + 2] = mixed.b;
            }
            colAttr.needsUpdate = true;

            lineMaterial.color.setHex(colors.lineColor);
            lineMaterial.opacity = colors.lineOpacity;

            (polyGroup.children || []).forEach(mesh => {
                if (mesh.material) {
                    mesh.material.color.setHex(colors.meshWireframe);
                    mesh.material.opacity = colors.meshOpacity;
                }
            });
        },
        destroy() {
            this.pause();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('resize', onResize);
            if (particleGeometry) particleGeometry.dispose();
            if (particleMaterial) particleMaterial.dispose();
            if (lineGeometry) lineGeometry.dispose();
            if (lineMaterial) lineMaterial.dispose();
            (polyGroup.children || []).forEach(m => {
                if (m.geometry) m.geometry.dispose();
                if (m.material) m.material.dispose();
            });
            if (renderer) renderer.dispose();
            if (scene && typeof scene.clear === 'function') scene.clear();
        }
    };
}
