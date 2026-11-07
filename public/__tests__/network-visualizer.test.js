import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    getNodeThemeColors,
    formatNodeLabel,
    calculateNodeSize,
    createCitationVisualizer,
} from '../js/network-visualizer.js';

describe('public/js/network-visualizer.js (Interactive Citation Visualizer Suite)', () => {
    describe('getNodeThemeColors', () => {
        it('returns golden amber theme for landmark papers', () => {
            const light = getNodeThemeColors(false, 'landmark');
            expect(light.border).toBe('#D97706');
            expect(light.background).toBe('#FEF3C7');
            expect(light.particleColor).toBe('#F59E0B');

            const dark = getNodeThemeColors(true, 'landmark');
            expect(dark.border).toBe('#F59E0B');
            expect(dark.background).toBe('#78350F');
        });

        it('returns royal indigo theme for focus study papers', () => {
            const light = getNodeThemeColors(false, 'focus');
            expect(light.border).toBe('#4F46E5');
            expect(light.background).toBe('#EEF2FF');

            const dark = getNodeThemeColors(true, 'focus');
            expect(dark.border).toBe('#818CF8');
            expect(dark.background).toBe('#1E1B4B');
        });

        it('returns deep violet theme for foundational works', () => {
            const light = getNodeThemeColors(false, 'foundation');
            expect(light.border).toBe('#7C3AED');
            expect(light.background).toBe('#F3E8FF');

            const dark = getNodeThemeColors(true, 'foundation');
            expect(dark.border).toBe('#A78BFA');
        });

        it('returns emerald mint theme for recent breakthroughs', () => {
            const light = getNodeThemeColors(false, 'recent');
            expect(light.border).toBe('#059669');
            expect(light.background).toBe('#ECFDF5');

            const dark = getNodeThemeColors(true, 'recent');
            expect(dark.border).toBe('#34D399');
        });

        it('returns sky blue theme for co-cited external literature', () => {
            const light = getNodeThemeColors(false, 'cocitation');
            expect(light.border).toBe('#0284C7');

            const dark = getNodeThemeColors(true, 'cocitation');
            expect(dark.border).toBe('#38BDF8');
        });

        it('returns default slate theme for standard publications', () => {
            const light = getNodeThemeColors(false, 'standard');
            expect(light.border).toBe('#94A3B8');

            const dark = getNodeThemeColors(true, 'standard');
            expect(dark.border).toBe('#64748B');
        });
    });

    describe('formatNodeLabel', () => {
        it('returns question mark when title is empty or falsy', () => {
            expect(formatNodeLabel('')).toBe('?');
            expect(formatNodeLabel(null)).toBe('?');
        });

        it('wraps short titles cleanly with year and citation chip', () => {
            const label = formatNodeLabel('Attention Is All You Need', 2017, 105000);
            expect(label).toContain('Attention Is All');
            expect(label).toContain('[2017 • 105000 cit]');
        });

        it('wraps long titles across multiple lines with ellipsis', () => {
            const longTitle = 'Deep Reinforcement Learning from Human Preferences and Scalable AI Safety Alignment';
            const label = formatNodeLabel(longTitle, 2023, 450, 20);
            const lines = label.split('\n');
            expect(lines.length).toBeGreaterThanOrEqual(3);
            expect(label).toContain('[2023 • 450 cit]');
        });
    });

    describe('calculateNodeSize', () => {
        it('returns minimum size of 14 for 0 or negative citations', () => {
            expect(calculateNodeSize(0)).toBe(14);
            expect(calculateNodeSize(-5)).toBe(14);
        });

        it('scales logarithmically with citations count', () => {
            const size9 = calculateNodeSize(9); // log10(10) = 1 -> 14 + 10 = 24
            expect(size9).toBe(24);

            const size99 = calculateNodeSize(99); // log10(100) = 2 -> 14 + 20 = 34
            expect(size99).toBe(34);
        });

        it('clamps maximum size at 36px', () => {
            expect(calculateNodeSize(50000)).toBe(36);
        });
    });

    describe('createCitationVisualizer', () => {
        let container;
        let statsBadge;
        let mockVisNetwork;
        let eventHandlers;

        beforeEach(() => {
            container = document.createElement('div');
            container.id = 'network-container';
            document.body.appendChild(container);

            statsBadge = document.createElement('span');
            statsBadge.id = 'network-stats-badge';
            document.body.appendChild(statsBadge);

            eventHandlers = {};

            mockVisNetwork = {
                on: vi.fn((event, handler) => {
                    eventHandlers[event] = handler;
                }),
                setOptions: vi.fn(),
                fit: vi.fn(),
                focus: vi.fn(),
                moveTo: vi.fn(),
                getScale: vi.fn(() => 1.0),
                getPositions: vi.fn(() => ({
                    'paper-1': { x: 0, y: 0 },
                    'paper-2': { x: 100, y: 100 },
                    'paper-3': { x: 50, y: 50 },
                })),
                getConnectedNodes: vi.fn(() => ['paper-2']),
                getConnectedEdges: vi.fn(() => ['paper-1->paper-2']),
                redraw: vi.fn(),
                destroy: vi.fn(),
            };

            class MockDataSet {
                constructor(items) {
                    this.items = items;
                    this.update = vi.fn();
                }
            }

            class MockNetwork {
                constructor() {
                    return mockVisNetwork;
                }
            }

            global.vis = {
                DataSet: MockDataSet,
                Network: MockNetwork,
            };
        });

        afterEach(() => {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
            if (statsBadge && statsBadge.parentNode) {
                statsBadge.parentNode.removeChild(statsBadge);
            }
            vi.clearAllMocks();
        });

        it('returns null if container is missing', () => {
            expect(createCitationVisualizer(null)).toBeNull();
        });

        it('renders empty notice when graphData has no nodes', () => {
            const visualizer = createCitationVisualizer(container);
            visualizer.setData(null);
            expect(container.textContent).toContain('No citation lineage data available');

            visualizer.setData({ nodes: [] });
            expect(container.textContent).toContain('No citation lineage data available');
            visualizer.destroy();
        });

        it('initializes overlay UI controls, inspector HUD, and stats badge', () => {
            const visualizer = createCitationVisualizer(container);
            expect(visualizer).toBeDefined();

            const graphData = {
                nodes: [
                    {
                        id: 'paper-1',
                        title: 'Foundational RLHF',
                        authors: ['Paul Christiano', 'Jan Leike', 'Dario Amodei', 'Tom Brown'],
                        year: 2017,
                        citations: 2500,
                        nodeType: 'landmark',
                        venue: 'NeurIPS',
                        abstract: 'We explore training neural networks using human feedback.',
                        doi: '10.48550/arXiv.1706.03741',
                    },
                    {
                        id: 'paper-2',
                        title: 'Modern Direct Preference Optimization',
                        authors: ['Rafael Rafailov'],
                        year: 2023,
                        citations: 800,
                        nodeType: 'recent',
                    },
                ],
                edges: [{ source: 'paper-1', target: 'paper-2', type: 'citation', weight: 1.0 }],
            };

            visualizer.setData(graphData);

            expect(container.querySelector('.network-controls-overlay')).not.toBeNull();
            expect(container.querySelector('.network-inspector-hud')).not.toBeNull();
            expect(container.querySelector('#network-search-input')).not.toBeNull();
            expect(container.querySelector('#net-ctrl-physics')).not.toBeNull();
            expect(statsBadge.textContent).toContain('2 Papers • 1 Citation Links');

            visualizer.destroy();
        });

        it('switches layout modes between organic, timeline, and radial via buttons and API', () => {
            const visualizer = createCitationVisualizer(container);
            const graphData = {
                nodes: [
                    { id: 'p1', title: 'Paper 1', year: 2018, citations: 100, nodeType: 'foundation' },
                    { id: 'p2', title: 'Paper 2', year: 2024, citations: 20, nodeType: 'recent' },
                ],
                edges: [{ source: 'p1', target: 'p2', type: 'lineage' }],
            };
            visualizer.setData(graphData);

            // Test layout buttons in overlay
            const timelineBtn = container.querySelector('button[data-layout="timeline"]');
            timelineBtn.click();
            expect(mockVisNetwork.setOptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    layout: expect.objectContaining({
                        hierarchical: expect.objectContaining({ enabled: true, direction: 'LR' }),
                    }),
                })
            );

            const radialBtn = container.querySelector('button[data-layout="radial"]');
            radialBtn.click();
            expect(mockVisNetwork.setOptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    physics: expect.objectContaining({
                        solver: 'forceAtlas2Based',
                    }),
                })
            );

            const organicBtn = container.querySelector('button[data-layout="organic"]');
            organicBtn.click();
            expect(mockVisNetwork.setOptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    physics: expect.objectContaining({
                        solver: 'barnesHut',
                    }),
                })
            );

            visualizer.destroy();
        });

        it('triggers overlay zoom, fit, and physics buttons', () => {
            const visualizer = createCitationVisualizer(container);
            const graphData = {
                nodes: [{ id: 'p1', title: 'Paper 1', year: 2020, citations: 50, nodeType: 'landmark' }],
                edges: [],
            };
            visualizer.setData(graphData);

            // Physics pause and resume
            const physicsBtn = container.querySelector('#net-ctrl-physics');
            physicsBtn.click(); // pause
            expect(mockVisNetwork.setOptions).toHaveBeenCalledWith({ physics: { enabled: false } });
            physicsBtn.click(); // resume
            expect(mockVisNetwork.setOptions).toHaveBeenCalledWith({ physics: { enabled: true } });

            // Zoom in
            const zoomInBtn = container.querySelector('#net-ctrl-zoom-in');
            zoomInBtn.click();
            expect(mockVisNetwork.moveTo).toHaveBeenCalledWith(expect.objectContaining({ scale: 1.3 }));

            // Zoom out
            const zoomOutBtn = container.querySelector('#net-ctrl-zoom-out');
            zoomOutBtn.click();
            expect(mockVisNetwork.moveTo).toHaveBeenCalledWith(expect.objectContaining({ scale: 0.75 }));

            // Fit screen
            const fitBtn = container.querySelector('#net-ctrl-fit');
            fitBtn.click();
            expect(mockVisNetwork.fit).toHaveBeenCalled();

            visualizer.destroy();
        });

        it('filters nodes dynamically through the search input', () => {
            const visualizer = createCitationVisualizer(container);
            const graphData = {
                nodes: [
                    { id: 'p1', title: 'Deep Reinforcement Learning', authors: ['Paul'], year: 2020, citations: 50, nodeType: 'standard' },
                    { id: 'p2', title: 'Convolutional Networks', authors: ['Yann'], year: 2019, citations: 200, nodeType: 'landmark' },
                ],
                edges: [],
            };
            visualizer.setData(graphData);

            const searchInput = container.querySelector('#network-search-input');
            searchInput.value = 'convolutional';
            searchInput.dispatchEvent(new Event('input'));

            expect(mockVisNetwork.focus).toHaveBeenCalledWith('p2', expect.any(Object));

            // Empty search clears spotlight
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));

            visualizer.destroy();
        });

        it('handles hover, blur, and click network events and HUD interactions', () => {
            const onNodeClick = vi.fn();
            const visualizer = createCitationVisualizer(container, { onNodeClick });
            const graphData = {
                nodes: [
                    { id: 'p1', title: 'Paper 1', year: 2020, citations: 100, nodeType: 'landmark', doi: '10.1000/182' },
                    { id: 'p2', title: 'Paper 2', year: 2021, citations: 10, nodeType: 'standard' },
                ],
                edges: [{ source: 'p1', target: 'p2' }],
            };
            visualizer.setData(graphData);

            // Hover node
            eventHandlers.hoverNode({ node: 'p1' });
            const hud = container.querySelector('.network-inspector-hud');
            expect(hud.textContent).toContain('Paper 1');

            // Blur node
            eventHandlers.blurNode();

            // Click node
            eventHandlers.click({ nodes: ['p1'] });
            expect(onNodeClick).toHaveBeenCalled();

            // HUD Focus button click
            const hudFocusBtn = hud.querySelector('#hud-focus-btn');
            hudFocusBtn.click();
            expect(mockVisNetwork.focus).toHaveBeenCalledWith('p1', expect.any(Object));

            // HUD Close button click
            const hudCloseBtn = hud.querySelector('#hud-close-btn');
            hudCloseBtn.click();

            // Click canvas empty space
            eventHandlers.click({ nodes: [] });

            visualizer.destroy();
        });

        it('renders kinetic animation frames including pulsing halos and particle flow', () => {
            const visualizer = createCitationVisualizer(container);
            const graphData = {
                nodes: [
                    { id: 'p1', title: 'Paper 1', year: 2020, citations: 100, nodeType: 'landmark' },
                    { id: 'p2', title: 'Paper 2', year: 2022, citations: 10, nodeType: 'focus' },
                ],
                edges: [{ source: 'p1', target: 'p2', weight: 0.9, type: 'citation' }],
            };
            visualizer.setData(graphData);

            const mockGradient = { addColorStop: vi.fn() };
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                arc: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                createRadialGradient: vi.fn(() => mockGradient),
                setLineDash: vi.fn(),
            };

            // Call afterDrawing hook
            expect(eventHandlers.afterDrawing).toBeDefined();
            eventHandlers.afterDrawing(mockCtx);

            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();

            visualizer.destroy();
        });

        it('filters nodes by role pill and toggles selection', () => {
            const visualizer = createCitationVisualizer(container);
            const graphData = {
                nodes: [
                    { id: 'p1', title: 'Paper 1', year: 2018, citations: 100, nodeType: 'landmark' },
                    { id: 'p2', title: 'Paper 2', year: 2024, citations: 20, nodeType: 'recent' },
                ],
                edges: [],
            };
            visualizer.setData(graphData);

            // Select landmark
            visualizer.filterByRole('landmark');
            // Toggle off
            visualizer.filterByRole('landmark');

            visualizer.destroy();
        });
    });
});
