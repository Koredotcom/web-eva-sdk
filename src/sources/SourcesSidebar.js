import { cloneDeep, keyBy } from 'lodash';
import store from '../redux/store.js';
import { createCloseIcon } from '../templateRenderer/icons-library.js';
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
            this.unifiedSearchResults = cloneDeep(this.answerSources);
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
            this.unifiedSearchResults = cloneDeep(this.answerSources);
        }
        this.render();
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

        return `
            <div class="right-panel-header">
                <span class="close-icon" id="sources-sidebar-close">${createCloseIcon({ size: 16, color: "#667085" })}</span>
                ${showSwitchTabs
                    ? `
                        <div class="sources-tabs-wrapper">
                            <div class="right-panel-tab ${this.selectedTab === 'sources' ? 'active' : ''}" 
                                 data-tab="sources">Sources (${sourcesCount})</div>
                            <div class="right-panel-tab ${this.selectedTab === 'search' ? 'active' : ''}" 
                                 data-tab="search">More search results</div>
                        </div>
                    `
                    : showMoreSearchResults
                        ? `
                            <div class="sources-tabs-wrapper">
                                <div class="right-panel-tab ${this.selectedTab === 'search' ? 'active' : ''}">More search results</div>
                            </div>
                        `
                        : `
                            <span class="search-header">${headerTitle || 'Data'}</span>
                        `
                }
            </div>
        `;
    }

    /**
     * Render the sidebar content
     */
    render() {
        if (!this.drawer || !this.answerSources) return;

        const header = this.renderHeader();
        const content = this.selectedTab === 'sources'
            ? `
                <div class="right-panel-tabs-wrapper">
                    ${this.answerSources?.viewType === "table"
                        ? TableDataSummary.render({
                            summaryData: this.answerSources,
                            scrollBottom: () => {}, // Implement scrollBottom if needed
                            closeSourcesPanel: () => this.closeSourcesPanel()
                        })
                        : this.handleListData()
                    }
                </div>
            `
            : `
                <div class="right-panel-tabs-wrapper">
                    ${KnowledgeSearchResults.render({ unifiedSearchResults: this.unifiedSearchResults || this.answerSources })}
                </div>
            `;

        this.drawer.innerHTML = `
            ${header}
            ${content}
        `;

        // Attach event listeners
        this.attachEventListeners();
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

        // Tab switching
        const tabs = this.drawer?.querySelectorAll('[data-tab]');
        if (tabs) {
            tabs.forEach(tab => {
                tab.removeEventListener('click', this.handleTabClick);
                tab.addEventListener('click', (e) => {
                    const tabName = e.currentTarget.getAttribute('data-tab');
                    this.handleTabSwitch(tabName);
                });
            });
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

