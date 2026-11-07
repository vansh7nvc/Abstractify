import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createGlowTexture, getHero3DColors, initHero3D } from '../js/hero-3d.js';

describe('public/js/hero-3d.js (Interactive Three.js Universe)', () => {
    let originalGetContext;

    beforeEach(() => {
        originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
            createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            fillRect: vi.fn()
        }));
    });

    afterEach(() => {
        HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    describe('getHero3DColors', () => {
        it('returns Oxford Navy palette in light mode', () => {
            const colors = getHero3DColors(false);
            expect(colors.particlePrimary).toBe(0x002147);
            expect(colors.particleSecondary).toBe(0x1E40AF);
            expect(colors.lineColor).toBe(0x002147);
            expect(colors.lineOpacity).toBe(0.12);
            expect(colors.meshWireframe).toBe(0x2563EB);
        });

        it('returns Celestial Cyan palette in dark mode', () => {
            const colors = getHero3DColors(true);
            expect(colors.particlePrimary).toBe(0x38BDF8);
            expect(colors.particleSecondary).toBe(0x818CF8);
            expect(colors.lineColor).toBe(0x38BDF8);
            expect(colors.lineOpacity).toBe(0.18);
            expect(colors.meshWireframe).toBe(0x6366F1);
        });
    });

    describe('createGlowTexture', () => {
        it('creates a 64x64 offscreen canvas with radial gradient fallback', () => {
            HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
            const canvas = createGlowTexture();
            expect(canvas).toBeInstanceOf(HTMLCanvasElement);
            expect(canvas.width).toBe(64);
            expect(canvas.height).toBe(64);
        });

        it('populates canvas with radial gradient when 2D context is available', () => {
            const mockGradient = {
                addColorStop: vi.fn()
            };
            const mockCtx = {
                createRadialGradient: vi.fn(() => mockGradient),
                fillRect: vi.fn()
            };
            HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx);

            const canvas = createGlowTexture();
            expect(canvas).toBeInstanceOf(HTMLCanvasElement);
            expect(mockCtx.createRadialGradient).toHaveBeenCalled();
            expect(mockGradient.addColorStop).toHaveBeenCalled();
            expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 64, 64);
        });
    });

    describe('initHero3D', () => {
        let canvas;

        beforeEach(() => {
            canvas = document.createElement('canvas');
            canvas.id = 'test-hero-canvas';
            document.body.appendChild(canvas);
        });

        afterEach(() => {
            document.body.removeChild(canvas);
        });

        it('returns null gracefully when Three.js is undefined', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const result = initHero3D(canvas, { three: null });
            expect(result).toBeNull();
            warnSpy.mockRestore();
        });

        it('returns null when canvas element does not exist', () => {
            function MockScene() {}
            const mockThree = { Scene: MockScene };
            const result = initHero3D('non-existent-canvas', { three: mockThree });
            expect(result).toBeNull();
        });

        it('initializes Three.js scene, camera, renderer, particles and meshes', () => {
            const mockScene = {
                add: vi.fn(),
                remove: vi.fn(),
                children: []
            };

            const mockCamera = {
                position: { z: 28, x: 0, y: 0 },
                aspect: 1,
                updateProjectionMatrix: vi.fn(),
                lookAt: vi.fn()
            };

            const mockRenderer = {
                setSize: vi.fn(),
                setPixelRatio: vi.fn(),
                setClearColor: vi.fn(),
                render: vi.fn(),
                dispose: vi.fn(),
                domElement: canvas
            };

            const mockPointsMaterial = {
                color: { setHex: vi.fn() },
                dispose: vi.fn()
            };

            const mockLineMaterial = {
                color: { setHex: vi.fn() },
                opacity: 0.1,
                dispose: vi.fn()
            };

            const mockMeshMaterial = {
                color: { setHex: vi.fn() },
                opacity: 0.2,
                dispose: vi.fn(),
                clone: function() { return { ...this, color: { setHex: vi.fn() } }; }
            };

            const mockGeometry = {
                setAttribute: vi.fn(),
                setDrawRange: vi.fn(),
                attributes: {
                    position: {
                        needsUpdate: false,
                        array: new Float32Array(300)
                    },
                    color: {
                        needsUpdate: false,
                        array: new Float32Array(300)
                    }
                },
                dispose: vi.fn()
            };

            const mockMesh = {
                position: { set: vi.fn(), x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { set: vi.fn() },
                geometry: mockGeometry,
                material: mockMeshMaterial
            };

            const mockPoints = {
                geometry: mockGeometry,
                material: mockPointsMaterial
            };

            const mockLineSegments = {
                geometry: mockGeometry,
                material: mockLineMaterial
            };

            const mockGroup = {
                children: [],
                add: vi.fn(function(child) {
                    this.children.push(child);
                }),
                rotation: { x: 0, y: 0, z: 0 }
            };

            const mockClock = {
                getDelta: vi.fn(() => 0.016),
                getElapsedTime: vi.fn(() => 1.0),
                start: vi.fn()
            };

            function MockScene() { return mockScene; }
            function MockPerspectiveCamera() { return mockCamera; }
            function MockWebGLRenderer() { return mockRenderer; }
            function MockBufferGeometry() { return mockGeometry; }
            function MockBufferAttribute() { return {}; }
            function MockPointsMaterial() { return mockPointsMaterial; }
            function MockPoints() { return mockPoints; }
            function MockLineBasicMaterial() { return mockLineMaterial; }
            function MockLineSegments() { return mockLineSegments; }
            function MockMeshBasicMaterial() { return mockMeshMaterial; }
            function MockMesh() { return mockMesh; }
            function MockGroup() { return mockGroup; }
            function MockIcosahedronGeometry() { return mockGeometry; }
            function MockOctahedronGeometry() { return mockGeometry; }
            function MockDodecahedronGeometry() { return mockGeometry; }
            function MockCanvasTexture() { return { dispose: vi.fn() }; }
            function MockClock() { return mockClock; }
            function MockColor(val) {
                return {
                    val,
                    r: 0.2,
                    g: 0.5,
                    b: 0.8,
                    setHex: vi.fn()
                };
            }

            const mockTHREE = {
                Scene: MockScene,
                PerspectiveCamera: MockPerspectiveCamera,
                WebGLRenderer: MockWebGLRenderer,
                BufferGeometry: MockBufferGeometry,
                BufferAttribute: MockBufferAttribute,
                PointsMaterial: MockPointsMaterial,
                Points: MockPoints,
                LineBasicMaterial: MockLineBasicMaterial,
                LineSegments: MockLineSegments,
                MeshBasicMaterial: MockMeshBasicMaterial,
                Mesh: MockMesh,
                Group: MockGroup,
                Clock: MockClock,
                IcosahedronGeometry: MockIcosahedronGeometry,
                OctahedronGeometry: MockOctahedronGeometry,
                DodecahedronGeometry: MockDodecahedronGeometry,
                CanvasTexture: MockCanvasTexture,
                Color: MockColor,
                NormalBlending: 1,
                AdditiveBlending: 2
            };

            const controller = initHero3D(canvas, { three: mockTHREE, particleCount: 20 });

            expect(controller).not.toBeNull();
            expect(typeof controller.pause).toBe('function');
            expect(typeof controller.resume).toBe('function');
            expect(typeof controller.setTheme).toBe('function');
            expect(typeof controller.destroy).toBe('function');

            // Verify initial render
            expect(mockRenderer.render).toHaveBeenCalledWith(mockScene, mockCamera);

            // Test theme update
            controller.setTheme(true);
            expect(mockLineMaterial.color.setHex).toHaveBeenCalledWith(0x38BDF8);

            controller.setTheme(false);
            expect(mockLineMaterial.color.setHex).toHaveBeenCalledWith(0x002147);

            // Test pause / resume
            controller.pause();
            controller.resume();
            expect(mockClock.start).toHaveBeenCalled();

            // Test destroy
            controller.destroy();
            expect(mockRenderer.dispose).toHaveBeenCalled();
            expect(mockGeometry.dispose).toHaveBeenCalled();
        });
    });
});
