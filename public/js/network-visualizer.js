/**
 * AbstractiFy Interactive Citation Network Visualizer & Kinetic Motion Suite
 * Powers interactive force-directed graph, chronological DAG timeline,
 * flowing citation energy particles, pulsing halos, and glassmorphic HUD inspector.
 */

/**
 * @typedef {'landmark' | 'focus' | 'foundation' | 'recent' | 'cocitation' | 'standard'} NodeRole
 */

/**
 * Returns color palette configuration based on theme and role.
 * @param {boolean} isDark
 * @param {NodeRole} role
 */
export function getNodeThemeColors(isDark, role) {
    switch (role) {
        case 'landmark':
            return {
                background: isDark ? '#78350F' : '#FEF3C7',
                border: isDark ? '#F59E0B' : '#D97706',
                highlight: { background: isDark ? '#B45309' : '#FDE68A', border: '#F59E0B' },
                hover: { background: isDark ? '#92400E' : '#FDE68A', border: '#F59E0B' },
                particleColor: '#F59E0B',
                haloColor: 'rgba(245, 158, 11, 0.45)',
            };
        case 'focus':
            return {
                background: isDark ? '#1E1B4B' : '#EEF2FF',
                border: isDark ? '#818CF8' : '#4F46E5',
                highlight: { background: isDark ? '#312E81' : '#E0E7FF', border: '#6366F1' },
                hover: { background: isDark ? '#312E81' : '#E0E7FF', border: '#6366F1' },
                particleColor: '#6366F1',
                haloColor: 'rgba(99, 102, 241, 0.45)',
            };
        case 'foundation':
            return {
                background: isDark ? '#2E1065' : '#F3E8FF',
                border: isDark ? '#A78BFA' : '#7C3AED',
                highlight: { background: isDark ? '#4C1D95' : '#E9D5FF', border: '#8B5CF6' },
                hover: { background: isDark ? '#4C1D95' : '#E9D5FF', border: '#8B5CF6' },
                particleColor: '#8B5CF6',
                haloColor: 'rgba(139, 92, 246, 0.4)',
            };
        case 'recent':
            return {
                background: isDark ? '#064E3B' : '#ECFDF5',
                border: isDark ? '#34D399' : '#059669',
                highlight: { background: isDark ? '#065F46' : '#D1FAE5', border: '#10B981' },
                hover: { background: isDark ? '#065F46' : '#D1FAE5', border: '#10B981' },
                particleColor: '#10B981',
                haloColor: 'rgba(16, 185, 129, 0.4)',
            };
        case 'cocitation':
            return {
                background: isDark ? '#082F49' : '#F0F9FF',
                border: isDark ? '#38BDF8' : '#0284C7',
                highlight: { background: isDark ? '#0C4A6E' : '#E0F2FE', border: '#0EA5E9' },
                hover: { background: isDark ? '#0C4A6E' : '#E0F2FE', border: '#0EA5E9' },
                particleColor: '#0EA5E9',
                haloColor: 'rgba(14, 165, 233, 0.4)',
            };
        case 'standard':
        default:
            return {
                background: isDark ? '#1E293B' : '#F8FAFC',
                border: isDark ? '#64748B' : '#94A3B8',
                highlight: {
                    background: isDark ? '#334155' : '#E2E8F0',
                    border: isDark ? '#38BDF8' : '#002147',
                },
                hover: {
                    background: isDark ? '#334155' : '#E2E8F0',
                    border: isDark ? '#38BDF8' : '#002147',
                },
                particleColor: isDark ? '#38BDF8' : '#0284C7',
                haloColor: 'rgba(56, 189, 248, 0.35)',
            };
    }
}

/**
 * Formats a paper title for multi-line display with year/citations chip.
 * @param {string} title
 * @param {number} [year]
 * @param {number} [citations]
 * @param {number} [maxCharsPerLine=22]
 */
export function formatNodeLabel(title, year, citations, maxCharsPerLine = 22) {
    if (!title) return '?';
    const words = title.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const w of words) {
        if ((currentLine + ' ' + w).trim().length <= maxCharsPerLine) {
            currentLine = (currentLine + ' ' + w).trim();
        } else {
            if (lines.length >= 2) {
                currentLine += '...';
                break;
            }
            if (currentLine) lines.push(currentLine);
            currentLine = w;
        }
    }
    if (currentLine && lines.length < 3) {
        lines.push(currentLine);
    }

    const badge = `\n[${year || 'N/A'} • ${citations || 0} cit]`;
    return lines.join('\n') + badge;
}

/**
 * Calculates node radius based on log-citations.
 * @param {number} citations
 */
