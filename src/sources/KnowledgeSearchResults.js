import { encodeHtml, renderIcons, getFileExtension, getExtIcon } from '../utils/helpers.js';
import { setContextIcon, getMessageTextIcon, ArrowUpRight } from '../templateRenderer/icons-library.js';
import store from '../redux/store.js';

/**
 * KnowledgeSearchResults - Renders "More search results" tab content
 * Note: This is a simplified version. Full implementation would require tab view and filtering
 */
class KnowledgeSearchResults {
    /**
     * Render knowledge search results
     * @param {Object} params - { unifiedSearchResults, answerSources }
     */
    /**
     * Render knowledge search results
     * @param {Object} params - { unifiedSearchResults, answerSources, activeTab }
     */
    static render({ unifiedSearchResults, answerSources = null, activeTab = null, loadingTabs = new Set() }) {
        // Debug: Log the data structure
        // console.log('KnowledgeSearchResults.render - unifiedSearchResults:', unifiedSearchResults);

        if (!unifiedSearchResults?.data?.results) {
            return '<div class="empty-field-wrapper"><span class="empty-text">No search results available</span></div>';
        }

        // Render tabs using Shoelace tab-group if available
        if (unifiedSearchResults?.data?.tab?.length) {
            let tabsHtml = '';
            let panelsHtml = '';

            // Render tabs dynamically from response data
            unifiedSearchResults.data.tab.forEach((tab, index) => {
                const tabData = unifiedSearchResults.data.results?.[tab?.key];

                const tabKey = tab.key || `tab-${index}`;
                const tabName = tab.name || 'Untitled';
                const tabIcon = tab.iconUrl || tab.icon || '';
                const tabCount = tab.doc_count || 0;

                // Determine active state: match provided activeTab, or default to first tab
                const isActive = activeTab ? tabKey === activeTab : index === 0;

                // Tab navigation
                tabsHtml += `
                    <sl-tab slot="nav" panel="${encodeHtml(tabKey)}" ${isActive ? 'active' : ''}>
                        ${tabIcon ? `<img src="${encodeHtml(tabIcon)}" alt="${encodeHtml(tabName)}" style="width: 16px; height: 16px; margin-right: 6px; vertical-align: middle;" />` : ''}
                        <span>${encodeHtml(tabName)}</span>
                        <!-- ${tabCount > 0 ? `<span style="margin-left: 4px;">(${tabCount})</span>` : ''} -->
                    </sl-tab>
                `;

                // Tab panel content
                panelsHtml += `
                    <sl-tab-panel name="${encodeHtml(tabKey)}" ${isActive ? 'active' : ''}>
                        ${this.renderTabContent(tabData, tab, answerSources, loadingTabs.has(tabKey), tabKey)}
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
                    ${this.renderResultsList(allResults, answerSources)}
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
        Object.entries(unifiedSearchResults.data.results).forEach(([tabKey, tabData]) => {
            if (tabData?.data && Array.isArray(tabData.data)) {
                allResults = [...allResults, ...tabData.data.map(r => ({ ...r, tabKey }))];
            }
        });

        return allResults;
    }

    /**
     * Render tab content
     */
    static renderTabContent(tabData, tab, answerSources, isLoading = false, tabKey = null) {
        // Show loading spinner if tab is fetching data
        if (isLoading) {
            console.log(`KnowledgeSearchResults: Rendering loading state for tab '${tab?.key}'`);
            return '<div class="loading-spinner-wrapper" style="display:flex;justify-content:center;padding:20px;width:100%;"><span>Loading results...</span></div>';
        }

        if (!tabData?.data || !Array.isArray(tabData.data) || tabData.data.length === 0) {
            // console.log('renderTabContent - No data or empty array, returning empty message');
            return '<div class="empty-field-wrapper"><span class="empty-text">No results found</span></div>';
        }

        const resultsHtml = this.renderResultsList(tabData.data.map(r => ({ ...r, tabKey: tabKey || tab?.key })), answerSources);
        return `<div class="tab-content-wrapper"><div class="tab-content">${resultsHtml}</div></div>`;
    }

    /**
     * Get result data icon (similar to getResultDataIcon in Kora-React)
     */
    static getResultDataIcon(item) {
        // If only iconUrl, show it as onlySource
        if (!item?.extIcon && item?.iconUrl) {
            return `
                <div class="sourceIcon onlySource">
                    <img src="${encodeHtml(item.iconUrl)}" alt="" />
                </div>
            `;
        }

        // If both extIcon and iconUrl, show both
        if (item?.extIcon && item?.iconUrl) {
            const ext = item?.ext || getFileExtension(item?.title || item?.file_title || '');
            const extIconUrl = getExtIcon(ext);

            return `
                <div class="extIcon">
                    <img src="${encodeHtml(extIconUrl)}" alt="" />
                    <div class="sourceIcon">
                        <img src="${encodeHtml(item.iconUrl)}" alt="" />
                    </div>
                </div>
            `;
        }

        // If only extIcon
        if (item?.extIcon) {
            const ext = item?.ext || getFileExtension(item?.title || item?.file_title || '');
            const extIconUrl = getExtIcon(ext);

            return `
                <div class="extIcon">
                    <img src="${encodeHtml(extIconUrl)}" alt="" />
                    <div class="sourceIcon">
                        <img src="${encodeHtml(item.extIcon)}" alt="" />
                    </div>
                </div>
            `;
        }

        // Fallback to renderIcons
        try {
            const iconEl = renderIcons(
                item?.source || item?.type,
                item?.extIcon || null,
                null,
                item?.iconUrl || item?.icon,
                item?.isSupervisor
            );
            return iconEl?.outerHTML || '';
        } catch (e) {
            return '';
        }
    }

    /**
     * Render results list (matching Kora-React structure)
     */
    static renderResultsList(results, answerSources = null) {
        if (!results || results.length === 0) {
            return '<div class="empty-field-wrapper"><span class="empty-text">No results found</span></div>';
        }

        // Get source IDs from answerSources for "Answered Source" badge
        const allSourceIds = new Set();
        if (answerSources?.sources) {
            answerSources.sources.forEach(source => {
                if (source?.docId) allSourceIds.add(source.docId);
                if (source?.contentId) allSourceIds.add(source.contentId);
            });
        }

        let html = '';

        results.forEach((result, index) => {
            let title = result?.title || result?.file_title || 'Untitled';
            let desc = result?.desc || result?.content || '';

            // Handle file type
            if (result?.sys_content_type === 'file') {
                title = result?.file_title || result?.title || 'Untitled';
            }

            // Handle content array
            if (result?.hasOwnProperty('content')) {
                if (Array.isArray(result?.content)) {
                    desc = result?.content?.[0] || '';
                } else {
                    desc = result?.content || '';
                }
            }

            const url = result?.redirectUrl?.dweb || result?.redirectUrl?.dWeb || result?.webViewLink || result?.url;
            const iconHtml = this.getResultDataIcon(result);
            const isAnsweredSource = (result?.contentId && allSourceIds.has(result.contentId)) ||
                (result?.docId && allSourceIds.has(result.docId));

            html += `
                <div class="content-wrapper" ${url ? `onclick="window.open('${encodeHtml(url)}', '_blank')"` : ''}>
                    <span class="icon-wrapper">${iconHtml}</span>
                    <div class="content-desc">
                        <div class="content-header">
                            <div class="options-name-wrapper">
                                <div style="display:flex; flex-direction:column; gap:4px; width: 100%;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; width: 100%;">
                                        <span class="content-name">${encodeHtml(title)}</span>
                                            <div class="hover-options">
                                                ${result?.canSetAsSourceContext !== false ? `
                                                <sl-tooltip content="Set as context">
                                                    <div class="options-wrapper ask-followup-btn" data-result-key="${encodeHtml(result?.tabKey || '')}" data-result-id="${encodeHtml(result?.docId || result?.contentId || '')}">
                                                        <span>Set as context</span>
                                                        ${setContextIcon({ size: 12, color: '#667085' })}
                                                    </div>
                                                </sl-tooltip>` : ''}
                                                <sl-tooltip content="Get Answer">
                                                    <div class="options-wrapper get-answer-btn" data-result-key="${encodeHtml(result?.tabKey || '')}" data-result-id="${encodeHtml(result?.docId || result?.contentId || '')}">
                                                        <span>Get Answer</span>
                                                        ${getMessageTextIcon({ size: 12, color: '#667085' })}
                                                    </div>
                                                </sl-tooltip>
                                                ${url ? `
                                                <sl-tooltip content="Open in new tab">
                                                    <div class="options-wrapper open-source-btn" data-url="${encodeHtml(url)}" data-result-id="${encodeHtml(result?.docId || result?.contentId || '')}" data-source-type="${encodeHtml(result?.sourceType || result?.type || result?.source || '')}">
                                                        ${ArrowUpRight({ size: 16, color: '#667085' })}
                                                    </div>
                                                </sl-tooltip>` : ''}
                                            </div>
                                    </div>
                                    ${isAnsweredSource ? '<div class="options-wrapper answerSourceChip" style="width: fit-content;">Answered Source</div>' : ''}
                                </div>
                            </div>
                            ${desc ? `<div class="desc">${typeof desc === 'string' ? encodeHtml(desc) : desc}</div>` : ''}
                        </div>
                        ${result?.meta ? this.renderMetaInfo(result, result?.sourceType) : ''}
                    </div>
                </div>
                <div class="line-seperator"></div>
            `;
        });

        return html;
    }

    /**
     * Render meta information
     */
    static renderMetaInfo(result, sourceType) {
        const meta = result.meta;
        if (!meta) return '';

        let metaHtml = '<div class="metaDescription">';
        const parts = [];

        if (meta.appName ?? meta.applicationName) {
            parts.push(encodeHtml(meta.label));
        }
        if (meta.assignee ?? meta.assigneeName) {
            parts.push(encodeHtml(meta.assignee || meta.assigneeName));
        }
        if (meta.status) {
            parts.push(encodeHtml(meta.status));
        }
        if (parts.length) {
            metaHtml += `<span>${parts.join(' • ')}</span>`;
            metaHtml += '</div>';
            return metaHtml;
        }
        return '';
    }
}

export default KnowledgeSearchResults;

