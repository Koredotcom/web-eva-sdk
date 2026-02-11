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

        let html = '<div class="right-panel-tabs-wrapper">';

        // Render tabs if available
        if (unifiedSearchResults?.data?.tab?.length) {
            html += '<div class="tab-content-wrapper">';
            
            unifiedSearchResults.data.tab.forEach((tab, index) => {
                const tabData = unifiedSearchResults.data.results?.[tab?.key];
                html += `
                    <div class="tab-content" data-tab-key="${tab.key}">
                        <div class="tab-header">
                            <span class="tab-icon"><img src="${encodeHtml(tab.iconUrl || '')}" alt="${encodeHtml(tab.name)}" /></span>
                            <span class="tab-name">${encodeHtml(tab.name)}</span>
                            <span class="tab-count">${tab.doc_count || 0}</span>
                        </div>
                        ${this.renderTabContent(tabData, tab)}
                    </div>
                `;
            });

            html += '</div>';
        } else {
            // Render all results without tabs
            const allResults = this.getAllResults(unifiedSearchResults);
            html += this.renderResultsList(allResults);
        }

        html += '</div>';
        return html;
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

