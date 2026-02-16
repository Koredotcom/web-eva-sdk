import { cloneDeep, keyBy } from 'lodash';
import store from '../redux/store.js';
import { createCloseIcon } from '../templateRenderer/icons-library.js';
import { upgradeCustomElements } from '../templateRenderer/templateRenderer.js';
import { setUnifiedSearchResults } from '../redux/globalSlice.js';
import { advanceSearch, searchResultFilters } from '../redux/actions/global.action.js';
import RenderAttachments from './RenderAttachments.js';
import GPTFormSummary from './GPTFormSummary.js';
import TableDataSummary from './TableDataSummary.js';
import BotSummary from './BotSummary.js';
import KnowledgeSearchResults from './KnowledgeSearchResults.js';
import ResultTemplate from './ResultTemplate.js';

/**
 * SourcesSidebar - A vanilla JS implementation of the Sources Sidebar
 * Handles single and multi sources with all conditions from Kora-React
 */
class SourcesSidebar {
    constructor(config) {
        this.config = config;
        this.element = null;
        this.drawer = null;
        this.container = null;
        this.overlay = null;
        this._overlayListenerAttached = false;
        this._escapeListenerAttached = false;
        this.unifiedSearchResults = null;
        this.answerSources = null; // Store answer sources separately
        this.activeInnerTab = null; // Track active inner tab
        this.loadingTabs = new Set(); // Track loading state for tabs
        this.loadingTabs = new Set(); // Track loading state for tabs
        this._documentTabListenerAttached = false; // Flag to prevent duplicate global listeners
        this._tabSwitchTimeout = null; // For debouncing
        this.init();
    }

    /**
     * Initialize the sidebar drawer
     */
    init() {
        this.container = this.resolveContainerElement();
        this.ensureContainerIsPositioned(this.container);

        // Create drawer if it doesn't exist
        if (!document.getElementById('sources-sidebar-drawer')) {
            const drawer = document.createElement('sl-drawer');
            drawer.id = 'sources-sidebar-drawer';
            drawer.setAttribute('placement', 'end');
            drawer.setAttribute('class', 'sources-sidebar-drawer');
            drawer.style.setProperty('--size', '40%');
            drawer.setAttribute('no-header', 'true');
            // Ensure the drawer renders within its container (Shoelace option)
            drawer.setAttribute('contained', '');
            // IMPORTANT: contained drawers must be placed inside the container element (not directly in <body>)
            this.container.appendChild(drawer);
            this.drawer = drawer;
        } else {
            this.drawer = document.getElementById('sources-sidebar-drawer');
            // Ensure attribute exists even if the drawer was created earlier
            this.drawer?.setAttribute?.('contained', '');
            // Ensure it is contained to the target element (move it if needed)
            if (this.drawer && this.container && this.drawer.parentElement !== this.container) {
                this.container.appendChild(this.drawer);
            }
        }

        // Contained drawers are intentionally non-modal in Shoelace (no backdrop).
        // If we still want an overlay/backdrop, we provide one ourselves.
        this.ensureOverlay(this.container);

        // Subscribe to Redux store for answerSources updates
        this.unsubscribe = store.subscribe(() => {
            const state = store.getState()?.global;
            if (state?.answerSources !== this.answerSources) {
                this.answerSources = state?.answerSources;
                if (this.drawer?.hasAttribute('open')) {
                    this.render();
                }
            }
        });
    }

    /**
     * Create "All" tab by combining all tabs (similar to makeALLtabSearchResults in Kora-React)
     * Only creates "All" tab if there's more than 1 tab
     */
    makeALLtabSearchResults(advanceSearchResponse) {
        if (!advanceSearchResponse?.data?.tab || advanceSearchResponse.data.tab.length <= 1) {
            return advanceSearchResponse;
        }

        let allDocCount = 0;
        advanceSearchResponse.data.tab.forEach((t) => {
            allDocCount += (t?.doc_count || 0);
        });

        let allResults = [];
        Object.values(advanceSearchResponse?.data?.results || {}).forEach(r => {
            if (r?.data && Array.isArray(r.data)) {
                allResults = [...allResults, ...r.data];
            }
        });

        // Sort by createdOn descending (if available)
        allResults = allResults.sort((a, b) => {
            const aDate = a?.createdOn ? new Date(a.createdOn) : new Date(0);
            const bDate = b?.createdOn ? new Date(b.createdOn) : new Date(0);
            return bDate - aDate;
        });

        // Filter out existing "all" tab before adding the new one
        const tabsWithoutAll = advanceSearchResponse.data.tab.filter(t => t?.key !== "all") || [];

        return {
            ...advanceSearchResponse,
            data: {
                ...advanceSearchResponse.data,
                tab: [
                    { key: "all", name: "All", doc_count: allDocCount },
                    ...tabsWithoutAll
                ],
                results: {
                    ...advanceSearchResponse.data.results,
                    all: {
                        data: allResults,
                        doc_count: allDocCount
                    }
                }
            }
        };
    }

