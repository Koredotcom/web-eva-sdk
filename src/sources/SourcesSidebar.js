import { cloneDeep, keyBy } from 'lodash';
import store from '../redux/store.js';
import { createCloseIcon } from '../templateRenderer/icons-library.js';
import { upgradeCustomElements } from '../templateRenderer/templateRenderer.js';
import { setUnifiedSearchResults } from '../redux/globalSlice.js';
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
    constructor() {
        this.drawer = null;
        this.selectedTab = 'sources';
        this.answerSources = null;
        this.unifiedSearchResults = null;
        this.userSelectedTab = null;
        this.init();
    }

    /**
     * Initialize the sidebar drawer
     */
    init() {
        // Create drawer if it doesn't exist
        if (!document.getElementById('sources-sidebar-drawer')) {
            const drawer = document.createElement('sl-drawer');
            drawer.id = 'sources-sidebar-drawer';
            drawer.setAttribute('placement', 'end');
            drawer.setAttribute('class', 'sources-sidebar-drawer');
            drawer.style.setProperty('--size', '35vw');
            document.body.appendChild(drawer);
            this.drawer = drawer;
        } else {
            this.drawer = document.getElementById('sources-sidebar-drawer');
        }

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
            
            // Only re-render if unifiedSearchResults has changed
            const needsRerender = !this.unifiedSearchResults || 
                JSON.stringify(this.unifiedSearchResults?.data?.tab) !== JSON.stringify(unifiedData?.data?.tab);
            
            this.unifiedSearchResults = unifiedData;
            // Update Redux state for unifiedSearchResults
            store.dispatch(setUnifiedSearchResults(this.unifiedSearchResults));
            
            if (needsRerender) {
                // Re-render to show updated tabs
                this.render();
            } else {
                // Just update the active tab without full re-render
                const tabGroup = this.drawer?.querySelector('#sources-tab-group');
                if (tabGroup) {
                    const tabs = tabGroup.querySelectorAll('sl-tab');
                    const panels = tabGroup.querySelectorAll('sl-tab-panel');
                    
                    tabs.forEach(t => {
                        if (t.getAttribute('panel') === tab) {
                            t.setAttribute('active', '');
                        } else {
                            t.removeAttribute('active');
                        }
                    });
                    
                    panels.forEach(p => {
                        if (p.getAttribute('name') === tab) {
                            p.setAttribute('active', '');
                        } else {
                            p.removeAttribute('active');
                        }
                    });
                    
                    // Ensure nested tab-group is upgraded
                    setTimeout(() => {
                        const nestedTabGroup = this.drawer?.querySelector('#knowledge-search-tabs');
                        if (nestedTabGroup && upgradeCustomElements) {
                            upgradeCustomElements(nestedTabGroup);
                        }
                    }, 50);
                }
            }
        } else {
            // Update active tab in the DOM without full re-render
            const tabGroup = this.drawer?.querySelector('#sources-tab-group');
            if (tabGroup) {
                const tabs = tabGroup.querySelectorAll('sl-tab');
                const panels = tabGroup.querySelectorAll('sl-tab-panel');
                
                tabs.forEach(t => {
                    if (t.getAttribute('panel') === tab) {
                        t.setAttribute('active', '');
                    } else {
                        t.removeAttribute('active');
                    }
                });
                
                panels.forEach(p => {
                    if (p.getAttribute('name') === tab) {
                        p.setAttribute('active', '');
                    } else {
                        p.removeAttribute('active');
                    }
                });
            }
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
                        ? source?.title
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
                <span class="close-icon" id="sources-sidebar-close">${createCloseIcon({ size: 16, color: "#667085" })}</span>
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

        // Use Shoelace tab-group with tab-panels when tabs are needed
        if (showSwitchTabs || showMoreSearchResults) {
            const sourcesContent = this.answerSources?.viewType === "table"
                ? TableDataSummary.render({
                    summaryData: this.answerSources,
                    scrollBottom: () => {},
                    closeSourcesPanel: () => this.closeSourcesPanel()
                })
                : this.handleListData();
            
            const searchResultsContent = KnowledgeSearchResults.render({ 
                unifiedSearchResults: this.unifiedSearchResults || this.answerSources,
                answerSources: this.answerSources
            });

            this.drawer.innerHTML = `
                ${header}
                <sl-tab-group id="sources-tab-group" placement="top">
                    ${showSwitchTabs ? `
                        <sl-tab slot="nav" panel="sources" ${this.selectedTab === 'sources' ? 'active' : ''}>Sources (${sourcesCount})</sl-tab>
                        <sl-tab slot="nav" panel="search" ${this.selectedTab === 'search' ? 'active' : ''}>More search results</sl-tab>
                    ` : `
                        <sl-tab slot="nav" panel="search" ${this.selectedTab === 'search' ? 'active' : ''}>More search results</sl-tab>
                    `}
                    ${showSwitchTabs ? `
                        <sl-tab-panel name="sources" ${this.selectedTab === 'sources' ? 'active' : ''}>
                            <div class="right-panel-tabs-wrapper">
                                ${sourcesContent}
                            </div>
                        </sl-tab-panel>
                    ` : ''}
                    <sl-tab-panel name="search" ${this.selectedTab === 'search' ? 'active' : ''} style="padding: 0;">
                        <div style="width: 100%; height: 100%;">
                            ${searchResultsContent}
                        </div>
                    </sl-tab-panel>
                </sl-tab-group>
            `;
            
            // Upgrade Shoelace custom elements after rendering
            if (this.drawer && upgradeCustomElements) {
                upgradeCustomElements(this.drawer);
                // Also upgrade nested tab-group for "More search results" - need to wait for parent tab-group to be ready
                setTimeout(() => {
                    const nestedTabGroup = this.drawer?.querySelector('#knowledge-search-tabs');
                    if (nestedTabGroup && upgradeCustomElements) {
                        upgradeCustomElements(nestedTabGroup);
                        // Force update the nested tab-group
                        if (nestedTabGroup.requestUpdate) {
                            nestedTabGroup.requestUpdate();
                        }
                        
                        // Activate the first tab in the nested tab-group
                        const nestedTabs = nestedTabGroup.querySelectorAll('sl-tab');
                        const nestedPanels = nestedTabGroup.querySelectorAll('sl-tab-panel');
                        
                        if (nestedTabs.length > 0 && nestedPanels.length > 0) {
                            // Activate first tab
                            const firstTab = nestedTabs[0];
                            const firstPanelName = firstTab.getAttribute('panel');
                            const firstPanel = nestedTabGroup.querySelector(`sl-tab-panel[name="${firstPanelName}"]`);
                            
                            if (firstTab && firstPanel) {
                                firstTab.setAttribute('active', '');
                                firstPanel.setAttribute('active', '');
                                
                                // Remove active from other tabs/panels
                                nestedTabs.forEach(tab => {
                                    if (tab !== firstTab) {
                                        tab.removeAttribute('active');
                                    }
                                });
                                nestedPanels.forEach(panel => {
                                    if (panel !== firstPanel) {
                                        panel.removeAttribute('active');
                                    }
                                });
                            }
                        }
                    }
                }, 200);
            }
        } else {
            // No tabs - just show sources content
            const content = this.answerSources?.viewType === "table"
                ? TableDataSummary.render({
                    summaryData: this.answerSources,
                    scrollBottom: () => {},
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
            
            // If search tab is active, ensure nested tab-group is upgraded and activated
            if (this.selectedTab === 'search') {
                setTimeout(() => {
                    const nestedTabGroup = this.drawer?.querySelector('#knowledge-search-tabs');
                    if (nestedTabGroup && upgradeCustomElements) {
                        upgradeCustomElements(nestedTabGroup);
                        if (nestedTabGroup.requestUpdate) {
                            nestedTabGroup.requestUpdate();
                        }
                        
                        // Activate the first tab in the nested tab-group
                        const nestedTabs = nestedTabGroup.querySelectorAll('sl-tab');
                        const nestedPanels = nestedTabGroup.querySelectorAll('sl-tab-panel');
                        
                        if (nestedTabs.length > 0 && nestedPanels.length > 0) {
                            const firstTab = nestedTabs[0];
                            const firstPanelName = firstTab.getAttribute('panel');
                            const firstPanel = nestedTabGroup.querySelector(`sl-tab-panel[name="${firstPanelName}"]`);
                            
                            if (firstTab && firstPanel) {
                                firstTab.setAttribute('active', '');
                                firstPanel.setAttribute('active', '');
                                
                                // Remove active from other tabs/panels
                                nestedTabs.forEach(tab => {
                                    if (tab !== firstTab) {
                                        tab.removeAttribute('active');
                                    }
                                });
                                nestedPanels.forEach(panel => {
                                    if (panel !== firstPanel) {
                                        panel.removeAttribute('active');
                                    }
                                });
                            }
                        }
                    }
                }, 150);
            }
        }, 100);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button
        const closeBtn = this.drawer?.querySelector('#sources-sidebar-close');
        if (closeBtn) {
            closeBtn.removeEventListener('click', this.closeSourcesPanel);
            closeBtn.addEventListener('click', () => this.closeSourcesPanel());
        }

        // Tab switching using Shoelace tab-group
        const tabGroup = this.drawer?.querySelector('#sources-tab-group');
        if (tabGroup) {
            // Remove existing listener if any
            if (this.handleTabShowBound) {
                tabGroup.removeEventListener('sl-tab-show', this.handleTabShowBound);
            }
            
            // Create bound handler
            this.handleTabShowBound = (e) => {
                const tabPanel = e.detail.name; // 'sources' or 'search'
                this.handleTabSwitch(tabPanel);
                
                // When switching to 'search' tab, upgrade nested tab-group
                if (tabPanel === 'search') {
                    setTimeout(() => {
                        const nestedTabGroup = this.drawer?.querySelector('#knowledge-search-tabs');
                        if (nestedTabGroup && upgradeCustomElements) {
                            console.log('Upgrading nested tab-group on tab switch:', nestedTabGroup);
                            upgradeCustomElements(nestedTabGroup);
                            // Force update
                            if (nestedTabGroup.requestUpdate) {
                                nestedTabGroup.requestUpdate();
                            }
                        }
                    }, 100);
                }
            };
            
            tabGroup.addEventListener('sl-tab-show', this.handleTabShowBound);
            
            // Set initial active tab programmatically
            setTimeout(() => {
                const tabs = tabGroup.querySelectorAll('sl-tab');
                const panels = tabGroup.querySelectorAll('sl-tab-panel');
                
                tabs.forEach(tab => {
                    const panelName = tab.getAttribute('panel');
                    if (panelName === this.selectedTab) {
                        tab.setAttribute('active', '');
                    } else {
                        tab.removeAttribute('active');
                    }
                });
                
                panels.forEach(panel => {
                    const panelName = panel.getAttribute('name');
                    if (panelName === this.selectedTab) {
                        panel.setAttribute('active', '');
                    } else {
                        panel.removeAttribute('active');
                    }
                });
                
                // If search tab is active, upgrade nested tab-group and activate first tab
                if (this.selectedTab === 'search') {
                    setTimeout(() => {
                        const nestedTabGroup = this.drawer?.querySelector('#knowledge-search-tabs');
                        if (nestedTabGroup && upgradeCustomElements) {
                            upgradeCustomElements(nestedTabGroup);
                            if (nestedTabGroup.requestUpdate) {
                                nestedTabGroup.requestUpdate();
                            }
                            
                            // Activate the first tab in the nested tab-group
                            const nestedTabs = nestedTabGroup.querySelectorAll('sl-tab');
                            const nestedPanels = nestedTabGroup.querySelectorAll('sl-tab-panel');
                            
                            if (nestedTabs.length > 0 && nestedPanels.length > 0) {
                                const firstTab = nestedTabs[0];
                                const firstPanelName = firstTab.getAttribute('panel');
                                const firstPanel = nestedTabGroup.querySelector(`sl-tab-panel[name="${firstPanelName}"]`);
                                
                                if (firstTab && firstPanel) {
                                    firstTab.setAttribute('active', '');
                                    firstPanel.setAttribute('active', '');
                                    
                                    // Remove active from other tabs/panels
                                    nestedTabs.forEach(tab => {
                                        if (tab !== firstTab) {
                                            tab.removeAttribute('active');
                                        }
                                    });
                                    nestedPanels.forEach(panel => {
                                        if (panel !== firstPanel) {
                                            panel.removeAttribute('active');
                                        }
                                    });
                                }
                            }
                        }
                    }, 150);
                }
            }, 50);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.drawer && document.body.contains(this.drawer)) {
            document.body.removeChild(this.drawer);
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