export function calculateNodeSize(citations) {
    const cit = Math.max(0, citations || 0);
    // Logarithmic scale: 14px min, 36px max
    return Math.min(36, Math.max(14, 14 + Math.round(10 * Math.log10(cit + 1))));
}

/**
 * Synthesizes client-side citation network graph data from paper objects.
 * Guarantees a connected DAG topology with landmark, foundation, and recent nodes.
 * @param {Array<Object>} papers
 * @returns {{ nodes: Array<Object>, edges: Array<Object> }}
 */
export function synthesizeClientNetworkData(papers) {
    if (!papers || papers.length === 0) {
        return { nodes: [], edges: [] };
    }

    const currentYear = new Date().getFullYear();
    const years = papers.map((p) => p.year || currentYear).filter((y) => y > 1950);
    const minYear = years.length > 0 ? Math.min(...years) : 2020;
    const maxYear = years.length > 0 ? Math.max(...years) : currentYear;
    const maxCitations = Math.max(...papers.map((p) => p.citations || p.citationCount || 0), 0);

    const nodes = papers.map((p, index) => {
        const citations = p.citations || p.citationCount || 0;
        const year = p.year || 2020;
        let nodeType = 'standard';

        if (index === 0) {
            nodeType = 'focus';
        } else if (citations > 0 && citations === maxCitations && citations >= 20) {
            nodeType = 'landmark';
        } else if (year <= minYear + 1 && citations > 5) {
            nodeType = 'foundation';
        } else if (year >= maxYear - 1) {
            nodeType = 'recent';
        }

        const authorNames = Array.isArray(p.authors)
            ? p.authors.map((a) => (typeof a === 'string' ? a : a.name || 'Unknown'))
            : [];

        return {
            id: String(p.id),
            title: p.title || 'Untitled Publication',
            authors: authorNames,
            citations,
            year,
            doi: p.doi,
            venue: p.venue || p.journal || 'Academic Publication',
            abstract: p.abstract ? p.abstract.substring(0, 280) + '...' : undefined,
            nodeType,
        };
    });

    if (maxCitations > 15 && !nodes.some((n) => n.nodeType === 'landmark')) {
        const candidates = nodes.filter((n) => n.nodeType !== 'focus');
        if (candidates.length > 0) {
            const nextHighest = candidates.reduce(
                (max, n) => (n.citations > max.citations ? n : max),
                candidates[0],
            );
            if (nextHighest && nextHighest.citations >= 10) {
                nextHighest.nodeType = 'landmark';
            }
        }
    }

    // Connect chronological DAG lineage
    const edges = [];
    const edgeMap = new Set();
    const sorted = [...nodes].sort((a, b) => a.year - b.year || b.citations - a.citations);

    for (let i = 0; i < sorted.length; i++) {
        const src = sorted[i];
        for (let j = i + 1; j < sorted.length; j++) {
            const tgt = sorted[j];
            const key = `${src.id}->${tgt.id}`;
            const reverseKey = `${tgt.id}->${src.id}`;
            if (edgeMap.has(key) || edgeMap.has(reverseKey)) continue;

            const isLandmark =
                src.nodeType === 'landmark' ||
                src.nodeType === 'foundation' ||
                src.nodeType === 'focus';
            if (j <= i + 2 || isLandmark) {
                edgeMap.add(key);
                edges.push({
                    source: src.id,
                    target: tgt.id,
                    type: 'lineage',
                    weight: isLandmark ? 0.9 : 0.6,
                });
            }
        }
    }

    // Ensure all nodes are connected
    const connected = new Set();
    edges.forEach((e) => {
        connected.add(e.source);
        connected.add(e.target);
    });

    nodes.forEach((n) => {
        if (!connected.has(n.id) && nodes.length > 1) {
            const parent =
                nodes.find(
                    (p) => p.id !== n.id && (p.nodeType === 'landmark' || p.year <= n.year),
                ) || nodes[0];
            if (parent && parent.id !== n.id) {
                const key = `${parent.id}->${n.id}`;
                if (!edgeMap.has(key)) {
                    edgeMap.add(key);
                    edges.push({
                        source: parent.id,
                        target: n.id,
                        type: 'lineage',
                        weight: 0.5,
                    });
                    connected.add(n.id);
                }
            }
        }
    });

    const inDegreeMap = {};
    const outDegreeMap = {};
    edges.forEach((e) => {
        outDegreeMap[e.source] = (outDegreeMap[e.source] || 0) + 1;
        inDegreeMap[e.target] = (inDegreeMap[e.target] || 0) + 1;
    });

    nodes.forEach((n) => {
        n.inDegree = inDegreeMap[n.id] || 0;
        n.outDegree = outDegreeMap[n.id] || 0;
    });

    return { nodes, edges };
}

/**
 * Creates and manages an interactive, kinetic Citation Network visualizer.
 * @param {HTMLElement} container
 * @param {Object} [options]
 */
