// AbstractiFy Frontend JavaScript Logic
// Fully handles: Search, Consensus, Matrix, Network Graph, PDF Ingestion, Chat Agent, Equation Explainer, and Transitions

document.addEventListener('DOMContentLoaded', () => {
    // ─── State Management ───
    let storedGeminiKey = localStorage.getItem('gemini_key') || '';
    if (storedGeminiKey.startsWith('AQ.Ab8RN6JNoL')) {
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
    const $ = id => document.getElementById(id);

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
    function switchToWorkspace() {
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

    function switchToLanding() {
        document.body.classList.remove('show-app');
        document.body.classList.add('show-landing');
        appView.classList.add('hidden');
        landingView.classList.remove('hidden');
    }

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
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

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

    // ─── Render Cited Publication Cards in Sidebar ───
    function renderPaperCards() {
        resultsList.innerHTML = '';
        state.searchResults.forEach((paper, idx) => {
            const card = document.createElement('div');
            const stance = paper.consensusStance || 'neutral';
            
            // Set styles matching editorial theme
            let stanceStyleClass = 'bg-primary/5 text-secondary';
            if (stance === 'supports') {
                stanceStyleClass = 'bg-accent-supporting text-primary border border-primary/10';
            } else if (stance === 'contradicts') {
                stanceStyleClass = 'bg-accent-contradicts text-red-800 border border-red-200';
            } else if (stance === 'neutral') {
                stanceStyleClass = 'bg-accent-mixed text-purple-900 border border-purple-200';
            }

            card.className = `folio-card p-5 space-y-3 group cursor-pointer ${state.selectedPaperId === paper.id ? 'border-primary bg-primary/[0.015]' : 'editorial-rule'}`;
            
            const idxStr = String(idx + 1).padStart(2, '0');
            card.innerHTML = `
                <div class="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest text-secondary">
                    <span class="${stanceStyleClass} px-2 py-0.5">${paper.year || 'N/A'} · ${stance}</span>
                    <span>#${idxStr}</span>
                </div>
                <h5 class="serif-heading text-lg leading-snug group-hover:text-primary transition-colors">${paper.title}</h5>
                <p class="font-mono text-[10px] text-primary/60">${(paper.authors || []).join(', ') || 'Unknown Author'}</p>
            `;

            card.addEventListener('click', () => {
                document.querySelectorAll('#results-list .folio-card').forEach(c => c.classList.remove('border-primary', 'bg-primary/[0.015]'));
                card.classList.add('border-primary', 'bg-primary/[0.015]');
                state.selectedPaperId = paper.id;
                appendChat('System', `Cited Item #${idxStr} selected: "${paper.title}"`);
                loadCitationContext(paper);
            });

            resultsList.appendChild(card);
        });
    }

    // ══════════════════════════════════════════════════════
    //  CONSENSUS METER
    // ══════════════════════════════════════════════════════
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

                barSupports.style.width = `${supportsPct}%`;
                barNeutral.style.width = `${neutralPct}%`;
                barContradicts.style.width = `${contradictsPct}%`;

                statSupports.innerText = `Supports (${supportsPct}%)`;
                statNeutral.innerText = `Mixed (${neutralPct}%)`;
                statContradicts.innerText = `Opposes (${contradictsPct}%)`;
            } else {
                barSupports.style.width = '0%';
                barNeutral.style.width = '0%';
                barContradicts.style.width = '0%';
            }

            consensusProgressBox.classList.remove('hidden');
            consensusSummaryText.innerText = data.summaryText || 'Synthesis complete.';
            consensusSummaryText.classList.remove('hidden');

            if (data.paperStances) {
                state.searchResults.forEach(p => {
                    if (data.paperStances[p.id]) p.consensusStance = data.paperStances[p.id];
                });
                renderPaperCards();
            }
        } catch (err) {
            console.error('Consensus error:', err);
            consensusSummaryText.innerText = `Could not classify consensus. ${err.message}`;
            consensusSummaryText.classList.remove('hidden');
        }
    }

    // ══════════════════════════════════════════════════════
    //  STUDY COMPARISON MATRIX
    // ══════════════════════════════════════════════════════
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
            state.matrixData = data.matrix || [];

            matrixBody.innerHTML = '';
            exportCsvBtn.classList.remove('hidden');

            (data.matrix || []).forEach(row => {
                const tr = document.createElement('tr');
                tr.className = 'border-b editorial-rule hover:bg-primary/[0.015] transition-colors';
                tr.innerHTML = `
                    <td class="py-6 font-semibold text-primary text-sm max-w-xs">${row.title || 'N/A'}</td>
                    <td class="py-6 text-secondary italic text-sm">${row.datasetSize || 'Unknown'}</td>
                    <td class="py-6 font-mono text-[11px] text-secondary max-w-xs">${row.methodology || 'N/A'}</td>
                    <td class="py-6 font-mono text-[11px] text-secondary max-w-xs">${row.outcomes || 'N/A'}</td>
                    <td class="py-6 font-mono text-[11px] text-secondary max-w-xs">${row.limitations || 'N/A'}</td>
                `;
                matrixBody.appendChild(tr);
            });
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

            // Node visual options styled like an academic blueprint
            const nodes = new vis.DataSet(data.nodes.map(n => ({
                id: n.id,
                label: n.title ? (n.title.length > 20 ? n.title.substring(0, 18) + '...' : n.title) : '?',
                title: `${n.title} (${n.year || 'N/A'}, Citations: ${n.citations || 0})`,
                value: n.citations || 4,
                color: {
                    background: '#FDFAF6',
                    border: '#002147',
                    hover: { background: '#E8F0F2', border: '#002147' },
                    highlight: { background: '#E8F0F2', border: '#002147' }
                },
                shape: 'dot',
                borderWidth: 1.5,
                font: { color: '#1A1A1A', face: 'Times New Roman', size: 10 }
            })));

            const edges = new vis.DataSet(data.edges.map(e => ({
                from: e.source,
                to: e.target,
                arrows: 'to',
                color: { color: '#D1CDC7', highlight: '#002147' }
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

            appendChat('AI', `✅ SUCCESSFULLY INGESTED <strong>${file.name}</strong><br/>distilled ${data.chunkCount || 0} semantic blocks, ${state.formulas.length} mathematical equations. You can now prompt the assistant about this document.`);
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
            span.innerText = formula.equation;
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
        selectedFormulaText.innerText = formula.equation;
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