    /**
     * Open the sidebar with sources data
     * @param {Object} sourcesData - The answer sources data
     * @param {string} userSelectedTab - Optional: 'searchResults' to open in search tab
     */
    open(sourcesData = null, userSelectedTab = null) {
        if (sourcesData) {
            this.answerSources = cloneDeep(sourcesData);
            // Update Redux state if needed
            // store.dispatch(setAnswerSources(sourcesData));
        } else {
            // Get from Redux state
            const state = store.getState()?.global;
            this.answerSources = state?.answerSources || null;
        }

        if (!this.answerSources) {
            console.warn('No answer sources data available');
            return;
        }

        this.userSelectedTab = userSelectedTab;
        if (userSelectedTab === 'searchResults') {
            this.selectedTab = 'search';
            // Create "All" tab if there's more than 1 tab (similar to Kora-React)
            let unifiedData = cloneDeep(this.answerSources);
            if (unifiedData?.data?.tab?.length > 1) {
                unifiedData = this.makeALLtabSearchResults(unifiedData);
            }
            this.unifiedSearchResults = unifiedData;
            // Update Redux state
            store.dispatch(setUnifiedSearchResults(this.unifiedSearchResults));
        } else {
            this.selectedTab = 'sources';
        }

        this.render();
        this.show();
    }

    /**
     * Close the sidebar
     */
    close() {
        this.answerSources = null;
        this.unifiedSearchResults = null;
        this.hide();
    }

    /**
     * Show the drawer
     */
    show() {
        if (this.drawer) {
            try {
                if (typeof this.drawer.show === 'function') {
                    this.drawer.show();
                } else {
                    this.drawer.setAttribute('open', '');
                }
            } catch (e) {
                this.drawer.setAttribute('open', '');
            }
            this.showOverlay();
        }
    }

    /**
     * Hide the drawer
     */
    hide() {
        if (this.drawer) {
            try {
                if (typeof this.drawer.hide === 'function') {
                    this.drawer.hide();
                } else {
                    this.drawer.removeAttribute('open');
                }
            } catch (e) {
                this.drawer.removeAttribute('open');
            }
        }
        this.hideOverlay();
    }

    /**
     * Create (or reuse) a custom overlay for contained drawers.
     * Shoelace's contained drawers don't render an overlay by design.
     */
    ensureOverlay(containerEl = null) {
        const container = containerEl || this.container || this.resolveContainerElement();
        this.ensureContainerIsPositioned(container);

        if (this.overlay && container?.contains?.(this.overlay)) return;

        let overlay = document.getElementById('sources-sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sources-sidebar-overlay';
            overlay.className = 'sources-sidebar-overlay';
            overlay.setAttribute('aria-hidden', 'true');
            container.appendChild(overlay);
        } else if (container && overlay.parentElement !== container) {
            // Move existing overlay into the container
            container.appendChild(overlay);
        }

        this.overlay = overlay;

        if (!this._overlayListenerAttached) {
            this._overlayClickHandler = () => this.closeSourcesPanel();
            this.overlay.addEventListener('click', this._overlayClickHandler);
            this._overlayListenerAttached = true;
        }
    }

    showOverlay() {
        // Only needed when the drawer is contained (Shoelace disables overlay + ESC in that mode)
        if (!this.drawer?.hasAttribute?.('contained')) return;
        this.ensureOverlay(this.container);
        this.overlay?.classList?.add('is-open');

        if (!this._escapeListenerAttached) {
            this._escapeHandler = (e) => {
                if (e?.key === 'Escape' && this.drawer?.hasAttribute?.('open')) {
                    this.closeSourcesPanel();
                }
            };
            document.addEventListener('keydown', this._escapeHandler);
            this._escapeListenerAttached = true;
        }
    }