export function createCitationVisualizer(container, options = {}) {
    if (!container) return null;

    let network = null;
    let nodesDataSet = null;
    let edgesDataSet = null;
    let rawGraphData = { nodes: [], edges: [] };
    let rawPapers = [];
    let animationFrameId = null;
    let isPhysicsRunning = true;
    let currentLayout = 'organic'; // 'organic' | 'timeline' | 'radial'
    let selectedNodeId = null;
    let hoveredNodeId = null;
    let particles = [];
    let isDestroyed = false;
    let layoutTimeoutId = null;

    // HUD Elements
    let controlsOverlay = null;
    let inspectorHud = null;
    let activeFilter = 'all';

    const isDarkMode = () =>
        (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';

    /**
     * Initializes the overlay UI controls inside container.
     */
    function initOverlayUI() {
        // Remove any prior overlays
        const oldControls = container.querySelector('.network-controls-overlay');
        if (oldControls) oldControls.remove();
        const oldHud = container.querySelector('.network-inspector-hud');
        if (oldHud) oldHud.remove();

        // Build controls overlay
        controlsOverlay = document.createElement('div');
        controlsOverlay.className =
            'network-controls-overlay absolute top-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none';

        controlsOverlay.innerHTML = `
            <div class="flex items-center gap-1.5 bg-surface/90 dark:bg-surface/90 backdrop-blur-md border border-outline rounded-lg p-1 shadow-sm pointer-events-auto">
                <button type="button" data-layout="organic" class="layout-btn text-[11px] font-mono px-2.5 py-1 rounded transition-colors bg-primary text-white font-semibold flex items-center gap-1" title="Organic Force Layout">
                    <span class="material-symbols-outlined text-[13px]">hub</span>
                    <span>Organic</span>
                </button>
                <button type="button" data-layout="timeline" class="layout-btn text-[11px] font-mono px-2.5 py-1 rounded transition-colors text-secondary hover:text-primary hover:bg-surface-muted flex items-center gap-1" title="Chronological Timeline DAG">
                    <span class="material-symbols-outlined text-[13px]">timeline</span>
                    <span>Timeline</span>
                </button>
                <button type="button" data-layout="radial" class="layout-btn text-[11px] font-mono px-2.5 py-1 rounded transition-colors text-secondary hover:text-primary hover:bg-surface-muted flex items-center gap-1" title="Radial Impact Layout">
                    <span class="material-symbols-outlined text-[13px]">radar</span>
                    <span>Radial</span>
                </button>
            </div>

            <div class="flex items-center gap-1.5 pointer-events-auto">
                <div class="relative hidden sm:block">
                    <input type="text" id="network-search-input" placeholder="Filter papers in graph..." class="text-xs font-mono py-1 px-2.5 pl-7 bg-surface/90 dark:bg-surface/90 backdrop-blur-md border border-outline rounded-lg text-primary placeholder-secondary-muted focus:outline-none focus:ring-1 focus:ring-primary w-44 transition-all" />
                    <span class="material-symbols-outlined absolute left-2 top-1.5 text-xs text-secondary-muted pointer-events-none">search</span>
                </div>
                <div class="flex items-center bg-surface/90 dark:bg-surface/90 backdrop-blur-md border border-outline rounded-lg p-1 shadow-sm">
                    <button type="button" id="net-ctrl-physics" class="p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted" title="Pause / Resume Physics Simulation">
                        <span class="material-symbols-outlined text-sm">pause</span>
                    </button>
                    <button type="button" id="net-ctrl-zoom-in" class="p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted" title="Zoom In">
                        <span class="material-symbols-outlined text-sm">add</span>
                    </button>
                    <button type="button" id="net-ctrl-zoom-out" class="p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted" title="Zoom Out">
                        <span class="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <button type="button" id="net-ctrl-fit" class="p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted" title="Fit Entire Network to Screen">
                        <span class="material-symbols-outlined text-sm">fit_screen</span>
                    </button>
                    <button type="button" id="net-ctrl-landmark" class="p-1 rounded text-secondary hover:text-primary hover:bg-surface-muted" title="Center on Landmark Paper">
                        <span class="material-symbols-outlined text-sm text-amber-500">star</span>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(controlsOverlay);

        // Build floating HUD inspector
        inspectorHud = document.createElement('div');
        inspectorHud.className =
            'network-inspector-hud absolute bottom-3 right-3 max-w-sm w-full bg-surface/95 dark:bg-surface/95 backdrop-blur-lg border border-outline rounded-xl p-4 shadow-xl z-20 pointer-events-auto transition-all duration-300 opacity-0 translate-y-3 pointer-events-none';
        container.appendChild(inspectorHud);

        // Bind overlay controls
        bindOverlayEvents();
    }

    /**
     * Attaches interactive listeners to overlay controls.
     */
    function bindOverlayEvents() {
        if (!controlsOverlay) return;

        // Layout buttons
        const layoutBtns = controlsOverlay.querySelectorAll('.layout-btn');
        layoutBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const layout = btn.getAttribute('data-layout');
                if (layout && layout !== currentLayout) {
                    layoutBtns.forEach((b) => {
                        b.classList.remove('bg-primary', 'text-white', 'font-semibold');
                        b.classList.add('text-secondary');
                    });
                    btn.classList.add('bg-primary', 'text-white', 'font-semibold');
                    btn.classList.remove('text-secondary');
                    applyLayoutMode(layout);
                }
            });
        });

        // Search input
        const searchInput = controlsOverlay.querySelector('#network-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.trim().toLowerCase();
                filterBySearchTerm(term);
            });
        }

        // Camera & Physics controls
        const physicsBtn = controlsOverlay.querySelector('#net-ctrl-physics');
        if (physicsBtn) {
            physicsBtn.addEventListener('click', () => {
                isPhysicsRunning = !isPhysicsRunning;
                if (network) {
                    network.setOptions({ physics: { enabled: isPhysicsRunning } });
                }
                const icon = physicsBtn.querySelector('span');
                if (icon) icon.textContent = isPhysicsRunning ? 'pause' : 'play_arrow';
            });
        }

        const zoomInBtn = controlsOverlay.querySelector('#net-ctrl-zoom-in');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                if (!network) return;
                const scale = network.getScale();
                network.moveTo({ scale: scale * 1.3, animation: { duration: 300 } });
            });
        }

        const zoomOutBtn = controlsOverlay.querySelector('#net-ctrl-zoom-out');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                if (!network) return;
                const scale = network.getScale();
                network.moveTo({ scale: scale * 0.75, animation: { duration: 300 } });
            });
        }

        const fitBtn = controlsOverlay.querySelector('#net-ctrl-fit');
        if (fitBtn) {
            fitBtn.addEventListener('click', () => {
                if (!network) return;
                network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
            });
        }

        const landmarkBtn = controlsOverlay.querySelector('#net-ctrl-landmark');
        if (landmarkBtn) {
            landmarkBtn.addEventListener('click', () => {
                focusLandmarkNode();
            });
        }
    }

    /**
     * Initializes edge particle stream data.
     */
    function initParticles(edges) {
        particles = [];
        if (!edges || edges.length === 0) return;

        edges.forEach((edge, idx) => {
            // 1 to 2 particles per edge
            const count = edge.weight && edge.weight > 0.8 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                particles.push({
                    edgeId: `${edge.source}->${edge.target}`,
                    source: edge.source,
                    target: edge.target,
                    progress: (i / count + Math.random() * 0.3) % 1.0,
                    speed: 0.006 + Math.random() * 0.004,
                    size: 2.2 + Math.random() * 1.2,
                    color: edge.type === 'citation' ? '#F59E0B' : '#38BDF8',
                });
            }
        });
    }

    /**
     * Renders kinetic particle animation and pulsing halos on the canvas.
     */
    function renderKineticFrame(ctx) {
        if (!network || isDestroyed) return;

        const dark = isDarkMode();
        const now = Date.now();
        const positions = network.getPositions();

        // 1. Draw Pulsing Halos around Landmark and Focus Nodes
        rawGraphData.nodes.forEach((node) => {
            const pos = positions[node.id];
            if (!pos) return;

            const isFocus = node.id === selectedNodeId || node.nodeType === 'focus';
            const isLandmark = node.nodeType === 'landmark';

            if (isLandmark || isFocus) {
                const baseRadius = calculateNodeSize(node.citations);
                const pulse = Math.sin(now * 0.0035 + (isLandmark ? 0 : Math.PI)) * 5;
                const haloRadius = baseRadius + 6 + pulse;

                ctx.save();
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, haloRadius, 0, Math.PI * 2);

                if (isLandmark) {
                    ctx.strokeStyle = dark ? 'rgba(245, 158, 11, 0.45)' : 'rgba(217, 119, 6, 0.4)';
                    ctx.lineWidth = 2.2;
                    ctx.stroke();

                    // Subtle golden background aura
                    const glowGrad = ctx.createRadialGradient(
                        pos.x,
                        pos.y,
                        baseRadius * 0.5,
                        pos.x,
                        pos.y,
                        haloRadius,
                    );
                    glowGrad.addColorStop(
                        0,
                        dark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(254, 243, 199, 0.35)',
                    );
                    glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
                    ctx.fillStyle = glowGrad;
                    ctx.fill();
                } else if (isFocus) {
                    ctx.strokeStyle = dark ? 'rgba(56, 189, 248, 0.6)' : 'rgba(79, 70, 229, 0.5)';
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([4, 4]);
                    ctx.stroke();
                }
                ctx.restore();
            }
        });

        // 2. Draw Directed Citation Energy Particles
        if (particles.length > 0) {
            ctx.save();
            particles.forEach((p) => {
                const srcPos = positions[p.source];
                const tgtPos = positions[p.target];
                if (!srcPos || !tgtPos) return;

                // Advance progress
                p.progress = (p.progress + p.speed) % 1.0;

                // Quadratic Bézier curve approximation for curved edge
                const dx = tgtPos.x - srcPos.x;
                const dy = tgtPos.y - srcPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 5) return;

                const normalX = -dy / dist;
                const normalY = dx / dist;
                const curvature = 0.18;
                const ctrlX = (srcPos.x + tgtPos.x) / 2 + normalX * dist * curvature;
                const ctrlY = (srcPos.y + tgtPos.y) / 2 + normalY * dist * curvature;

                const t = p.progress;
                const px =
                    (1 - t) * (1 - t) * srcPos.x + 2 * (1 - t) * t * ctrlX + t * t * tgtPos.x;
                const py =
                    (1 - t) * (1 - t) * srcPos.y + 2 * (1 - t) * t * ctrlY + t * t * tgtPos.y;

                // Particle glow
                const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 2.2);
                const color = dark ? '#38BDF8' : '#0284C7';
                grad.addColorStop(0, '#FFFFFF');
                grad.addColorStop(0.35, color);
                grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(px, py, p.size * 2.2, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }
    }

    /**
     * Starts the 60fps kinetic drawing loop.
     */
    function startAnimationLoop() {
        stopAnimationLoop();

        const tick = () => {
            if (isDestroyed) return;
            if (network && document.visibilityState === 'visible') {
                network.redraw();
            }
            animationFrameId = requestAnimationFrame(tick);
        };
        animationFrameId = requestAnimationFrame(tick);
    }

    function stopAnimationLoop() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    /**
     * Applies the layout mode (organic, chronological timeline, or radial).
     */
    function applyLayoutMode(mode) {
        if (!network || !nodesDataSet) return;
        currentLayout = mode;

        if (mode === 'timeline') {
            // Calculate chronological years
            const years = rawGraphData.nodes.map((n) => n.year || 2020);
            const minYear = Math.min(...years);

            // Update node levels based on year
            const nodeUpdates = rawGraphData.nodes.map((n) => ({
                id: n.id,
                level: Math.max(0, (n.year || 2020) - minYear),
            }));
            nodesDataSet.update(nodeUpdates);

            network.setOptions({
                layout: {
                    hierarchical: {
                        enabled: true,
                        direction: 'LR',
                        sortMethod: 'directed',
                        levelSeparation: 190,
                        nodeSpacing: 110,
                        treeSpacing: 120,
                    },
                },
                physics: {
                    hierarchicalRepulsion: {
                        nodeDistance: 130,
                    },
                },
            });
        } else if (mode === 'radial') {
            network.setOptions({
                layout: { hierarchical: { enabled: false } },
                physics: {
                    enabled: true,
                    solver: 'forceAtlas2Based',
                    forceAtlas2Based: {
                        gravitationalConstant: -120,
                        centralGravity: 0.08,
                        springLength: 120,
                        springConstant: 0.05,
                        damping: 0.6,
                    },
                },
            });
        } else {
            // Default: Organic Force
            network.setOptions({
                layout: { hierarchical: { enabled: false } },
                physics: {
                    enabled: true,
                    solver: 'barnesHut',
                    barnesHut: {
                        gravitationalConstant: -2800,
                        centralGravity: 0.28,
                        springLength: 100,
                        springConstant: 0.04,
                        damping: 0.09,
                    },
                },
            });
        }

        if (layoutTimeoutId) {
            clearTimeout(layoutTimeoutId);
        }
        layoutTimeoutId = setTimeout(() => {
            if (!isDestroyed && network) {
                network.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
            }
        }, 50);
    }

    /**
     * Highlights subgraph for a specific node, dimming unlinked nodes.
     */
    function spotlightNodeSubgraph(nodeId) {
        if (!network || !nodesDataSet || !edgesDataSet) return;

        if (!nodeId) {
            // Restore default opacities
            const dark = isDarkMode();
            const resetNodes = rawGraphData.nodes.map((n) => {
                const colors = getNodeThemeColors(dark, n.nodeType);
                return {
                    id: n.id,
                    opacity: 1.0,
                    color: {
                        background: colors.background,
                        border: colors.border,
                        hover: colors.hover,
                        highlight: colors.highlight,
                    },
                    font: { color: dark ? '#F8FAFC' : '#1A1A1A' },
                };
            });
            const resetEdges = rawGraphData.edges.map((e) => ({
                id: `${e.source}->${e.target}`,
                color: { color: dark ? '#475569' : '#CBD5E1', opacity: 0.8 },
                width: 1.5,
            }));

            nodesDataSet.update(resetNodes);
            edgesDataSet.update(resetEdges);
            return;
        }

        const dark = isDarkMode();
        const connectedNodes = new Set(network.getConnectedNodes(nodeId));
        connectedNodes.add(nodeId);
        const connectedEdges = new Set(network.getConnectedEdges(nodeId));

        const nodeUpdates = rawGraphData.nodes.map((n) => {
            const isConnected = connectedNodes.has(n.id);
            const colors = getNodeThemeColors(dark, n.nodeType);
            return {
                id: n.id,
                opacity: isConnected ? 1.0 : 0.18,
                color: {
                    background: isConnected ? colors.background : dark ? '#0F172A' : '#F1F5F9',
                    border: isConnected ? colors.border : dark ? '#1E293B' : '#E2E8F0',
                },
                font: {
                    color: isConnected
                        ? dark
                            ? '#F8FAFC'
                            : '#1A1A1A'
                        : dark
                          ? '#475569'
                          : '#94A3B8',
                },
            };
        });

        const edgeUpdates = rawGraphData.edges.map((e) => {
            const edgeId = `${e.source}->${e.target}`;
            const isConnected = connectedEdges.has(edgeId);
            return {
                id: edgeId,
                color: {
                    color: isConnected
                        ? dark
                            ? '#38BDF8'
                            : '#0284C7'
                        : dark
                          ? 'rgba(71, 85, 105, 0.1)'
                          : 'rgba(203, 213, 225, 0.15)',
                    opacity: isConnected ? 1.0 : 0.08,
                },
                width: isConnected ? 2.5 : 1,
            };
        });

        nodesDataSet.update(nodeUpdates);
        edgesDataSet.update(edgeUpdates);
    }

    /**
     * Updates and shows the floating HUD inspector.
     */
    function updateInspectorHud(node) {
        if (!inspectorHud) return;

        if (!node) {
            inspectorHud.classList.add('opacity-0', 'translate-y-3', 'pointer-events-none');
            return;
        }

        const roleBadges = {
            landmark:
                '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Landmark Study</span>',
            focus: '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-semibold border border-indigo-300 dark:border-indigo-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>Focus Paper</span>',
            foundation:
                '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold border border-purple-300 dark:border-purple-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>Foundational Work</span>',
            recent: '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Recent Breakthrough</span>',
            cocitation:
                '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-semibold border border-sky-300 dark:border-sky-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>Co-cited External</span>',
            standard:
                '<span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-semibold border border-slate-300 dark:border-slate-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>Domain Literature</span>',
        };

        const authorText =
            node.authors && node.authors.length > 0
                ? node.authors.slice(0, 3).join(', ') + (node.authors.length > 3 ? ' et al.' : '')
                : 'Academic Authors';

        const doiLink = node.doi
            ? `<a href="https://doi.org/${encodeURIComponent(node.doi.replace(/^https?:\/\/doi\.org\//i, ''))}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-mono hover:underline flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">open_in_new</span>
                <span>DOI: ${node.doi}</span>
               </a>`
            : '';

        inspectorHud.innerHTML = `
            <div class="flex items-center justify-between gap-2 mb-2">
                ${roleBadges[node.nodeType] || roleBadges.standard}
                <button type="button" id="hud-close-btn" class="text-secondary hover:text-primary p-0.5 rounded" title="Close Inspector">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
            <h4 class="serif-heading text-sm font-bold text-on-surface line-clamp-2 leading-tight">${node.title}</h4>
            <div class="text-[11px] text-secondary mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>${authorText}</span>
                <span>•</span>
                <span class="font-semibold">${node.year || 'N/A'}</span>
                <span>•</span>
                <span class="font-mono text-amber-600 dark:text-amber-400">${node.citations || 0} citations</span>
            </div>
            ${node.venue ? `<p class="text-[11px] text-secondary-muted italic mt-0.5">${node.venue}</p>` : ''}
            ${node.abstract ? `<p class="text-xs text-secondary mt-2 line-clamp-3 leading-relaxed border-t border-outline/50 pt-2">${node.abstract}</p>` : ''}
            <div class="mt-3 pt-2 border-t border-outline/50 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <button type="button" id="hud-focus-btn" class="secondary-btn text-[11px] py-1 px-2.5 flex items-center gap-1" title="Center camera on paper">
                        <span class="material-symbols-outlined text-xs">center_focus_strong</span>
                        <span>Focus</span>
                    </button>
                </div>
                ${doiLink}
            </div>
        `;

        inspectorHud.classList.remove('opacity-0', 'translate-y-3', 'pointer-events-none');

        // Bind HUD events
        const closeBtn = inspectorHud.querySelector('#hud-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                updateInspectorHud(null);
                selectedNodeId = null;
                spotlightNodeSubgraph(null);
            });
        }

        const focusBtn = inspectorHud.querySelector('#hud-focus-btn');
        if (focusBtn) {
            focusBtn.addEventListener('click', () => {
                if (network) {
                    network.focus(node.id, {
                        scale: 1.25,
                        animation: { duration: 600, easingFunction: 'easeInOutQuad' },
                    });
                }
            });
        }
    }

    /**
     * Centers and zooms onto the highest cited landmark node.
     */
    function focusLandmarkNode() {
        if (!network || !rawGraphData.nodes || rawGraphData.nodes.length === 0) return;
        const landmark =
            rawGraphData.nodes.find((n) => n.nodeType === 'landmark') || rawGraphData.nodes[0];
        if (landmark) {
            selectedNodeId = landmark.id;
            network.focus(landmark.id, {
                scale: 1.2,
                animation: { duration: 600, easingFunction: 'easeInOutQuad' },
            });
            spotlightNodeSubgraph(landmark.id);
            updateInspectorHud(landmark);
        }
    }

    /**
     * Filters graph nodes by search input term.
     */
    function filterBySearchTerm(term) {
        if (!term) {
            spotlightNodeSubgraph(null);
            return;
        }

        const matchingNode = rawGraphData.nodes.find(
            (n) =>
                n.title.toLowerCase().includes(term) ||
                (n.authors && n.authors.some((a) => a.toLowerCase().includes(term))),
        );

        if (matchingNode) {
            selectedNodeId = matchingNode.id;
            network.focus(matchingNode.id, { scale: 1.15, animation: { duration: 400 } });
            spotlightNodeSubgraph(matchingNode.id);
            updateInspectorHud(matchingNode);
        }
    }

    /**
     * Sets graph data and mounts the vis-network graph.
     * @param {{ nodes: any[], edges: any[] }} graphData
     * @param {any[]} [papers]
     */
    function setData(graphData, papers = []) {
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
            container.innerHTML = `
                <div class="absolute inset-0 flex items-center justify-center text-center p-8 font-mono text-xs uppercase tracking-widest text-secondary">
                    No citation lineage data available.
                </div>
            `;
            return;
        }

        rawGraphData = graphData;
        rawPapers = papers;
        initOverlayUI();

        const dark = isDarkMode();

        // 1. Map Nodes
        const nodesList = graphData.nodes.map((n) => {
            const role = n.nodeType || 'standard';
            const colors = getNodeThemeColors(dark, role);
            const radius = calculateNodeSize(n.citations);

            return {
                id: n.id,
                label: formatNodeLabel(n.title, n.year, n.citations),
                title: `${n.title}\n(${n.year || 'N/A'}, Citations: ${n.citations || 0})`,
                size: radius,
                shape: 'dot',
                borderWidth: role === 'landmark' || role === 'focus' ? 3 : 1.8,
                color: {
                    background: colors.background,
                    border: colors.border,
                    hover: colors.hover,
                    highlight: colors.highlight,
                },
                font: {
                    color: dark ? '#F8FAFC' : '#0F172A',
                    face: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    size: 11,
                    bold: role === 'landmark' || role === 'focus',
                    strokeWidth: dark ? 3 : 2,
                    strokeColor: dark ? '#0F172A' : '#FFFFFF',
                },
                shadow: {
                    enabled: true,
                    color: colors.haloColor,
                    size: role === 'landmark' ? 14 : 8,
                    x: 0,
                    y: 2,
                },
            };
        });

        // 2. Map Edges
        const edgesList = graphData.edges.map((e) => {
            const edgeId = `${e.source}->${e.target}`;
            const isLineage = e.type === 'lineage' || e.type === 'semantic';

            return {
                id: edgeId,
                from: e.source,
                to: e.target,
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.65,
                    },
                },
                smooth: {
                    type: 'curvedCW',
                    roundness: 0.18,
                },
                dashes: isLineage,
                width: e.weight && e.weight > 0.8 ? 2.2 : 1.5,
                color: {
                    color: isLineage
                        ? dark
                            ? '#475569'
                            : '#94A3B8'
                        : dark
                          ? '#64748B'
                          : '#CBD5E1',
                    highlight: dark ? '#38BDF8' : '#0284C7',
                    hover: dark ? '#38BDF8' : '#0284C7',
                    opacity: 0.85,
                },
            };
        });

        if (typeof vis === 'undefined' || !vis.DataSet || !vis.Network) {
            container.innerHTML = `
                <div class="absolute inset-0 flex items-center justify-center text-center p-8 font-mono text-xs uppercase tracking-widest text-secondary">
                    Graph visualization library unavailable.
                </div>
            `;
            return;
        }

        nodesDataSet = new vis.DataSet(nodesList);
        edgesDataSet = new vis.DataSet(edgesList);

        const networkOptions = {
            nodes: {
                scaling: { min: 14, max: 36 },
            },
            physics: {
                enabled: true,
                stabilization: { iterations: 120, updateInterval: 25 },
                barnesHut: {
                    gravitationalConstant: -2800,
                    centralGravity: 0.28,
                    springLength: 100,
                    springConstant: 0.04,
                    damping: 0.09,
                },
            },
            interaction: {
                hover: true,
                tooltipDelay: 120,
                navigationButtons: false,
                keyboard: false,
            },
        };

        // Create vis.Network instance
        network = new vis.Network(
            container,
            { nodes: nodesDataSet, edges: edgesDataSet },
            networkOptions,
        );

        // Kinetic Canvas Hooks
        network.on('afterDrawing', (ctx) => {
            renderKineticFrame(ctx);
        });

        // Event: Hover Node
        network.on('hoverNode', (params) => {
            hoveredNodeId = params.node;
            container.style.cursor = 'pointer';
            if (!selectedNodeId) {
                spotlightNodeSubgraph(params.node);
            }
            const node = rawGraphData.nodes.find((n) => n.id === params.node);
            if (node && !selectedNodeId) {
                updateInspectorHud(node);
            }
        });

        // Event: Blur Node
        network.on('blurNode', () => {
            hoveredNodeId = null;
            container.style.cursor = 'default';
            if (!selectedNodeId) {
                spotlightNodeSubgraph(null);
                updateInspectorHud(null);
            }
        });

        // Event: Click Node
        network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const clickedId = params.nodes[0];
                selectedNodeId = clickedId;
                spotlightNodeSubgraph(clickedId);
                const node = rawGraphData.nodes.find((n) => n.id === clickedId);
                if (node) updateInspectorHud(node);
                if (options.onNodeClick) options.onNodeClick(node);
            } else {
                // Click on empty space clears selection
                selectedNodeId = null;
                spotlightNodeSubgraph(null);
                updateInspectorHud(null);
            }
        });

        initParticles(graphData.edges);
        startAnimationLoop();
        updateLegendStatistics();
    }

    /**
     * Updates live graph legend statistics.
     */
    function updateLegendStatistics() {
        const statsEl = document.getElementById('network-stats-badge');
        if (!statsEl || !rawGraphData.nodes) return;

        const nodeCount = rawGraphData.nodes.length;
        const edgeCount = rawGraphData.edges ? rawGraphData.edges.length : 0;
        const years = rawGraphData.nodes.map((n) => n.year || 2020);
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        const totalCitations = rawGraphData.nodes.reduce((acc, n) => acc + (n.citations || 0), 0);

        statsEl.textContent = `${nodeCount} Papers • ${edgeCount} Citation Links • ${minYear}–${maxYear} • ${totalCitations.toLocaleString()} Citations`;
    }

    /**
     * Highlights nodes matching a specific role filter.
     */
    function filterByRole(role) {
        if (!network || !nodesDataSet) return;

        if (activeFilter === role) {
            activeFilter = 'all';
            spotlightNodeSubgraph(null);
            return;
        }

        activeFilter = role;
        const dark = isDarkMode();
        const nodeUpdates = rawGraphData.nodes.map((n) => {
            const matches = n.nodeType === role;
            const colors = getNodeThemeColors(dark, n.nodeType);
            return {
                id: n.id,
                opacity: matches ? 1.0 : 0.15,
                color: {
                    background: matches ? colors.background : dark ? '#0F172A' : '#F1F5F9',
                    border: matches ? colors.border : dark ? '#1E293B' : '#E2E8F0',
                },
                font: {
                    color: matches ? (dark ? '#F8FAFC' : '#1A1A1A') : dark ? '#475569' : '#94A3B8',
                },
            };
        });

        nodesDataSet.update(nodeUpdates);
    }

    function destroy() {
        isDestroyed = true;
        if (layoutTimeoutId) {
            clearTimeout(layoutTimeoutId);
            layoutTimeoutId = null;
        }
        stopAnimationLoop();
        if (network) {
            network.destroy();
            network = null;
        }
    }

    return {
        setData,
        applyLayoutMode,
        spotlightNodeSubgraph,
        filterByRole,
        focusLandmarkNode,
        destroy,
        getNetwork: () => network,
    };
}
