// AbstractiFy Frontend JavaScript Logic
// Fully handles: Search, Consensus, Matrix, Network Graph, PDF Ingestion, Chat Agent, Equation Explainer, and Transitions
import { initTheme } from './js/theme.js';
import { renderLatex, renderMathInContainer } from './js/katex-helper.js';
import { initShortcuts, openModal, closeModal } from './js/shortcuts.js';
import { calculateReadingMetrics, formatReadingTimeBadge } from './js/reading-time.js';
import { exportBibliography } from './js/export.js';
import { exportPanelAsImage } from './js/screenshot.js';
import { getSavedSessions, saveSession, deleteSession, clearAllSessions, formatSessionDate } from './js/sessions.js';
import { initHero3D } from './js/hero-3d.js';
import { initTiltCards, initMagneticButtons } from './js/motion.js';

document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    // ─── Theme System Initialization ───
    initTheme();

    // ─── 3D Universe & Kinetic Motion Suite ───
    let hero3DController = null;
    try {
        hero3DController = initHero3D('hero-3d-canvas');
    } catch (e) {
        console.warn('3D hero initialization skipped:', e);
    }

    window.addEventListener('themechange', (e) => {
        if (hero3DController && typeof hero3DController.setTheme === 'function') {
            hero3DController.setTheme(e.detail && e.detail.theme === 'dark');
        }
    });

    initTiltCards('.folio-card, .paper-card');
    initMagneticButtons('.oxford-btn');

    // ─── State Management ───
    let storedGeminiKey = localStorage.getItem('gemini_key') || '';
    if (storedGeminiKey.startsWith('AQ.' + 'Ab8RN6JNoL')) {
        console.warn('Automatically clearing old restricted Gemini API Key from localStorage.');
        localStorage.removeItem('gemini_key');
        storedGeminiKey = '';
    }

    const state = {
        apiKeys: {
            gemini: storedGeminiKey,
            groq: localStorage.getItem('groq_key') || ''
        },
        geminiKeyMode: localStorage.getItem('gemini_key_mode') || 'background', // 'background' or 'byok'
        activeModel: localStorage.getItem('active_model') || 'gemini-3.1-flash-lite',
        searchResults: [],
        selectedPaperIds: new Set(),
        selectedPaperId: null,
        networkInstance: null,
        consensusData: null,
        matrixData: [],
        currentQuery: '',
        pdfChunks: [],       // stored in memory after PDF upload
        formulas: [],
        selectedFormula: null
    };

    // ─── DOM References ───

    const landingView       = $('landing-view');
    const appView           = $('app-view');

    // Transitions & Navigation
    const accessWorkspaceBtns = document.querySelectorAll('.access-workspace-btn');
    const landingSettingsBtn  = $('landing-settings-btn');
    const navLandingLink      = $('nav-landing-link');
    const navBrandBtn         = $('nav-brand-btn');
    const navSettingsLink     = $('nav-settings-link');

    // Settings Modal elements
    const settingsBtn             = $('settings-btn');
    const settingsModal             = $('settings-modal');
    const settingsCloseBtn          = $('settings-close-btn');
    const saveSettingsBtn           = $('save-settings-btn');
    const geminiKeyModeBackground   = $('gemini-key-mode-background');
    const geminiKeyModeByok         = $('gemini-key-mode-byok');
    const geminiKeyInputContainer   = $('gemini-key-input-container');
    const geminiKeyInput            = $('gemini-key-input');
    const groqKeyInput              = $('groq-key-input');
    const modelSelect               = $('model-select');

    // Search and Core Workspace elements
    const landingSearchForm   = $('landing-search-form');
    const landingSearchInput  = $('landing-search-input');
    const searchForm        = $('search-form');
    const searchInput       = $('search-input');
    const workspaceTitle    = $('workspace-title');
    const welcomeMessage    = $('welcome-message');
    const loader            = $('loader');
    const resultsList       = $('results-list'); // Cited Publications Container

    // Consensus elements
    const papersSampledBadge = $('papers-sampled-badge');
    const consensusProgressBox = $('consensus-progress-box');
    const barSupports       = $('consensus-bar-supports');
    const barNeutral        = $('consensus-bar-neutral');
    const barContradicts    = $('consensus-bar-contradicts');
    const statSupports      = $('stat-supports');
    const statNeutral       = $('stat-neutral');
    const statContradicts   = $('stat-contradicts');
    const consensusSummaryText = $('consensus-summary-text');

    // Matrix & Network Graph
    const matrixBody        = $('matrix-body');
    const exportCsvBtn      = $('export-csv-btn');
    const networkContainer  = $('network-container');

    // PDF Ingestion & Chat
    const uploadPdfBtn      = $('upload-pdf-btn');
    const pdfFileInput      = $('pdf-file-input');
    const chatForm          = $('chat-form');
    const chatInput         = $('chat-input');
    const chatMessages      = $('chat-messages');

    // Equation Explainer
    const formulaList       = $('formula-list');
    const formulaExplanation = $('formula-explanation');
    const selectedFormulaText = $('selected-formula-text');
    const selectedFormulaDesc = $('selected-formula-desc');

    // ─── Initialize settings fields ───
    if (state.geminiKeyMode === 'byok') {
        if (geminiKeyModeByok) geminiKeyModeByok.checked = true;
        if (geminiKeyInputContainer) geminiKeyInputContainer.classList.remove('hidden');
    } else {
        if (geminiKeyModeBackground) geminiKeyModeBackground.checked = true;
        if (geminiKeyInputContainer) geminiKeyInputContainer.classList.add('hidden');
    }

    if (geminiKeyInput) geminiKeyInput.value = state.apiKeys.gemini;
    if (groqKeyInput) groqKeyInput.value = state.apiKeys.groq;
    if (modelSelect) modelSelect.value = state.activeModel;

    // Toggle custom key visibility based on mode selection
    const updateGeminiKeyModeUI = () => {
        if (geminiKeyModeByok && geminiKeyModeByok.checked) {
            geminiKeyInputContainer.classList.remove('hidden');
        } else {
            geminiKeyInputContainer.classList.add('hidden');
        }
    };
    if (geminiKeyModeBackground) geminiKeyModeBackground.addEventListener('change', updateGeminiKeyModeUI);
    if (geminiKeyModeByok) geminiKeyModeByok.addEventListener('change', updateGeminiKeyModeUI);

    // ─── View Transition Helpers ───
    /**
     * Transitions the application view from the public landing page to the main scholarly workspace.
     * Automatically triggers a recalculation and fit of the citation network if initialized.
     * @returns {void}
     */
    function switchToWorkspace() {
        if (hero3DController) hero3DController.pause();
        document.body.classList.remove('show-landing');
        document.body.classList.add('show-app');
        landingView.classList.add('hidden');
        appView.classList.remove('hidden');
        
        // Trigger Vis Network resize recalculations
        setTimeout(() => {
            if (state.networkInstance) {
                state.networkInstance.setSize('100%', '100%');
                state.networkInstance.fit();
            }
        }, 100);
    }

    /**
     * Transitions the application view from the scholarly workspace back to the public landing page.
     * @returns {void}
     */
    function switchToLanding() {
        if (hero3DController) hero3DController.resume();
        document.body.classList.remove('show-app');
        document.body.classList.add('show-landing');
        appView.classList.add('hidden');
        landingView.classList.remove('hidden');
    }

    // ─── Workspace Multi-Tab Switching System ───
    const tabBtns = document.querySelectorAll('.workspace-tab-btn');
    const tabPanes = document.querySelectorAll('.workspace-tab-pane');

    /**
     * Switches the active workspace tab pane, synchronizes tab button aria attributes and active classes.
     * Dynamically triggers Vis.js network graph resizing if switching to the citation lineage tab.
     * @param {string} targetTabId - The DOM element ID of the workspace tab pane to display.
     * @returns {void}
     */
    function switchWorkspaceTab(targetTabId) {
        tabBtns.forEach(btn => {
            const isMatch = btn.getAttribute('data-tab') === targetTabId;
            btn.classList.toggle('active', isMatch);
            btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
            btn.setAttribute('tabindex', isMatch ? '0' : '-1');
        });

        tabPanes.forEach(pane => {
            const isMatch = pane.id === targetTabId;
            pane.classList.toggle('active', isMatch);
            if (isMatch) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        });

        // Trigger Vis Network resize if graph tab is activated
        if (targetTabId === 'tab-graph' && state.networkInstance) {
            setTimeout(() => {
                state.networkInstance.setSize('100%', '100%');
                state.networkInstance.fit();
            }, 60);
        }
    }

    // Set initial roving tabindex on tabs
    tabBtns.forEach(btn => {
        const isActive = btn.classList.contains('active');
        btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    tabBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            if (tabId) switchWorkspaceTab(tabId);
        });

        btn.addEventListener('keydown', (e) => {
            let nextIndex = null;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                nextIndex = (index + 1) % tabBtns.length;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                nextIndex = (index - 1 + tabBtns.length) % tabBtns.length;
            } else if (e.key === 'Home') {
                nextIndex = 0;
            } else if (e.key === 'End') {
                nextIndex = tabBtns.length - 1;
            }

            if (nextIndex !== null) {
                e.preventDefault();
                const nextBtn = tabBtns[nextIndex];
                const tabId = nextBtn.getAttribute('data-tab');
                if (tabId) {
                    switchWorkspaceTab(tabId);
                    nextBtn.focus();
                }
            }
        });
    });

    // Bind transition triggers
    accessWorkspaceBtns.forEach(btn => {
        btn.addEventListener('click', switchToWorkspace);
    });

    if (navLandingLink) navLandingLink.addEventListener('click', switchToLanding);
    if (navBrandBtn) navBrandBtn.addEventListener('click', switchToLanding);
    
    // Bind Settings open triggers
    if (landingSettingsBtn) {
        landingSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    }
    if (navSettingsLink) {
        navSettingsLink.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    }
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    }
    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    }
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal(settingsModal);
        if (commandPaletteModal && e.target === commandPaletteModal) closeModal(commandPaletteModal);
        if (shortcutsModal && e.target === shortcutsModal) closeModal(shortcutsModal);
        if (sessionsModal && e.target === sessionsModal) closeModal(sessionsModal);
    });

    // ─── Keyboard Shortcuts & Accessibility (Issue #13) ───
    const commandPaletteModal = $('command-palette-modal');
    const paletteSearchInput  = $('palette-search-input');
    const paletteSearchForm   = $('palette-search-form');
    const paletteCloseBtn     = $('palette-close-btn');
    const shortcutsModal      = $('shortcuts-modal');
    const shortcutsBtn        = $('shortcuts-btn');
    const landingShortcutsBtn = $('landing-shortcuts-btn');
    const shortcutsCloseBtn   = $('shortcuts-close-btn');

    initShortcuts({
        onSwitchTab: (tabId) => switchWorkspaceTab(tabId)
    });

    if (paletteCloseBtn && commandPaletteModal) {
        paletteCloseBtn.addEventListener('click', () => closeModal(commandPaletteModal));
    }
    if (shortcutsCloseBtn && shortcutsModal) {
        shortcutsCloseBtn.addEventListener('click', () => closeModal(shortcutsModal));
    }
    if (shortcutsBtn && shortcutsModal) {
        shortcutsBtn.addEventListener('click', () => openModal(shortcutsModal));
    }
    if (landingShortcutsBtn && shortcutsModal) {
        landingShortcutsBtn.addEventListener('click', () => openModal(shortcutsModal));
    }
    if (paletteSearchForm && paletteSearchInput) {
        paletteSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = paletteSearchInput.value.trim();
            if (q) {
                closeModal(commandPaletteModal);
                switchToWorkspace();
                if (searchInput) searchInput.value = q;
                performSearch(q);
            }
        });
    }

    // Save Settings
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const isByok = geminiKeyModeByok && geminiKeyModeByok.checked;
            state.geminiKeyMode = isByok ? 'byok' : 'background';
            state.apiKeys.gemini = isByok ? geminiKeyInput.value.trim() : '';
            state.apiKeys.groq   = groqKeyInput.value.trim();
            state.activeModel    = modelSelect.value;

            localStorage.setItem('gemini_key_mode', state.geminiKeyMode);
            if (isByok) {
                localStorage.setItem('gemini_key', state.apiKeys.gemini);
            } else {
                localStorage.removeItem('gemini_key');
            }
            localStorage.setItem('groq_key', state.apiKeys.groq);
            localStorage.setItem('active_model', state.activeModel);

            appendChat('System', `Settings saved. Active model: <strong>${state.activeModel}</strong>. Key mode: <strong>${state.geminiKeyMode === 'byok' ? 'BYOK (Custom Key)' : 'System Background Key'}</strong>`);
            settingsModal.classList.add('hidden');
        });
    }

    // ─── Utility: Build request headers ───
    function getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (state.geminiKeyMode === 'byok' && state.apiKeys.gemini) {
            headers['X-Gemini-Key'] = state.apiKeys.gemini;
        }
        if (state.apiKeys.groq) {
            headers['X-Groq-Key'] = state.apiKeys.groq;
        }
        return headers;
    }

    // ─── Utility: Append chat messages ───
    function appendChat(sender, content) {
        const div = document.createElement('div');
        div.className = `message ${sender === 'User' ? 'user-message' : sender === 'System' ? 'system-message' : 'ai-message'}`;
        div.textContent = String(content || '');
        chatMessages.appendChild(div);
        renderMathInContainer(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
    }

    function appendTypingIndicator() {
        const div = document.createElement('div');
        div.id = 'typing-indicator';
        div.className = 'message system-message';

        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        spinner.style.width = '14px';
        spinner.style.height = '14px';
        spinner.style.display = 'inline-block';
        spinner.style.verticalAlign = 'middle';
        spinner.style.marginRight = '8px';

        div.appendChild(spinner);
        div.appendChild(document.createTextNode(' Agent is synthesizing...'));

        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const el = $('typing-indicator');
        if (el) el.remove();
    }

    // ══════════════════════════════════════════════════════
    //  SEARCH HANDLERS
    // ══════════════════════════════════════════════════════
    
    // Quick search from Landing Page
    if (landingSearchForm) {
        landingSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = landingSearchInput.value.trim();
            if (!query) return;

            // Copy value to dashboard search bar and transition
            searchInput.value = query;
            switchToWorkspace();

            // Fire main workspace search
            triggerWorkspaceSearch(query);
        });
    }

    // Search from Workspace Header
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (!query) return;

            triggerWorkspaceSearch(query);
        });
    }

    async function triggerWorkspaceSearch(query) {
        // Reset UI Elements
        state.currentQuery = query;
        if (workspaceTitle) workspaceTitle.innerText = query;
        if (welcomeMessage) welcomeMessage.classList.add('hidden');
        if (consensusSummaryText) consensusSummaryText.classList.add('hidden');
        resultsList.innerHTML = '';
        loader.classList.remove('hidden');
        consensusProgressBox.classList.add('hidden');
        
        if (papersSampledBadge) {
            papersSampledBadge.innerText = 'Analyzing Query...';
        }

        matrixBody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-secondary italic">Extracting study parameters...</td></tr>';
        networkContainer.innerHTML = `
            <div class="absolute inset-0 flex items-center justify-center text-center p-8 font-mono text-[10px] uppercase tracking-widest text-secondary bg-[#FDFAF6]/90 z-10 pointer-events-none">
                Graphizing citation networks...
            </div>
        `;

        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ query })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `Search failed (HTTP ${res.status})`);
            }

            const data = await res.json();
            state.searchResults = data.papers || [];
            loader.classList.add('hidden');

            if (state.searchResults.length === 0) {
                resultsList.innerHTML = '<div class="text-sm italic text-secondary p-4">No matching papers found. Try another query.</div>';
                if (papersSampledBadge) papersSampledBadge.innerText = '0 Papers Sampled';
                return;
            }

            if (papersSampledBadge) papersSampledBadge.innerText = `${state.searchResults.length} Papers Sampled`;

            renderPaperCards();

            // Run analysis concurrently
            runConsensus(query);
            runComparison();
            runNetworkGraph(query);

        } catch (error) {
            console.error('Search error:', error);
            loader.classList.add('hidden');
            resultsList.innerHTML = `<div class="text-xs text-red-700 border border-red-200 bg-red-50 p-4">Error: ${error.message}</div>`;
            if (papersSampledBadge) papersSampledBadge.innerText = 'Search Error';
        }
    }

    // ─── Render Cited Publication Cards in Literature Explorer ───
    /**
     * Renders responsive publication cards in the Literature Explorer grid.
     * Updates the literature explorer tab count badge with current result size.
     * @returns {void}
     */
    /**
     * Derives a stable key for a paper entry distinguishing IDs from index fallbacks.
     * @param {Object} paper
     * @param {number} idx
     * @returns {string}
     */
    function getPaperKey(paper, idx) {
        return (paper && paper.id !== undefined && paper.id !== null && paper.id !== '')
            ? `id:${paper.id}`
            : `idx:${idx}`;
    }

    // ── Retraction & Reliability Verification (Issue #28) ──
    function getRetractionBadgeHtml(paper) {
        if (paper.isRetracted) {
            return `
                <span class="text-secondary-muted">•</span>
                <span class="retraction-badge px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm animate-pulse" title="This publication has been RETRACTED according to Crossref metadata">
                    <span class="material-symbols-outlined text-[12px] text-rose-500">warning</span>
                    <span>RETRACTED</span>
                </span>
            `;
        }
        if (paper.hasCorrections) {
            return `
                <span class="text-secondary-muted">•</span>
                <span class="correction-badge px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1" title="This publication has formal corrections or errata">
                    <span class="material-symbols-outlined text-[12px] text-amber-500">edit_note</span>
                    <span>CORRECTED</span>
                </span>
            `;
        }
        return '';
    }

    function applyRetractionStatusToCard(paper, card, data) {
        if (!data || !card) return;
        const metaContainer = card.querySelector('.paper-meta-pills');
        const contentContainer = card.querySelector('.paper-card-content');

        if (data.isRetracted) {
            paper.isRetracted = true;
            if (metaContainer && !metaContainer.querySelector('.retraction-badge')) {
                const badgeSpan = document.createElement('span');
                badgeSpan.className = 'retraction-badge px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm animate-pulse';
                badgeSpan.title = 'This publication has been RETRACTED according to Crossref metadata';
                badgeSpan.innerHTML = '<span class="material-symbols-outlined text-[12px] text-rose-500">warning</span><span>RETRACTED</span>';

                const dot = document.createElement('span');
                dot.className = 'text-secondary-muted';
                dot.textContent = '•';

                metaContainer.appendChild(dot);
                metaContainer.appendChild(badgeSpan);
            }

            if (contentContainer && !contentContainer.querySelector('.retraction-banner')) {
                const banner = document.createElement('div');
                banner.className = 'retraction-banner text-xs font-mono flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-rose-500/30';
                banner.innerHTML = '<span class="material-symbols-outlined text-sm text-rose-500">gpp_maybe</span><span><strong>CRITICAL WARNING:</strong> Retracted in Crossmark metadata.</span>';
                contentContainer.insertBefore(banner, contentContainer.firstChild);
            }
        } else if (data.hasCorrections) {
            paper.hasCorrections = true;
            if (metaContainer && !metaContainer.querySelector('.correction-badge') && !metaContainer.querySelector('.retraction-badge')) {
                const badgeSpan = document.createElement('span');
                badgeSpan.className = 'correction-badge px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1';
                badgeSpan.title = 'This publication has formal corrections or errata';
                badgeSpan.innerHTML = '<span class="material-symbols-outlined text-[12px] text-amber-500">edit_note</span><span>CORRECTED</span>';

                const dot = document.createElement('span');
                dot.className = 'text-secondary-muted';
                dot.textContent = '•';

                metaContainer.appendChild(dot);
                metaContainer.appendChild(badgeSpan);
            }
        }
    }

    async function verifyPaperRetraction(paper, card) {
        if (!paper || !paper.doi) return;
        const cacheKey = 'doi_retraction_' + paper.doi;
        let cached = null;
        try {
            const item = sessionStorage.getItem(cacheKey);
            if (item) cached = JSON.parse(item);
        } catch (_) {}

        if (cached) {
            applyRetractionStatusToCard(paper, card, cached);
            return;
        }

        try {
            const res = await fetch('/api/doi-check?doi=' + encodeURIComponent(paper.doi));
            if (res.ok) {
                const data = await res.json();
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(data));
                } catch (_) {}
                applyRetractionStatusToCard(paper, card, data);
            }
        } catch (_) {}
    }

    function renderPaperCards() {
        resultsList.innerHTML = '';

        const tabLitBadge = $('tab-badge-literature');
        if (tabLitBadge) {
            tabLitBadge.innerText = `${state.searchResults.length}`;
        }

        if (state.searchResults.length === 0) {
            resultsList.innerHTML = `
                <div class="col-span-full py-16 text-center text-secondary italic bg-surface border border-outline rounded-xl p-8">
                    No matching papers found. Try another query.
                </div>
            `;
            return;
        }

        state.searchResults.forEach((paper, idx) => {
            const card = document.createElement('div');
            const stance = paper.consensusStance || 'neutral';
            const idxStr = String(idx + 1).padStart(2, '0');
            
            card.className = `paper-card ${state.selectedPaperId === paper.id ? 'selected' : ''}`;
            
            const authorsStr = (paper.authors || []).join(', ') || 'Unknown Authors';
            const abstractExcerpt = paper.abstract 
                ? (paper.abstract.length > 240 ? paper.abstract.substring(0, 240) + '...' : paper.abstract)
                : 'No abstract available.';

                    const readingMetrics = calculateReadingMetrics(paper.abstract || paper.title || '');
            const readingBadgeHtml = formatReadingTimeBadge(readingMetrics);
            const retractionBadgeHtml = getRetractionBadgeHtml(paper);
            const retractionBannerHtml = paper.isRetracted
                ? `<div class="retraction-banner text-xs font-mono flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-rose-500/30">
                    <span class="material-symbols-outlined text-sm text-rose-500">gpp_maybe</span>
                    <span><strong>CRITICAL WARNING:</strong> Retracted in Crossmark metadata.</span>
                   </div>`
                : '';

            card.innerHTML = `
                <div class="space-y-3 paper-card-content">
                    ${retractionBannerHtml}
                    <div class="flex items-center justify-between text-[11px] font-mono text-secondary">
                        <div class="flex items-center gap-2 flex-wrap paper-meta-pills">
                            <input type="checkbox" class="paper-select-checkbox cursor-pointer rounded border-outline text-primary focus:ring-primary/20" data-paper-id="${paper.id || idx}" title="Select for bibliography citation" aria-label="Select paper for bibliography">
                            <span class="stance-pill ${stance}">
                                <span class="material-symbols-outlined text-[13px]">${stance === 'supports' ? 'check_circle' : stance === 'contradicts' ? 'cancel' : 'help'}</span>
                                ${stance}
                            </span>
                            <span class="text-secondary-muted">•</span>
                            <span>${paper.year || 'N/A'}</span>
                            <span class="text-secondary-muted">•</span>
                            ${readingBadgeHtml}
                            ${retractionBadgeHtml}
                        </div>
                        <span class="font-semibold text-primary font-mono">#${idxStr}</span>
                    </div>

                    <h3 class="paper-title serif-heading text-lg font-bold text-on-surface hover:text-primary transition-colors leading-snug"></h3>
                    
                    <p class="paper-authors text-xs text-primary/70 font-mono line-clamp-1"></p>

                    <p class="paper-abstract text-xs text-secondary leading-relaxed line-clamp-3"></p>
                </div>

                <div class="pt-3 border-t border-outline flex items-center justify-between text-xs font-mono">
                    <span class="text-secondary-muted flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">format_quote</span>
                        ${paper.citations || paper.citationCount || 0} citations
                    </span>
                    <div class="flex items-center gap-2">
                        ${paper.doi ? `<a href="https://doi.org/${encodeURIComponent(paper.doi)}" target="_blank" rel="noopener" class="text-primary hover:underline flex items-center gap-0.5"><span>DOI</span><span class="material-symbols-outlined text-xs">open_in_new</span></a>` : ''}
                        <button class="inspect-btn px-2.5 py-1 bg-surface-muted hover:bg-primary-light text-primary border border-outline rounded text-[11px] transition-colors cursor-pointer">
                            Inspect Intents
                        </button>
                    </div>
                </div>
            `;

            const titleEl = card.querySelector('.paper-title');
            if (titleEl) titleEl.textContent = paper.title || 'Untitled Publication';

            const authorsEl = card.querySelector('.paper-authors');
            if (authorsEl) authorsEl.textContent = authorsStr;

            const abstractEl = card.querySelector('.paper-abstract');
            if (abstractEl) abstractEl.textContent = abstractExcerpt;

            card.addEventListener('click', (e) => {
                if (e.target.closest('a') || e.target.closest('.paper-select-checkbox')) return;

                document.querySelectorAll('#results-list .paper-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                state.selectedPaperId = paper.id;
                appendChat('System', `Publication #${idxStr} selected: "${paper.title}"`);
                loadCitationContext(paper);

                if (e.target.closest('.inspect-btn')) {
                    switchWorkspaceTab('tab-copilot');
                }
            });

            resultsList.appendChild(card);
            verifyPaperRetraction(paper, card);
        });
    }

    // ══════════════════════════════════════════════════════
    //  CONSENSUS METER
    // ══════════════════════════════════════════════════════
    function applyConsensusData(data) {
        if (!data) return;
        state.consensusData = data;

        const score = data.consensusScore || 0;
        if (papersSampledBadge) {
            papersSampledBadge.innerText = `${state.searchResults.length} Papers · ${Math.round(score)}% Agreement`;
        }

        // Calculate percentage segments dynamically
        const totalCount = (data.supportsCount || 0) + (data.neutralCount || 0) + (data.contradictsCount || 0);
        if (totalCount > 0) {
            const supportsPct = Math.round(((data.supportsCount || 0) / totalCount) * 100);
            const neutralPct = Math.round(((data.neutralCount || 0) / totalCount) * 100);
            const contradictsPct = 100 - supportsPct - neutralPct;

            if (barSupports) barSupports.style.width = `${supportsPct}%`;
            if (barNeutral) barNeutral.style.width = `${neutralPct}%`;
            if (barContradicts) barContradicts.style.width = `${contradictsPct}%`;

            if (statSupports) statSupports.innerText = `Supports (${supportsPct}%)`;
            if (statNeutral) statNeutral.innerText = `Mixed (${neutralPct}%)`;
            if (statContradicts) statContradicts.innerText = `Opposes (${contradictsPct}%)`;
        } else {
            if (barSupports) barSupports.style.width = '0%';
            if (barNeutral) barNeutral.style.width = '0%';
            if (barContradicts) barContradicts.style.width = '0%';
        }

        if (consensusProgressBox) consensusProgressBox.classList.remove('hidden');
        if (consensusSummaryText) {
            consensusSummaryText.innerText = data.summaryText || 'Synthesis complete.';
            consensusSummaryText.classList.remove('hidden');
        }

        if (data.paperStances) {
            state.searchResults.forEach(p => {
                if (data.paperStances[p.id]) p.consensusStance = data.paperStances[p.id];
            });
            renderPaperCards();
        }
    }

    async function runConsensus(query) {
        try {
            const res = await fetch('/api/consensus', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ query, papers: state.searchResults })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Consensus API failed');
            }
            const data = await res.json();
            applyConsensusData(data);
        } catch (err) {
            console.error('Consensus error:', err);
            consensusSummaryText.innerText = `Could not classify consensus. ${err.message}`;
            consensusSummaryText.classList.remove('hidden');
        }
    }

    // ══════════════════════════════════════════════════════
    //  STUDY COMPARISON MATRIX
    // ══════════════════════════════════════════════════════
    function applyMatrixData(matrix) {
        state.matrixData = Array.isArray(matrix) ? matrix : [];

        const tabMatBadge = $('tab-badge-matrix');
        if (tabMatBadge) {
            tabMatBadge.innerText = `${state.matrixData.length}`;
        }

        if (!matrixBody) return;
        matrixBody.innerHTML = '';
        if (exportCsvBtn) exportCsvBtn.classList.remove('hidden');

        state.matrixData.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'border-b editorial-rule hover:bg-primary/[0.015] transition-colors';
            tr.innerHTML = `
                <td class="py-6 font-semibold text-primary text-sm max-w-xs"></td>
                <td class="py-6 text-secondary italic text-sm"></td>
                <td class="py-6 font-mono text-[11px] text-secondary max-w-xs"></td>
                <td class="py-6 font-mono text-[11px] text-secondary max-w-xs"></td>
                <td class="py-6 font-mono text-[11px] text-secondary max-w-xs"></td>
            `;
            const cells = tr.querySelectorAll('td');
            if (cells[0]) cells[0].textContent = row.title || 'N/A';
            if (cells[1]) cells[1].textContent = row.datasetSize || 'Unknown';
            if (cells[2]) cells[2].textContent = row.methodology || 'N/A';
            if (cells[3]) cells[3].textContent = row.outcomes || 'N/A';
            if (cells[4]) cells[4].textContent = row.limitations || 'N/A';
            matrixBody.appendChild(tr);
        });
    }

    /**
     * Executes study comparison extraction across search results, populating the comparison matrix.
     * Updates the matrix tab badge with total compared studies.
     * @returns {Promise<void>}
     */
    async function runComparison() {
        try {
            const res = await fetch('/api/compare', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ papers: state.searchResults })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Comparison failed');
            }
            const data = await res.json();
            applyMatrixData(data.matrix || []);
        } catch (err) {
            console.error('Matrix error:', err);
            matrixBody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-800 italic">Error extracting parameters: ${err.message}</td></tr>`;
        }
    }

    // ══════════════════════════════════════════════════════
    //  CITATION NETWORK GRAPH (Vis.js)
    // ══════════════════════════════════════════════════════
    async function runNetworkGraph(query) {
        try {
            const res = await fetch('/api/network-graph', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ query, papers: state.searchResults })
            });
            if (!res.ok) throw new Error('Network graph failed');
            const data = await res.json();

            networkContainer.innerHTML = '';

            if (!data.nodes || data.nodes.length === 0) {
                networkContainer.innerHTML = `
                    <div class="absolute inset-0 flex items-center justify-center text-center p-8 font-mono text-[10px] uppercase tracking-widest text-secondary">
                        No citation connections found.
                    </div>
                `;
                return;
            }

            const isDark = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';

            // Node visual options styled like an academic blueprint
            const nodes = new vis.DataSet(data.nodes.map(n => ({
                id: n.id,
                label: n.title ? (n.title.length > 20 ? n.title.substring(0, 18) + '...' : n.title) : '?',
                title: `${n.title} (${n.year || 'N/A'}, Citations: ${n.citations || 0})`,
                value: n.citations || 4,
                color: {
                    background: isDark ? '#1E293B' : '#FDFAF6',
                    border: isDark ? '#38BDF8' : '#002147',
                    hover: { background: isDark ? '#334155' : '#E8F0F2', border: isDark ? '#38BDF8' : '#002147' },
                    highlight: { background: isDark ? '#334155' : '#E8F0F2', border: isDark ? '#38BDF8' : '#002147' }
                },
                shape: 'dot',
                borderWidth: 1.5,
                font: { color: isDark ? '#F8FAFC' : '#1A1A1A', face: 'Times New Roman', size: 10 }
            })));

            const edges = new vis.DataSet(data.edges.map(e => ({
                from: e.source,
                to: e.target,
                arrows: 'to',
                color: { color: isDark ? '#334155' : '#D1CDC7', highlight: isDark ? '#38BDF8' : '#002147' }
            })));

            const options = {
                nodes: { scaling: { min: 8, max: 24 } },
                physics: {
                    stabilization: { iterations: 80 },
                    barnesHut: { gravitationalConstant: -2500, centralGravity: 0.25, springLength: 85 }
                },
                interaction: { hover: true, tooltipDelay: 150 }
            };

            state.networkInstance = new vis.Network(networkContainer, { nodes, edges }, options);

            state.networkInstance.on('click', (params) => {
                if (params.nodes.length > 0) {
                    const paper = state.searchResults.find(p => p.id === params.nodes[0]);
                    if (paper) {
                        appendChat('System', `Focus Node selected: "${paper.title}"`);
                        loadCitationContext(paper);
                    }
                }
            });
        } catch (err) {
            console.error('Network error:', err);
            networkContainer.innerHTML = `
                <div class="absolute inset-0 flex items-center justify-center text-center p-8 font-mono text-[10px] uppercase tracking-widest text-red-800 bg-[#FDFAF6]/90 z-10 pointer-events-none">
                    Error compiling networks.
                </div>
            `;
        }
    }

    // Dynamic theme update for citation graph
    window.addEventListener('themechange', () => {
        if (state.networkInstance && state.currentQuery && state.searchResults && state.searchResults.length > 0) {
            runNetworkGraph(state.currentQuery);
        }
    });

    // ══════════════════════════════════════════════════════
    //  CITATION CONTEXT (Scite-style intents)
    // ══════════════════════════════════════════════════════
    async function loadCitationContext(paper) {
        try {
            const res = await fetch('/api/citation-context', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ doi: paper.doi, title: paper.title })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();

            let html = `<strong>GENEALOGICAL CITATION INTENTS:</strong><br/>"${paper.title}"<br/><br/>`;
            
            html += `<strong>Supports (${data.supporting.length}):</strong><br/>`;
            (data.supporting || []).slice(0, 2).forEach(s => html += `— <em>"${s.context}"</em><br/>`);
            if (!data.supporting.length) html += '— None annotated.<br/>';

            html += `<br/><strong>Contradicts (${data.contradicting.length}):</strong><br/>`;
            (data.contradicting || []).slice(0, 2).forEach(s => html += `— <em>"${s.context}"</em><br/>`);
            if (!data.contradicting.length) html += '— None annotated.<br/>';

            html += `<br/><strong>Mentioning (${data.mentioning.length}):</strong><br/>`;
            if (data.mentioning.length) html += `— <em>"${data.mentioning[0].context}"</em>`;
            else html += '— None annotated.';

            appendChat('AI', html);
        } catch {
            appendChat('AI', `<strong>${paper.title}</strong> (${paper.year || 'N/A'})<br/><br/>Abstract: ${paper.abstract || 'No abstract available.'}`);
        }
    }

    // ══════════════════════════════════════════════════════
    //  EXPORT SUITE (Markdown, CSV, JSON, BibTeX)
    // ══════════════════════════════════════════════════════
    function downloadFile(filename, content, contentType = 'text/plain') {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Toggle Dropdown Menus
    const dropdowns = [
        { btn: 'export-consensus-btn', menu: 'export-consensus-menu' },
        { btn: 'export-matrix-menu-btn', menu: 'export-matrix-menu' },
        { btn: 'export-graph-menu-btn', menu: 'export-graph-menu' }
    ];

    dropdowns.forEach(({ btn, menu }) => {
        const btnEl = $(btn);
        const menuEl = $(menu);
        if (btnEl && menuEl) {
            btnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdowns.forEach(d => {
                    if (d.menu !== menu) {
                        const otherMenu = $(d.menu);
                        if (otherMenu) otherMenu.classList.add('hidden');
                    }
                });
                menuEl.classList.toggle('hidden');
            });
        }
    });

    // Close menus on click outside
    document.addEventListener('click', () => {
        dropdowns.forEach(({ menu }) => {
            const menuEl = $(menu);
            if (menuEl) menuEl.classList.add('hidden');
        });
    });

    // 1. Export Consensus Markdown (.md)
    const exportConsensusMdBtn = $('export-consensus-md');
    if (exportConsensusMdBtn) {
        exportConsensusMdBtn.addEventListener('click', () => {
            const query = state.currentQuery || 'Research Analysis';
            const consensus = state.consensusData || {};
            const score = consensus.consensusScore || 0;
            const summary = consensus.summaryText || 'No summary text generated.';
            
            const safeQuery = String(query).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            let md = `---\n`;
            md += `title: "AbstractiFy Scientific Consensus Summary"\n`;
            md += `query: "${safeQuery}"\n`;
            md += `date: "${new Date().toISOString().split('T')[0]}"\n`;
            md += `consensusScore: "${Math.round(score)}%"\n`;
            md += `sampledPapers: ${state.searchResults.length}\n`;
            md += `---\n\n`;
            md += `# 📊 Scientific Consensus Synthesis\n\n`;
            md += `> **Assertion Query**: ${query}\n\n`;
            md += `## Executive Summary\n\n${summary}\n\n`;
            md += `## Paper Stances & Evidence\n\n`;
            md += `| Paper Title | Year | Venue | Stance | Citations |\n`;
            md += `|---|---|---|---|---|\n`;

            state.searchResults.forEach(p => {
                const stance = p.consensusStance || 'Neutral';
                md += `| ${(p.title || 'N/A').replace(/\|/g, '-')} | ${p.year || 'N/A'} | ${p.venue || 'Journal'} | **${stance}** | ${p.citationCount || 0} |\n`;
            });

            downloadFile(`AbstractiFy_Consensus_${query.replace(/[^a-zA-Z0-9]/g, '_')}.md`, md, 'text/markdown');
        });
    }

    // 2. Export Consensus JSON (.json)
    const exportConsensusJsonBtn = $('export-consensus-json');
    if (exportConsensusJsonBtn) {
        exportConsensusJsonBtn.addEventListener('click', () => {
            const data = {
                generator: "AbstractiFy Academic Portal",
                timestamp: new Date().toISOString(),
                query: state.currentQuery,
                consensus: state.consensusData,
                papers: state.searchResults
            };
            downloadFile(`AbstractiFy_Consensus_${(state.currentQuery || 'analysis').replace(/[^a-zA-Z0-9]/g, '_')}.json`, JSON.stringify(data, null, 2), 'application/json');
        });
    }

    // 3. Export Comparison Matrix CSV (.csv)
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            const table = document.querySelector('table');
            if (!table) return;
            const rows = [];
            for (let i = 0; i < table.rows.length; i++) {
                const cells = [];
                for (let j = 0; j < table.rows[i].cells.length; j++) {
                    cells.push('"' + table.rows[i].cells[j].innerText.replace(/"/g, '""') + '"');
                }
                rows.push(cells.join(','));
            }
            downloadFile('AbstractiFy_Comparison_Matrix.csv', rows.join('\n'), 'text/csv');
        });
    }

    // 4. Export Comparison Matrix Markdown Table (.md)
    const exportMatrixMdBtn = $('export-matrix-md-btn');
    if (exportMatrixMdBtn) {
        exportMatrixMdBtn.addEventListener('click', () => {
            let md = `# 🧮 Study Comparison Matrix\n\n`;
            md += `> Query: ${state.currentQuery || 'Literature Analysis'}\n\n`;
            md += `| Publication | Dataset Size | Methodology | Outcomes | Limitations |\n`;
            md += `|---|---|---|---|---|\n`;

            if (state.matrixData && state.matrixData.length > 0) {
                state.matrixData.forEach(row => {
                    md += `| **${(row.title || 'N/A').replace(/\|/g, '-')}** | ${row.datasetSize || 'N/A'} | ${row.methodology || 'N/A'} | ${row.outcomes || 'N/A'} | ${row.limitations || 'N/A'} |\n`;
                });
            } else {
                md += `| No data available | N/A | N/A | N/A | N/A |\n`;
            }

            downloadFile('AbstractiFy_Comparison_Matrix.md', md, 'text/markdown');
        });
    }

    // 5. Export Citation Network JSON (Obsidian Graph format) (.json)
    const exportGraphJsonBtn = $('export-graph-json-btn');
    if (exportGraphJsonBtn) {
        exportGraphJsonBtn.addEventListener('click', () => {
            const nodes = state.searchResults.map(p => ({
                id: p.id,
                label: p.title,
                year: p.year,
                citationCount: p.citationCount,
                authors: (p.authors || []).map(a => a.name),
                doi: p.doi || null,
                url: p.url || null
            }));

            const graphData = {
                generator: "AbstractiFy Obsidian Graph Exporter",
                query: state.currentQuery,
                exportedAt: new Date().toISOString(),
                nodesCount: nodes.length,
                nodes: nodes
            };

            downloadFile(`AbstractiFy_Citation_Graph_${(state.currentQuery || 'network').replace(/[^a-zA-Z0-9]/g, '_')}.json`, JSON.stringify(graphData, null, 2), 'application/json');
        });
    }

    // 6. Export BibTeX References (.bib)
    const exportGraphBibtexBtn = $('export-graph-bibtex-btn');
    if (exportGraphBibtexBtn) {
        exportGraphBibtexBtn.addEventListener('click', () => {
            if (state.searchResults.length === 0) {
                alert('No search results available to export to BibTeX.');
                return;
            }

            let bib = `% AbstractiFy Generated BibTeX Bibliography\n`;
            bib += `% Query: ${state.currentQuery || 'Academic Search'}\n\n`;

            state.searchResults.forEach((p, idx) => {
                const firstAuthor = (p.authors && p.authors[0]) ? p.authors[0].name.split(' ').pop().toLowerCase() : 'author';
                const year = p.year || '2026';
                const citationKey = `${firstAuthor}${year}paper${idx + 1}`;
                const authorList = (p.authors || []).map(a => a.name).join(' and ');

                bib += `@article{${citationKey},\n`;
                bib += `  author = {${authorList || 'Unknown Author'}},\n`;
                bib += `  title = {{${p.title}}},\n`;
                bib += `  year = {${year}},\n`;
                if (p.venue) bib += `  journal = {${p.venue}},\n`;
                if (p.doi) bib += `  doi = {${p.doi}},\n`;
                if (p.url) bib += `  url = {${p.url}},\n`;
                bib += `}\n\n`;
            });

            downloadFile(`AbstractiFy_References_${(state.currentQuery || 'bib').replace(/[^a-zA-Z0-9]/g, '_')}.bib`, bib, 'text/plain');
        });
    }

    // 7. Export RIS References (.ris) for Zotero / Mendeley
    function formatRIS(papers) {
        const risField = (tag, value) => {
            if (value === undefined || value === null || value === '') return '';
            const oneLine = String(value).replace(/\s*\r?\n\s*/g, ' ').trim();
            return oneLine ? `${tag}  - ${oneLine}\r\n` : '';
        };

        const risAuthorName = (author) => {
            const rawName = typeof author === 'string'
                ? author
                : (author && typeof author === 'object' && author.name ? author.name : '');
            const clean = rawName.replace(/\s+/g, ' ').trim();
            if (!clean || clean.includes(',')) return clean;
            const parts = clean.split(' ');
            if (parts.length < 2) return clean;
            return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
        };

        return (papers || []).map(p => {
            let entry = 'TY  - JOUR\r\n';
            entry += risField('TI', p.title);
            (p.authors || []).forEach(a => {
                entry += risField('AU', risAuthorName(a));
            });
            entry += risField('PY', p.year);
            entry += risField('JO', p.venue);
            entry += risField('DO', p.doi);
            entry += risField('UR', p.url);
            entry += risField('AB', p.abstract);
            entry += 'ER  - \r\n';
            return entry;
        }).join('\r\n');
    }

    const exportGraphRisBtn = $('export-graph-ris-btn');
    if (exportGraphRisBtn) {
        exportGraphRisBtn.addEventListener('click', () => {
            if (state.searchResults.length === 0) {
                alert('No search results available to export to RIS.');
                return;
            }

            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            downloadFile(`abstractify_references_${stamp}.ris`, formatRIS(state.searchResults), 'application/x-research-info-systems');
        });
    }

    // ══════════════════════════════════════════════════════
    //  BIBLIOGRAPHY GENERATOR MODAL (Issue #04)
    // ══════════════════════════════════════════════════════
    const bibModal              = $('bibliography-modal');
    const exportBibBtn          = $('export-bib-btn');
    const explorerExportBibBtn  = $('explorer-export-bib-btn');
    const bibCloseBtn           = $('bib-close-btn');
    const bibStyleSelect        = $('bib-style-select');
    const bibPreviewText        = $('bib-preview-text');
    const bibCountBadge         = $('bib-count-badge');
    const bibCopyBtn            = $('bib-copy-btn');
    const bibDownloadBtn        = $('bib-download-btn');
    const bibDownloadLabel      = $('bib-download-label');
    const bibToast              = $('bib-toast');

    function getSelectedOrAllPapers() {
        if (state.selectedPaperIds.size > 0) {
            return (state.searchResults || []).filter((p, idx) =>
                state.selectedPaperIds.has(getPaperKey(p, idx))
            );
        }
        return state.searchResults || [];
    }

    function updateBibliographyModal() {
        if (!bibModal) return;
        const selectedPapers = getSelectedOrAllPapers();
        const style = bibStyleSelect ? bibStyleSelect.value : 'apa';

        if (selectedPapers.length === 0) {
            if (bibPreviewText) bibPreviewText.value = 'No publications currently available to format. Enter a search query to load papers.';
            if (bibCountBadge) bibCountBadge.innerText = '0 Papers Available';
            return;
        }

        const checkedCount = state.selectedPaperIds.size;
        if (bibCountBadge) {
            bibCountBadge.innerText = checkedCount > 0
                ? `${checkedCount} of ${state.searchResults.length} Selected`
                : `All Papers (${state.searchResults.length})`;
        }

        const formatted = exportBibliography(selectedPapers, style);
        if (bibPreviewText) bibPreviewText.value = formatted;

        if (bibDownloadLabel) {
            if (style === 'bibtex') bibDownloadLabel.innerText = 'Download (.bib)';
            else if (style === 'ris') bibDownloadLabel.innerText = 'Download (.ris)';
            else bibDownloadLabel.innerText = 'Download (.txt)';
        }
    }

    function openBibModal() {
        if (!bibModal) return;
        updateBibliographyModal();
        openModal(bibModal, bibStyleSelect);
    }

    if (exportBibBtn) exportBibBtn.addEventListener('click', openBibModal);
    if (explorerExportBibBtn) explorerExportBibBtn.addEventListener('click', openBibModal);
    if (bibCloseBtn) bibCloseBtn.addEventListener('click', () => closeModal(bibModal));
    if (bibStyleSelect) bibStyleSelect.addEventListener('change', updateBibliographyModal);

    // Update bibliography modal if open when checkbox changes
    document.addEventListener('change', (e) => {
        if (e.target && e.target.classList.contains('paper-select-checkbox')) {
            if (bibModal && !bibModal.classList.contains('hidden')) {
                updateBibliographyModal();
            }
        }
    });

    if (bibCopyBtn) {
        bibCopyBtn.addEventListener('click', async () => {
            const selectedPapers = getSelectedOrAllPapers();
            if (selectedPapers.length === 0 || !bibPreviewText || !bibPreviewText.value.trim()) {
                return;
            }
            try {
                await navigator.clipboard.writeText(bibPreviewText.value);
                if (bibToast) {
                    bibToast.innerHTML = '<span class="material-symbols-outlined text-sm">check_circle</span><span>Citations copied to clipboard!</span>';
                    bibToast.classList.remove('opacity-0');
                    bibToast.classList.add('opacity-100');
                    setTimeout(() => {
                        bibToast.classList.remove('opacity-100');
                        bibToast.classList.add('opacity-0');
                    }, 2500);
                }
            } catch (err) {
                console.error('Failed to copy bibliography to clipboard:', err);
                bibPreviewText.focus();
                bibPreviewText.select();
                if (bibToast) {
                    bibToast.innerHTML = '<span class="material-symbols-outlined text-sm">content_copy</span><span>Press Ctrl+C (Cmd+C) to copy</span>';
                    bibToast.classList.remove('opacity-0');
                    bibToast.classList.add('opacity-100');
                    setTimeout(() => {
                        bibToast.classList.remove('opacity-100');
                        bibToast.classList.add('opacity-0');
                    }, 4000);
                }
            }
        });
    }

    if (bibDownloadBtn) {
        bibDownloadBtn.addEventListener('click', () => {
            const selectedPapers = getSelectedOrAllPapers();
            if (selectedPapers.length === 0) {
                alert('No search results available to export.');
                return;
            }
            const style = bibStyleSelect ? bibStyleSelect.value : 'apa';
            const content = exportBibliography(selectedPapers, style);
            const safeQuery = (state.currentQuery || 'references').replace(/[^a-zA-Z0-9]/g, '_');
            
            let ext = 'txt';
            let mime = 'text/plain';
            if (style === 'bibtex') {
                ext = 'bib';
                mime = 'application/x-bibtex';
            } else if (style === 'ris') {
                ext = 'ris';
                mime = 'application/x-research-info-systems';
            }

            downloadFile(`AbstractiFy_${safeQuery}_${style}.${ext}`, content, mime);
        });
    }

    // ══════════════════════════════════════════════════════
    //  PANEL SCREENSHOT EXPORT (Issue #03)
    // ══════════════════════════════════════════════════════
    const screenshotToast = $('screenshot-toast');
    let screenshotToastTimer = null;

    function showScreenshotToast(message = '✨ Screenshot exported as PNG!') {
        if (!screenshotToast) return;
        const msgEl = $('screenshot-toast-msg');
        if (msgEl) msgEl.textContent = message;
        screenshotToast.classList.remove('opacity-0', 'pointer-events-none');
        screenshotToast.classList.add('opacity-100');
        if (screenshotToastTimer) clearTimeout(screenshotToastTimer);
        screenshotToastTimer = setTimeout(() => {
            screenshotToast.classList.remove('opacity-100');
            screenshotToast.classList.add('opacity-0', 'pointer-events-none');
        }, 3200);
    }

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-export-screenshot');
        if (!btn) return;
        e.stopPropagation();

        // Close any open export dropdown menus
        dropdowns.forEach(({ menu }) => {
            const menuEl = $(menu);
            if (menuEl) menuEl.classList.add('hidden');
        });

        const targetId = btn.getAttribute('data-target');
        const filename = btn.getAttribute('data-filename') || 'AbstractiFy_Panel';
        if (!targetId) return;

        const targetEl = $(targetId);
        if (!targetEl) {
            alert(`Target panel "${targetId}" could not be located.`);
            return;
        }

        const origContent = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('opacity-75');

        try {
            await exportPanelAsImage(targetEl, filename, {
                onComplete: () => {
                    showScreenshotToast(`✨ ${filename.replace(/_/g, ' ')} exported as PNG!`);
                },
                onError: (err) => {
                    console.error('Screenshot export error:', err);
                    alert('Failed to generate panel screenshot. Ensure all external assets are loaded.');
                }
            });
        } finally {
            btn.disabled = false;
            btn.classList.remove('opacity-75');
            btn.innerHTML = origContent;
        }
    });

    // ══════════════════════════════════════════════════════
    //  SAVED RESEARCH SESSIONS (Issue #18)
    // ══════════════════════════════════════════════════════
    const sessionsBtn            = $('sessions-btn');
    const saveSessionBtn         = $('save-session-btn');
    const sessionsModal          = $('sessions-modal');
    const sessionsCloseBtn       = $('sessions-close-btn');
    const sessionTitleInput      = $('session-title-input');
    const sessionTagsInput       = $('session-tags-input');
    const btnSaveCurrentSession  = $('btn-save-current-session');
    const saveSessionStatus      = $('save-session-status');
    const sessionsList           = $('sessions-list');
    const clearAllSessionsBtn    = $('clear-all-sessions-btn');
    const sessionsCountBadge     = $('sessions-count-badge');
    const modalSessionsCount     = $('modal-sessions-count');
    const sessionToast           = $('session-toast');
    let sessionToastTimer        = null;

    function showSessionToast(message = '✨ Session saved successfully!') {
        if (!sessionToast) return;
        const msgEl = $('session-toast-msg');
        if (msgEl) msgEl.textContent = message;
        sessionToast.classList.remove('opacity-0', 'pointer-events-none');
        sessionToast.classList.add('opacity-100');
        if (sessionToastTimer) clearTimeout(sessionToastTimer);
        sessionToastTimer = setTimeout(() => {
            sessionToast.classList.remove('opacity-100');
            sessionToast.classList.add('opacity-0', 'pointer-events-none');
        }, 3200);
    }

    function updateSessionsCountBadge() {
        const count = getSavedSessions().length;
        if (sessionsCountBadge) sessionsCountBadge.textContent = String(count);
        if (modalSessionsCount) modalSessionsCount.textContent = `${count} / 10 Stored`;
    }

    function renderSessionsList() {
        if (!sessionsList) return;
        sessionsList.innerHTML = '';

        const sessions = getSavedSessions();
        if (sessions.length === 0) {
            sessionsList.innerHTML = `
                <div class="py-8 text-center text-secondary italic font-mono text-xs bg-surface border border-outline rounded-lg p-6">
                    No saved research sessions yet. Run a search and click "Save Session" to preserve your inquiry.
                </div>
            `;
            return;
        }

        sessions.forEach((session) => {
            const card = document.createElement('div');
            card.className = 'session-card flex flex-col sm:flex-row sm:items-center justify-between gap-3';

            const leftCol = document.createElement('div');
            leftCol.className = 'space-y-1.5 flex-1 min-w-0';

            const headerRow = document.createElement('div');
            headerRow.className = 'flex items-center gap-2 flex-wrap';

            const titleEl = document.createElement('h5');
            titleEl.className = 'serif-heading text-sm font-bold text-on-surface truncate';
            titleEl.textContent = session.title || 'Untitled Session';
            headerRow.appendChild(titleEl);

            const dateEl = document.createElement('span');
            dateEl.className = 'font-mono text-[10px] text-secondary';
            dateEl.textContent = `• ${formatSessionDate(session.date)}`;
            headerRow.appendChild(dateEl);

            leftCol.appendChild(headerRow);

            if (session.query && session.query !== session.title) {
                const queryEl = document.createElement('p');
                queryEl.className = 'font-mono text-[11px] text-secondary truncate';
                queryEl.textContent = `Inquiry: "${session.query}"`;
                leftCol.appendChild(queryEl);
            }

            // Metrics & Tags
            const metaRow = document.createElement('div');
            metaRow.className = 'flex items-center gap-2 flex-wrap pt-0.5';

            const papersBadge = document.createElement('span');
            papersBadge.className = 'tab-badge text-[10px] font-mono';
            papersBadge.textContent = `${session.paperCount || 0} Papers`;
            metaRow.appendChild(papersBadge);

            if (session.consensusScore !== null && session.consensusScore !== undefined) {
                const scoreBadge = document.createElement('span');
                scoreBadge.className = 'tab-badge text-[10px] font-mono text-primary font-semibold';
                scoreBadge.textContent = `${Math.round(session.consensusScore)}% Consensus`;
                metaRow.appendChild(scoreBadge);
            }

            (session.tags || []).forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'session-tag-chip';
                tagEl.textContent = tag;
                metaRow.appendChild(tagEl);
            });

            leftCol.appendChild(metaRow);
            card.appendChild(leftCol);

            // Action Buttons
            const actionsCol = document.createElement('div');
            actionsCol.className = 'flex items-center gap-2 self-end sm:self-center';

            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'btn-restore-session secondary-btn text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer';
            restoreBtn.setAttribute('data-id', session.id);
            restoreBtn.title = 'Restore research session to workspace';
            restoreBtn.innerHTML = `<span class="material-symbols-outlined text-sm">history</span><span>Restore</span>`;
            actionsCol.appendChild(restoreBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-session text-secondary hover:text-red-700 p-1.5 rounded transition-colors cursor-pointer flex items-center';
            deleteBtn.setAttribute('data-id', session.id);
            deleteBtn.title = 'Delete saved session';
            deleteBtn.innerHTML = `<span class="material-symbols-outlined text-base">delete</span>`;
            actionsCol.appendChild(deleteBtn);

            card.appendChild(actionsCol);
            sessionsList.appendChild(card);
        });
    }

    function restoreSavedSession(sessionId) {
        const sessions = getSavedSessions();
        const session = sessions.find(s => s.id === sessionId);
        if (!session) {
            alert('Selected research session could not be located.');
            return;
        }

        // 1. Populate state
        state.currentQuery    = session.query || session.title;
        state.searchResults   = session.searchResults || [];
        state.consensusData   = session.consensusData || null;
        state.matrixData      = session.matrixData || [];
        state.selectedPaperIds = new Set();
        state.selectedPaperId = null;

        // 2. Synchronize UI inputs and headers
        if (searchInput) searchInput.value = state.currentQuery;
        if (workspaceTitle) workspaceTitle.innerText = session.title || state.currentQuery;
        if (welcomeMessage) welcomeMessage.classList.add('hidden');

        // 3. Re-render views
        renderPaperCards();

        if (session.consensusData) {
            applyConsensusData(session.consensusData);
        } else if (papersSampledBadge) {
            papersSampledBadge.innerText = `${state.searchResults.length} Papers Sampled`;
        }

        if (session.matrixData && session.matrixData.length > 0) {
            applyMatrixData(session.matrixData);
        }

        if (state.searchResults.length > 0) {
            runNetworkGraph(state.currentQuery);
        }

        switchToWorkspace();
        switchWorkspaceTab('tab-consensus');
        closeModal(sessionsModal);
        showSessionToast(`✨ Restored session: "${session.title}"`);
    }

    if (sessionsBtn && sessionsModal) {
        sessionsBtn.addEventListener('click', () => {
            if (sessionTitleInput && !sessionTitleInput.value) {
                sessionTitleInput.value = state.currentQuery || '';
            }
            renderSessionsList();
            openModal(sessionsModal, sessionTitleInput);
        });
    }

    if (saveSessionBtn && sessionsModal) {
        saveSessionBtn.addEventListener('click', () => {
            if (sessionTitleInput) {
                sessionTitleInput.value = state.currentQuery || '';
            }
            renderSessionsList();
            openModal(sessionsModal, sessionTitleInput);
        });
    }

    if (sessionsCloseBtn && sessionsModal) {
        sessionsCloseBtn.addEventListener('click', () => closeModal(sessionsModal));
    }

    if (btnSaveCurrentSession) {
        btnSaveCurrentSession.addEventListener('click', () => {
            if (state.searchResults.length === 0 && !state.currentQuery) {
                alert('Please execute a search inquiry before saving a research session.');
                return;
            }

            const title = (sessionTitleInput ? sessionTitleInput.value.trim() : '') || state.currentQuery || 'Research Inquiry';
            const tags = sessionTagsInput ? sessionTagsInput.value : '';

            const res = saveSession({
                title,
                query: state.currentQuery,
                tags,
                searchResults: state.searchResults,
                consensusData: state.consensusData,
                matrixData: state.matrixData
            });

            if (res.success) {
                if (sessionTitleInput) sessionTitleInput.value = '';
                if (sessionTagsInput) sessionTagsInput.value = '';
                if (saveSessionStatus) {
                    saveSessionStatus.textContent = 'Saved!';
                    setTimeout(() => { if (saveSessionStatus) saveSessionStatus.textContent = ''; }, 2500);
                }
                updateSessionsCountBadge();
                renderSessionsList();
                showSessionToast(`✨ Session "${title}" saved!`);
            } else {
                alert(res.error || 'Failed to save session.');
            }
        });
    }

    if (clearAllSessionsBtn) {
        clearAllSessionsBtn.addEventListener('click', () => {
            const count = getSavedSessions().length;
            if (count === 0) return;
            if (confirm(`Are you sure you want to delete all ${count} saved research sessions?`)) {
                clearAllSessions();
                updateSessionsCountBadge();
                renderSessionsList();
                showSessionToast('All saved sessions cleared.');
            }
        });
    }

    if (sessionsList) {
        sessionsList.addEventListener('click', (e) => {
            const restoreBtn = e.target.closest('.btn-restore-session');
            if (restoreBtn) {
                const id = restoreBtn.getAttribute('data-id');
                if (id) restoreSavedSession(id);
                return;
            }

            const deleteBtn = e.target.closest('.btn-delete-session');
            if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                if (id) {
                    deleteSession(id);
                    updateSessionsCountBadge();
                    renderSessionsList();
                    showSessionToast('Session deleted.');
                }
            }
        });
    }

    // Initialize Sessions badge on page load
    updateSessionsCountBadge();


    // ══════════════════════════════════════════════════════
    //  PDF UPLOAD & INGESTION
    // ══════════════════════════════════════════════════════
    if (uploadPdfBtn) {
        uploadPdfBtn.addEventListener('click', () => pdfFileInput.click());
    }

    if (pdfFileInput) {
        pdfFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handlePdfFile(e.target.files[0]);
        });
    }

    async function handlePdfFile(file) {
        if (file.type !== 'application/pdf') {
            alert('Please select a valid academic PDF document.');
            return;
        }

        appendChat('System', `🔧 INGESTING FOLIO: "${file.name}"...`);

        const formData = new FormData();
        formData.append('pdf', file);

        const headers = {};

        try {
            const res = await fetch('/api/pdf-upload', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();

            // Store chunks in client-side state for chat RAG
            state.pdfChunks = data.chunks || [];
            state.formulas  = data.formulas || [];

            const combinedPdfText = (state.pdfChunks || []).map(c => c.text || '').join(' ');
            const pdfMetrics = calculateReadingMetrics(combinedPdfText, { formulaCount: state.formulas.length });
            const pdfBadgeHtml = formatReadingTimeBadge(pdfMetrics);

            const folioBadge = $('folio-reading-badge');
            if (folioBadge) {
                folioBadge.innerHTML = pdfBadgeHtml;
                folioBadge.classList.remove('hidden');
            }

            appendChat('AI', `✅ SUCCESSFULLY INGESTED <strong>${file.name}</strong><br/>distilled ${data.chunkCount || 0} semantic blocks, ${state.formulas.length} mathematical equations.<br/><div class="mt-2 flex items-center gap-2">${pdfBadgeHtml}</div>You can now prompt the assistant about this document.`);
            renderFormulas();

        } catch (err) {
            console.error('PDF upload error:', err);
            appendChat('System', `Failed to ingest PDF. Please select an alternate publication.`);
            pdfClear();
        }
    }

    function pdfClear() {
        pdfFileInput.value = '';
        state.pdfChunks = [];
        state.formulas = [];
        state.selectedFormula = null;
        formulaList.innerHTML = '<span class="text-[11px] text-secondary italic">Upload a PDF to extract math formulas automatically</span>';
        formulaExplanation.classList.add('hidden');
    }

    // ══════════════════════════════════════════════════════
    //  EQUATION EXPLAINER
    // ══════════════════════════════════════════════════════
    function renderFormulas() {
        formulaList.innerHTML = '';
        if (state.formulas.length === 0) {
            formulaList.innerHTML = '<span class="text-[11px] text-secondary italic">No mathematical foundations detected in PDF.</span>';
            return;
        }
        state.formulas.forEach((formula) => {
            const span = document.createElement('span');
            span.className = 'formula-item font-mono text-[9px] border border-primary/20 px-2 py-0.5 cursor-pointer hover:bg-primary/5';
            renderLatex(formula.equation, span, { displayMode: false });
            span.addEventListener('click', () => {
                document.querySelectorAll('.formula-item').forEach(s => s.classList.remove('selected', 'solid-texture-fill', 'text-background'));
                span.classList.add('selected', 'solid-texture-fill', 'text-background');
                explainEquation(formula);
            });
            formulaList.appendChild(span);
        });
    }

    async function explainEquation(formula) {
        formulaExplanation.classList.remove('hidden');
        selectedFormulaText.innerHTML = '';
        renderLatex(formula.equation, selectedFormulaText, { displayMode: true });
        selectedFormulaDesc.innerHTML = '<div class="spinner" style="margin:10px auto;"></div>';

        try {
            const res = await fetch('/api/pdf-explain-math', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ equation: formula.equation, context: formula.context })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();

            selectedFormulaDesc.innerHTML = `
                <strong class="text-primary not-italic font-bold">Derivation & Variables:</strong><br/>
                ${(data.breakdown || '').replace(/\n/g, '<br/>')}<br/><br/>
                <strong class="text-primary not-italic font-bold">Physical Analogy:</strong><br/>
                <em>${data.analogy || 'N/A'}</em>
            `;
            renderMathInContainer(selectedFormulaDesc);
        } catch {
            selectedFormulaDesc.innerText = 'Could not compile physical explanation. Verify credentials.';
        }
    }

    // ══════════════════════════════════════════════════════
    //  AGENTIC CHAT ASSISTANT
    // ══════════════════════════════════════════════════════
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMsg = chatInput.value.trim();
        if (!userMsg) return;

        appendChat('User', `QUERY: ${userMsg}`);
        chatInput.value = '';
        appendTypingIndicator();

        try {
            const res = await fetch('/api/pdf-chat', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    message: userMsg,
                    chunks: state.pdfChunks,
                    searchResults: state.searchResults
                })
            });

            removeTypingIndicator();

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Agent failed to respond.');
            }
            const data = await res.json();

            // Append execution logs as system notifications
            if (data.logs && data.logs.length > 0) {
                data.logs.forEach(log => appendChat('System', `🔧 ${log}`));
            }

            appendChat('AI', data.reply || 'No response generated.');

        } catch (err) {
            removeTypingIndicator();
            appendChat('AI', `System Failure: ${err.message}`);
        }
    });
});
