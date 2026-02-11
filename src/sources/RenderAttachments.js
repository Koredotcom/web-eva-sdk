import { cloneDeep } from 'lodash';
import { encodeHtml, renderIcons, getFileExtension, getExtIcon } from '../utils/helpers.js';
import store from '../redux/store.js';
import moment from 'moment';

/**
 * Time conversion helper
 */
const formatTimeAgoOrDate = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = moment(timestamp);
        const now = moment();
        const diffInDays = now.diff(date, 'days');
        
        if (diffInDays === 0) {
            return date.format('h:mm A');
        } else if (diffInDays === 1) {
            return 'Yesterday';
        } else if (diffInDays < 7) {
            return date.format('dddd');
        } else if (diffInDays < 365) {
            return date.format('MMM D');
        } else {
            return date.format('MMM D, YYYY');
        }
    } catch (e) {
        return timestamp;
    }
};

/**
 * RenderAttachments - Renders multi-source list view
 * Handles grouping sources with snippets and rendering them
 */
class RenderAttachments {
    /**
     * Render attachments/sources list
     * @param {Object} params - { data: sourcesData }
     */
    static render({ data }) {
        if (!data?.sources?.length) {
            return '<div class="empty-field-wrapper"><span class="empty-text">No sources found!</span></div>';
        }

        // Get all search results from unifiedSearchResults or answerSources
        const state = store.getState()?.global;
        const unifiedSearchResults = state?.unifiedSearchResults;
        const answerSources = state?.answerSources;

        // Get all search results
        const allSearchResults = this.getAllSearchResults(unifiedSearchResults, answerSources, data);

        // Group sources with snippets
        const groupedSourcesWithSnippets = this.groupSourcesWithSnippets(data, allSearchResults);

        if (groupedSourcesWithSnippets.length === 0) {
            return '<div class="empty-field-wrapper"><span class="empty-text">No sources found!</span></div>';
        }

        // Render each source group
        let html = '<div class="tab-content-wrapper"><div class="tab-content">';
        
        groupedSourcesWithSnippets.forEach((sourceData) => {
            const source = sourceData.source;
            const snippets = sourceData.snippets;

            if (snippets && snippets.length > 0) {
                snippets.forEach((snippet, snippetIndex) => {
                    html += this.renderSnippetItem(snippet, snippetIndex, sourceData, data);
                });
            }
        });

        html += '</div></div>';
        return html;
    }

    /**
     * Get all search results from unifiedSearchResults or answerSources
     */
    static getAllSearchResults(unifiedSearchResults, answerSources, data) {
        let searchData = unifiedSearchResults;

        if (!searchData?.data?.results && answerSources?.templateType === "search_results" && answerSources?.data?.results) {
            searchData = answerSources;
        }

        if (!searchData?.data?.results) return [];

        let allResults = [];
        Object.values(searchData.data.results).forEach(tabData => {
            if (tabData?.data && Array.isArray(tabData.data)) {
                allResults = [...allResults, ...tabData.data];
            }
        });

        // Deduplicate results by contentId or docId
        const seenIds = new Set();
        const uniqueResults = [];
        allResults.forEach(result => {
            const resultId = result?.contentId || result?.docId;
            if (resultId && !seenIds.has(resultId)) {
                seenIds.add(resultId);
                uniqueResults.push(result);
            }
        });

        return uniqueResults;
    }

    /**
     * Group sources with their matching snippets
     */
    static groupSourcesWithSnippets(data, allSearchResults) {
        if (!data?.sources?.length) return [];

        // For search_answer templateType, render sources directly without snippet matching
        if (data?.templateType === 'search_answer') {
            const sourceMap = new Map();
            const seenSourceIds = new Set();

            data.sources.forEach((source) => {
                const sourceId = source?.docId || source?.contentId || source?.id;
                if (!sourceId) return;
                if (seenSourceIds.has(sourceId)) return;
                seenSourceIds.add(sourceId);

                sourceMap.set(sourceId, {
                    source: source,
                    snippets: [source] // For search_answer, use the source itself as the snippet
                });
            });

            return Array.from(sourceMap.values());
        }

        // Regular grouping logic
        const sourceMap = new Map();
        const seenSourceIds = new Set();

        // First, group sources by unique identifier
        data.sources.forEach((source) => {
            const sourceId = source?.docId || source?.contentId;
            if (!sourceId) return;
            if (seenSourceIds.has(sourceId)) return;
            seenSourceIds.add(sourceId);

            sourceMap.set(sourceId, {
                source: source,
                snippets: []
            });
        });

        // Then, find all matching snippets from search results
        const seenSnippetIds = new Set();
        allSearchResults.forEach((result) => {
            const resultId = result?.contentId || result?.docId;
            if (!resultId) return;
            if (seenSnippetIds.has(resultId)) return;

            for (let [key, sourceData] of sourceMap.entries()) {
                const sourceId = sourceData.source?.docId || sourceData.source?.contentId;
                if (sourceId === resultId || key === resultId) {
                    seenSnippetIds.add(resultId);
                    sourceData.snippets.push(result);
                    break;
                }
            }
        });

        return Array.from(sourceMap.values());
    }