    hideOverlay() {
        if (!this.drawer?.hasAttribute?.('contained')) return;
        this.overlay?.classList?.remove('is-open');

        if (this._escapeListenerAttached && this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeListenerAttached = false;
        }
    }

    /**
     * Resolve the container element that will contain the drawer.
     * We avoid appending the drawer directly to <body>.
     */
    resolveContainerElement() {
        const candidate =
            // Prefer an explicitly provided container
            (this.config?.container instanceof HTMLElement && this.config.container) ||
            (this.config?.containerEl instanceof HTMLElement && this.config.containerEl) ||
            (this.config?.rootEl instanceof HTMLElement && this.config.rootEl) ||
            // Common containers across demo + SDK parent component
            document.getElementById('parent-home-container') ||
            document.querySelector('.landing-page-container') ||
            document.querySelector('.chatInterfaceSec') ||
            document.querySelector('.chatInterfaceDemo') ||
            document.getElementById('chatSec') ||
            document.getElementById('chat-sec-container') ||
            document.getElementById('root');

        if (candidate) return candidate;

        // Last resort: create a dedicated SDK container inside <body>
        let sdkContainer = document.getElementById('eva-sdk-container');
        if (!sdkContainer) {
            sdkContainer = document.createElement('div');
            sdkContainer.id = 'eva-sdk-container';
            document.body.appendChild(sdkContainer);
        }
        return sdkContainer;
    }

    /**
     * Shoelace requires the parent to be position: relative for contained drawers.
     */
    ensureContainerIsPositioned(container) {
        if (!container || container === document.body) return;
        try {
            const pos = window.getComputedStyle(container).position;
            if (!pos || pos === 'static') {
                container.style.position = 'relative';
            }
        } catch (e) {
            // ignore
        }
    }

    /**
     * Handle tab switching
     */
    handleTabSwitch(tab) {
        this.selectedTab = tab;
        if (tab === 'search') {
            // Create "All" tab if there's more than 1 tab (similar to Kora-React)
            let unifiedData = cloneDeep(this.answerSources);
            if (unifiedData?.data?.tab?.length > 1) {
                unifiedData = this.makeALLtabSearchResults(unifiedData);
            }
            this.unifiedSearchResults = unifiedData;
            // Update Redux state for unifiedSearchResults
            store.dispatch(setUnifiedSearchResults(this.unifiedSearchResults));
            // Re-render to show updated tabs
            this.render();
        } else {
            // Re-render so the div-based top section shows the correct content
            this.render();
        }
    }

    /**
     * Close sources panel handler
     */
    closeSourcesPanel() {
        this.answerSources = null;
        this.unifiedSearchResults = null;
        this.hide();
        // Dispatch event if needed
        // eventBus.dispatch('modifyRightPanel', "reverse");
    }

    /**
     * Handle list data rendering based on conditions
     */
    handleListData() {
        if (!this.answerSources) return '';

        let sourcesData = cloneDeep(this.answerSources);

        // Bot Summary
        if (sourcesData?.viewType === 'threadView') {
            let newBotConversations = keyBy(sourcesData?.botConversation, 'messageId');
            return BotSummary.render({
                data: sourcesData,
                botConversation: sourcesData?.botConversation,
                newBotConversations: newBotConversations
            });
        }

        // GPT Form Summary
        if (!!sourcesData?.context &&
            (sourcesData?.context?.type === "gptAgent" ||
                sourcesData?.context?.agentType === "gptAgent" ||
                sourcesData?.context?.agentType === 'galeAgent')) {
            return GPTFormSummary.render({ summaryData: sourcesData });
        }

        // For search_answer templateType, use data array as sources if available
        if (sourcesData?.templateType === 'search_answer' &&
            sourcesData?.data &&
            Array.isArray(sourcesData.data) &&
            sourcesData.data.length > 0) {
            const transformedData = {
                ...sourcesData,
                sources: sourcesData.data
            };
            return `
                <div class="MultiSourceListView">
                    ${RenderAttachments.render({ data: transformedData })}
                </div>
            `;
        }
        // Sources List View (multiple sources or specific conditions)
        else if (sourcesData?.sources?.length > 1 ||
            (sourcesData?.sources?.length === 1 &&
                (!sourcesData?.hasData ||
                    sourcesData?.viewType === 'knowledge' ||
                    (sourcesData?.viewType === 'message' && sourcesData?.templateType === 'search_results')))) {
            return `
                <div class="MultiSourceListView">
                    ${RenderAttachments.render({ data: sourcesData })}
                </div>
            `;
        }
        // Single Source List View
        else if (sourcesData?.sources?.length === 1 &&
            sourcesData?.viewType === 'list' &&
            sourcesData?.hasData) {
            return `
                <div class="threadListGroup sidebarListGroup">
                    ${ResultTemplate.render({ results: sourcesData, sidebar: true })}
                </div>
            `;
        }
        else {
            return '<div>Trouble Rendering Sources. Please Try Again......</div>';
        }
    }

