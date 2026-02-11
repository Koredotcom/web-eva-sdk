import { encodeHtml } from '../utils/helpers.js';
import store from '../redux/store.js';

/**
 * KnowledgeSearchResults - Renders "More search results" tab content
 * Note: This is a simplified version. Full implementation would require tab view and filtering
 */
class KnowledgeSearchResults {
    /**
     * Render knowledge search results
     * @param {Object} params - { unifiedSearchResults }
     */
    static render({ unifiedSearchResults }) {
        if (!unifiedSearchResults?.data?.results) {
            return '<div class="empty-field-wrapper"><span class="empty-text">No search results available</span></div>';
        }

        // Render tabs using Shoelace tab-group if available
        if (unifiedSearchResults?.data?.tab?.length) {
            let tabsHtml = '';
            let panelsHtml = '';
            
            // Render tabs dynamically from response data
            // Tabs are created from unifiedSearchResults.data.tab array
            unifiedSearchResults.data.tab.forEach((tab, index) => {
                const tabData = unifiedSearchResults.data.results?.[tab?.key];
                const tabKey = tab.key || `tab-${index}`;
                const tabName = tab.name || 'Untitled';
                const tabIcon = tab.iconUrl || tab.icon || '';
                const tabCount = tab.doc_count || 0;
                
                // Tab navigation - render dynamically from response
                tabsHtml += `
                    <sl-tab slot="nav" panel="${encodeHtml(tabKey)}">
                        ${tabIcon ? `<img src="${encodeHtml(tabIcon)}" alt="${encodeHtml(tabName)}" style="width: 16px; height: 16px; margin-right: 6px; vertical-align: middle;" />` : ''}
                        <span>${encodeHtml(tabName)}</span>
                        ${tabCount > 0 ? `<span style="margin-left: 4px;">(${tabCount})</span>` : ''}
                    </sl-tab>
                `;
                
                // Tab panel content - render results for this tab
                panelsHtml += `
                    <sl-tab-panel name="${encodeHtml(tabKey)}">
                        ${this.renderTabContent(tabData, tab)}
                    </sl-tab-panel>
                `;
            });

            return `
                <sl-tab-group id="knowledge-search-tabs" placement="top" style="width: 100%;">
                    ${tabsHtml}
                    ${panelsHtml}
                </sl-tab-group>
            `;
        } else {
            // Render all results without tabs
            const allResults = this.getAllResults(unifiedSearchResults);
            return `
                <div class="right-panel-tabs-wrapper">
                    ${this.renderResultsList(allResults)}
                </div>
            `;
        }
    }

    /**
     * Get all results from unified search results
     */
    static getAllResults(unifiedSearchResults) {
        if (!unifiedSearchResults?.data?.results) return [];

        let allResults = [];
        Object.values(unifiedSearchResults.data.results).forEach(tabData => {
            if (tabData?.data && Array.isArray(tabData.data)) {
                allResults = [...allResults, ...tabData.data];
            }
        });

        return allResults;
    }

    /**
     * Render tab content
     */
    static renderTabContent(tabData, tab) {
        if (!tabData?.data || !Array.isArray(tabData.data) || tabData.data.length === 0) {
            return '<div class="empty-field-wrapper"><span class="empty-text">No results found</span></div>';
        }

        return this.renderResultsList(tabData.data);
    }

    /**
     * Render results list
     */
    static renderResultsList(results) {
        if (!results || results.length === 0) {
            return '<div class="empty-field-wrapper"><span class="empty-text">No results found</span></div>';
        }

        let html = '<div class="results-list">';
        
        results.forEach((result, index) => {
            const title = result?.title || result?.file_title || 'Untitled';
            const desc = result?.desc || result?.content || '';
            const url = result?.redirectUrl?.dweb || result?.redirectUrl?.dWeb || result?.webViewLink || result?.url;
            
            html += `
                <div class="result-item" ${url ? `onclick="window.open('${encodeHtml(url)}', '_blank')" style="cursor: pointer;"` : ''}>
                    <div class="result-title">${encodeHtml(title)}</div>
                    <div class="result-description">${encodeHtml(desc)}</div>
                    ${result?.meta ? `
                        <div class="result-meta">
                            ${result.meta.updatedBy ? `<span>${encodeHtml(result.meta.updatedBy)}</span>` : ''}
                            ${result.meta.updatedOn ? `<span> • Updated on ${encodeHtml(result.meta.updatedOn)}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="line-seperator"></div>
            `;
        });

        html += '</div>';
        return html;
    }
}

export default KnowledgeSearchResults;