    /**
     * Render a single snippet item
     */
    static renderSnippetItem(el, index, sourceData, data) {
        let desc = el?.content;
        let title = el?.title;

        if (el?.sys_content_type == 'file') {
            title = el?.file_title || el?.title;
        }

        const searchData = store.getState()?.global?.unifiedSearchResults || 
                          (data?.templateType === "search_results" ? data : null);
        const elSourceName = searchData?.data?.tab?.find(t => t?.key === el?.sourceType)?.name;
        const selectedTab = searchData?.data?.tab?.[0]?.key || 'all';

        let description = el?.desc;
        if (el.hasOwnProperty('content')) {
            if (Array.isArray(el?.content)) {
                description = el?.content?.[0];
            } else {
                description = el?.content;
            }
        }

        const questions = store.getState()?.global?.questions || {};
        const answerSources = store.getState()?.global?.answerSources;
        const sourceIds = questions[answerSources?.id]?.sources?.map(s => s?.docId || s?.contentId);

        // For search_answer templateType, format metadata from drive item structure
        const isSearchAnswer = data?.templateType === 'search_answer';
        const ownerName = el?.owners?.[0]?.displayName || el?.lastModifiedBy;
        const modifiedTime = el?.modifiedTime;

        // Render icon
        let iconHtml = '';
        if (isSearchAnswer && el?.extIcon) {
            iconHtml = `<img src="${encodeHtml(el.extIcon)}" alt="${encodeHtml(el?.title)}" />`;
        } else if (el?.extIcon && el?.iconUrl) {
            // Render both extIcon and iconUrl
            iconHtml = `
                <div class="extIcon">
                    <img src="images/${getFileExtension(el?.title || '')}.png" alt="" />
                    <div class="sourceIcon">
                        <img src="${encodeHtml(el.extIcon)}" />
                    </div>
                </div>
            `;
        } else if (el?.extIcon) {
            // Use getExtIcon for file extension icon
            const extIconUrl = getExtIcon(getFileExtension(el?.title || ''));
            iconHtml = `
                <div class="extIcon">
                    <img src="${encodeHtml(extIconUrl)}" alt="" />
                    <div class="sourceIcon">
                        <img src="${encodeHtml(el.extIcon)}" />
                    </div>
                </div>
            `;
        } else if (el?.iconUrl) {
            iconHtml = `
                <div class="sourceIcon onlySource">
                    <img src="${encodeHtml(el.iconUrl)}" />
                </div>
            `;
        } else {
            const iconEl = renderIcons(el?.source || el?.type, el?.extIcon || null, null, el?.iconUrl || el?.icon, el?.isSupervisor);
            iconHtml = iconEl?.outerHTML || '';
        }

        const hasUrl = el?.redirectUrl?.dweb || el?.redirectUrl?.dWeb || el?.webViewLink || el?.url;
        const onClickHandler = hasUrl 
            ? `onclick="window.open('${encodeHtml(hasUrl)}', '_blank')"`
            : '';

        return `
            <div class="content-wrapper" ${onClickHandler} style="cursor: ${hasUrl ? 'pointer' : 'default'};">
                <span class="icon-wrapper">${iconHtml}</span>
                <div class="content-desc">
                    <div class="content-header">
                        <div class="options-name-wrapper">
                            <span class="content-name">${encodeHtml(title)}</span>
                            ${sourceIds?.includes(el?.contentId || el?.docId) 
                                ? '<div class="options-wrapper answerSourceChip">Answered Source</div>' 
                                : ''}
                        </div>
                        <div class="desc">${description || ''}</div>
                    </div>
                    ${(!!el?.meta || isSearchAnswer) 
                        ? `
                            <div class="metaDescription">
                                ${isSearchAnswer
                                    ? `
                                        ${ownerName ? `<span>Created by: ${encodeHtml(ownerName)}</span>` : ''}
                                        ${modifiedTime ? `<span>${ownerName ? ', ' : ''}Last Edited ${formatTimeAgoOrDate(modifiedTime)}</span>` : ''}
                                    `
                                    : el?.meta?.updatedBy && el?.meta?.updatedOn
                                        ? `
                                            ${selectedTab === 'all' ? `<span>${elSourceName || el?.sourceType}</span>` : ''}
                                            ${el?.meta.updatedBy ? `<span> • ${encodeHtml(el.meta.updatedBy)}</span>` : ''}
                                            ${el?.meta.updatedOn ? `<span> • Updated on ${formatTimeAgoOrDate(el.meta.updatedOn)}</span>` : ''}
                                        `
                                        : ''
                                }
                            </div>
                        `
                        : ''
                    }
                </div>
            </div>
            <div class="line-seperator"></div>
        `;
    }
}

export default RenderAttachments;