    /**
     * Render the header
     */
    renderHeader() {
        if (!this.answerSources) return '';

        let headerTitle = '';
        let showSwitchTabs = false;
        let showMoreSearchResults = false;

        let sourcesData = cloneDeep(this.answerSources);

        // For search_answer, get sources count from data array
        const sourcesCount = sourcesData?.templateType === 'search_answer' && sourcesData?.data?.length
            ? sourcesData.data.length
            : sourcesData?.sources?.length || 0;

        if (sourcesCount === 1) {
            const source = sourcesData?.templateType === 'search_answer' && sourcesData?.data?.[0]
                ? sourcesData.data[0]
                : sourcesData?.sources?.[0];
            headerTitle = this.selectedTab === 'sources'
                ? source?.templateType === 'gpt_form_template'
                    ? source?.title
                    : sourcesData?.viewType === 'table'
                        ? (sourcesData?.templateType === 'search_answer' && sourcesData?.data?.[0]?.name
                            ? sourcesData.data[0].name
                            : source?.title || sourcesData?.sources?.[0]?.title || 'Data')
                        : 'Sources'
                : sourcesData?.question;
        }

        if (sourcesData?.viewType === 'threadView' && sourcesData?.status === 'completed') {
            headerTitle = sourcesData?.sources?.[0]?.title;
        }

        if (sourcesData?.templateType === 'search_results' && sourcesCount > 1) {
            showSwitchTabs = true;
        } else if (sourcesData?.templateType === 'search_results' &&
            sourcesCount === 1 &&
            sourcesData?.sources?.[0]?.source !== 'llm') {
            showSwitchTabs = true;
        } else if (sourcesData?.from === 'thoughts') {
            showMoreSearchResults = true;
        }

        // Return header without tabs - tabs will be in the main render method
        return `
            <div class="right-panel-header">
                <span class="close-icon" id="sources-sidebar-close">${createCloseIcon({ size: 10, color: "#667085" })}</span>
                ${showSwitchTabs || showMoreSearchResults ? '' : `<span class="search-header">${headerTitle || 'Data'}</span>`}
            </div>
        `;
    }

    /**
     * Render the sidebar content
     */
    render() {
        if (!this.drawer || !this.answerSources) return;

        const header = this.renderHeader();

        let sourcesData = cloneDeep(this.answerSources);
        const sourcesCount = sourcesData?.templateType === 'search_answer' && sourcesData?.data?.length
            ? sourcesData.data.length
            : sourcesData?.sources?.length || 0;

        let showSwitchTabs = false;
        let showMoreSearchResults = false;

        if (sourcesData?.templateType === 'search_results' && sourcesCount > 1) {
            showSwitchTabs = true;
        } else if (sourcesData?.templateType === 'search_results' &&
            sourcesCount === 1 &&
            sourcesData?.sources?.[0]?.source !== 'llm') {
            showSwitchTabs = true;
        } else if (sourcesData?.from === 'thoughts') {
            showMoreSearchResults = true;
        }

        // Top section: div-based switcher (Sources / More search results). Only bottom tab-group (e.g. Jira Cloud) uses sl-tab-group.
        if (showSwitchTabs || showMoreSearchResults) {
            // For viewType === "table", always render TableDataSummary
            // For search_answer with data array but viewType !== "table", handleListData will handle it
            const sourcesContent = this.answerSources?.viewType === "table"
                ? TableDataSummary.render({
                    summaryData: this.answerSources,
                    scrollBottom: () => { },
                    closeSourcesPanel: () => this.closeSourcesPanel()
                })
                : this.handleListData();

            // Pass the activeInnerTab to KnowledgeSearchResults so it renders with the correct tab active
            const searchResultsContent = KnowledgeSearchResults.render({
                unifiedSearchResults: this.unifiedSearchResults || this.answerSources,
                activeTab: this.activeInnerTab,
                loadingTabs: this.loadingTabs
            });

            const navItems = showSwitchTabs
                ? [
                    { panel: 'sources', label: `Sources (${sourcesCount})` },
                    { panel: 'search', label: 'More search results' }
                ]
                : [{ panel: 'search', label: 'More search results' }];

            const navHtml = navItems.map(({ panel, label }) =>
                `<button type="button" class="sources-nav-item ${this.selectedTab === panel ? 'active' : ''}" data-panel="${panel}">${label}</button>`
            ).join('');

            this.drawer.innerHTML = `
                ${header}
                <div class="sources-top-section">
                    <div class="sources-nav-div" role="tablist">
                        ${navHtml}
                    </div>
                    <div class="sources-content-area">
                        ${showSwitchTabs && this.selectedTab === 'sources' ? `
                            <div class="right-panel-tabs-wrapper">
                                ${sourcesContent}
                            </div>
                        ` : ''}
                        ${this.selectedTab === 'search' ? searchResultsContent : ''}
                    </div>
                </div>
            `;

            // Upgrade Shoelace custom elements (for KnowledgeSearchResults sl-tab-group inside content)
            if (this.drawer && upgradeCustomElements) {
                upgradeCustomElements(this.drawer);
            }
        } else {
            // No tabs - just show sources content
            const content = this.answerSources?.viewType === "table"
                ? TableDataSummary.render({
                    summaryData: this.answerSources,
                    scrollBottom: () => { },
                    closeSourcesPanel: () => this.closeSourcesPanel()
                })
                : this.handleListData();

            this.drawer.innerHTML = `
                ${header}
                <div class="right-panel-tabs-wrapper">
                    ${content}
                </div>
            `;
        }

        // Attach event listeners after a short delay to ensure Shoelace components are initialized
        setTimeout(() => {
            this.attachEventListeners();
        }, 100);

        // Trigger initial search if coming from 'thoughts' and in search tab
        // Similar to Kora-React useEffect logic
        if (this.answerSources?.from === 'thoughts' && (this.selectedTab === 'search' || !showSwitchTabs)) {
            // Only trigger if we don't have results yet for the default tab
            const defaultTabKey = this.answerSources?.tabKey || this.answerSources?.data?.tab?.[0]?.key;
            if (defaultTabKey && this.unifiedSearchResults) {
                const currentTabData = this.unifiedSearchResults.data?.results?.[defaultTabKey]?.data;
                // If data is missing or empty, trigger fetch
                if (!currentTabData || currentTabData.length === 0) {
                    // Debounce slightly to avoid double triggers
                    if (!this._initialFetchTriggered) {
                        this.activeInnerTab = defaultTabKey; // Set active tab before trigger
                        this.triggerSearch(defaultTabKey);
                        this._initialFetchTriggered = true;
                        // Reset flag after some time
                        setTimeout(() => this._initialFetchTriggered = false, 2000);
                    }
                }
            }
        }
    }

    /**
     * Trigger search result filters (fetch data for a specific tab)
     * Replicates searchResultFilters action from Kora-React
     */
    async triggerSearch(tabKey) {
        if (!this.unifiedSearchResults) return;

        // Track the tab we are fetching for so it stays active
        this.activeInnerTab = tabKey;

        // userId is not needed for searchResultFilters (dataFilters endpoint)
        // const state = store.getState()?.global;
        // const userId = state?.profile?.data?.id || state?.profile?.data?.userInfo?.id || state?.config?.data?.userId;

        const { boardId, messageId, question, from, msgId } = this.unifiedSearchResults;

        // Prepare params and payload matching Kora-React/curl
        const params = {
            boardId: this.unifiedSearchResults.boardId,
            messageId: this.unifiedSearchResults.messageId
        };

        const payload = {
            question: this.unifiedSearchResults.question,
            tab: tabKey
        };

        if (!payload.question) {
            payload.question = 'Fetch Search Results';
        }

        // Mark tab as loading
        this.loadingTabs.add(tabKey);
        this.render();

        try {
            // Show loading if needed (maybe add a loader to the tab content)
            const tabPanel = this.drawer?.querySelector(`sl-tab-panel[name="${tabKey}"] .tab-content`);

            // Use searchResultFilters instead of advanceSearch
            const response = await store.dispatch(searchResultFilters({
                params,
                payload
            }));

            if (response.payload && !response.error) {
                this.postFilterUpdation({ res: response.payload }, tabKey);
            } else {
                console.error('SourcesSidebar: Search failed', response.error);
                this.loadingTabs.delete(tabKey);
                // Render error state in tab
                if (tabPanel) tabPanel.innerHTML = '<div class="error-wrapper">Failed to load results</div>';
                this.render();
            }
        } catch (error) {
            console.error('SourcesSidebar: Error triggering search', error);
            this.loadingTabs.delete(tabKey);
            this.render();
        }
    }

    /**
     * Handle post filter updation (merge new results)
     * Replicates postFilterUpdation from Kora-React
     */
    postFilterUpdation(data, tab) {
        console.log(`SourcesSidebar: PostFilterUpdation for tab: ${tab}`, data);

        let _unifiedSearchResults = cloneDeep(this.unifiedSearchResults || {});
        if (!_unifiedSearchResults.data) _unifiedSearchResults.data = {};

        // Concatenate tabs by checking keys - only add unique tabs
        if (data?.res?.data?.tab) {
            const existingTabs = _unifiedSearchResults.data.tab || [];
            const newTabs = data.res.data.tab || [];
            const existingTabKeys = new Set(existingTabs.map(t => t?.key));
            const uniqueNewTabs = newTabs.filter(t => !existingTabKeys.has(t?.key));
            _unifiedSearchResults.data.tab = [...existingTabs, ...uniqueNewTabs];
        }

        // Update results data for matching keys
        if (data?.res?.data?.results) {
            const resultsData = data.res.data.results;

            // Generate results object if not present
            if (!_unifiedSearchResults.data.results) _unifiedSearchResults.data.results = {};

            // Check for direct data structure (some APIs return results.data directly)
            if (resultsData.data && !resultsData[tab]) {
                const existingData = _unifiedSearchResults.data.results?.[tab]?.data || [];
                const newData = resultsData.data || [];

                _unifiedSearchResults.data.results = {
                    ..._unifiedSearchResults.data.results,
                    [tab]: {
                        data: [...existingData, ...newData]
                    }
                };
            } else {
                // Merge keyed results structure
                Object.keys(resultsData).forEach(responseKey => {
                    // Try to find a matching tab key in our existing results (case-insensitive check)
                    let targetTabKey = responseKey;

                    // If the response key matches the requested tab (case-insensitive), force it to the requested tab key
                    if (tab && responseKey.toLowerCase() === tab.toLowerCase()) {
                        targetTabKey = tab;
                    }

                    const existingTabData = _unifiedSearchResults.data.results?.[targetTabKey]?.data || [];
                    const sourceData = resultsData[responseKey];
                    const newTabData = sourceData?.data || [];

                    console.log(`SourcesSidebar: Merging ${newTabData.length} items from API key '${responseKey}' into Tab '${targetTabKey}'`);

                    _unifiedSearchResults.data.results[targetTabKey] = {
                        ..._unifiedSearchResults.data.results?.[targetTabKey],
                        ...sourceData,
                        data: [...existingTabData, ...newTabData]
                    };
                });
            }

            // Update filters if present
            if (data?.res?.data?.filters) {
                _unifiedSearchResults.data.filters = data.res.data.filters;
            }
        }

        // Only create ALL tab if there's more than 1 tab
        const tabCount = _unifiedSearchResults?.data?.tab?.length || 0;
        if (tabCount > 1) {
            _unifiedSearchResults = this.makeALLtabSearchResults(_unifiedSearchResults);
        }

        this.unifiedSearchResults = _unifiedSearchResults;

        // Remove from loading set
        this.loadingTabs.delete(tab);

        // Update Redux state
        store.dispatch(setUnifiedSearchResults(this.unifiedSearchResults));

        // Re-render to show updated results
        this.render();

        // Ensure the tab that was clicked remains active in the UI
        setTimeout(() => {
            const tabsGroup = this.drawer?.querySelector('sl-tab-group#knowledge-search-tabs');
            if (tabsGroup && tab) {
                try {
                    // Force show the tab to ensure it is selected
                    tabsGroup.show(tab);
                } catch (e) {
                    console.warn(`SourcesSidebar: Failed to switch to tab '${tab}'`, e);
                }
            }
        }, 150);
    }

    /**
     * Attach event listeners
     */
    /**
     * Attach event listeners
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button - needs to be re-attached every render as it's part of innerHTML
        const closeBtn = this.drawer?.querySelector('#sources-sidebar-close');
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => this.closeSourcesPanel());
        }

        // Top section: div-based nav item clicks (Sources / More search results)
        const navItems = this.drawer?.querySelectorAll('.sources-nav-item');
        if (navItems?.length) {
            navItems.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', () => {
                    const panel = newBtn.getAttribute('data-panel');
                    if (panel) this.handleTabSwitch(panel);
                });
            });
        }

        // --- Tab Switching Logic (Dual Strategy: Global + Local) ---

        // 1. Local Listener: Try to attach directly to the element if found
        // This handles cases where bubbling might be blocked or delayed
        const tabsGroup = this.drawer?.querySelector('#knowledge-search-tabs');
        if (tabsGroup) {
            // Remove old listener to be safe (though cloning/innerHTML usually wipes it)
            tabsGroup.removeEventListener('sl-tab-show', this._handleLocalTabShow);

            this._handleLocalTabShow = (event) => {
                console.log('SourcesSidebar: Local listener caught tab switch', event.detail);
                this._processTabSwitch(event.detail.name);
            };
            tabsGroup.addEventListener('sl-tab-show', this._handleLocalTabShow);
            console.log('SourcesSidebar: Attached local listener to #knowledge-search-tabs');
        }

        // 2. Global Document Listener: Backup for dynamic elements
        if (!this._documentTabListenerAttached) {
            this._handleDocumentTabShow = (event) => {
                const target = event.target;
                // Log all tab shows to debug
                if (event.type === 'sl-tab-show') {
                    // console.log('SourcesSidebar: Document saw sl-tab-show from', target);
                }

                // Check if the event originated from our specific tab group
                if (target?.id === 'knowledge-search-tabs') {
                    console.log(`SourcesSidebar: Global listener caught tab switch -> '${event.detail.name}'`);
                    this._processTabSwitch(event.detail.name);
                }
            };

            document.addEventListener('sl-tab-show', this._handleDocumentTabShow);
            this._documentTabListenerAttached = true;
            console.log('SourcesSidebar: Attached global document listener for sl-tab-show');
        }
    }

    /**
     * Process tab switch logic
     */
    _processTabSwitch(name) {
        if (!name) return;

        // Prevent double processing if both listeners catch it (debounce/flag)
        const now = Date.now();
        if (this._lastProcessedTab === name && (now - this._lastProcessedTime < 500)) {
            // console.log(`SourcesSidebar: Ignoring duplicate event for '${name}'`);
            return;
        }
        this._lastProcessedTab = name;
        this._lastProcessedTime = now;

        if (this.unifiedSearchResults) {
            const existingData = this.unifiedSearchResults.data?.results?.[name]?.data;
            const hasData = existingData && existingData.length > 0;

            console.log(`SourcesSidebar: Processing '${name}'. Has Data: ${hasData}`);

            // Fetch if no data is present
            if (!hasData) {
                console.log(`SourcesSidebar: Data missing for '${name}', triggering searchAction...`);
                this.triggerSearch(name);
            }
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.drawer && this.drawer.parentElement) {
            this.drawer.parentElement.removeChild(this.drawer);
        }
        if (this.overlay && this.overlay.parentElement) {
            if (this._overlayListenerAttached && this._overlayClickHandler) {
                this.overlay.removeEventListener('click', this._overlayClickHandler);
                this._overlayListenerAttached = false;
            }
            this.overlay.parentElement.removeChild(this.overlay);
        }
        if (this._escapeListenerAttached && this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeListenerAttached = false;
        }
        // Remove global listener
        if (this._documentTabListenerAttached && this._handleDocumentTabShow) {
            document.removeEventListener('sl-tab-show', this._handleDocumentTabShow);
            this._documentTabListenerAttached = false;
        }
    }
}

// Export singleton instance
let sourcesSidebarInstance = null;

export default function SourcesSidebarInstance() {
    if (!sourcesSidebarInstance) {
        sourcesSidebarInstance = new SourcesSidebar();
    }
    return sourcesSidebarInstance;
}
