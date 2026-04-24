import { encodeHtml, renderIcons } from '../utils/helpers.js';

/**
 * ResultTemplate - Renders single source list view
 * Note: This is a simplified version. Full implementation would require full result template rendering
 */
class ResultTemplate {
    /**
     * Render result template
     * @param {Object} params - { results }
     */
    static render({ results }) {
        if (!results) {
            return '<div>No results available</div>';
        }

        // For table viewType, render table (simplified)
        if (results?.viewType === "table") {
            return `
                <div class="table-view">
                    <p>Table view requires full table rendering component</p>
                </div>
            `;
        }

        // For list viewType, render list items
        const data = results?.data || results?.sources || [];
        if (!Array.isArray(data) || data.length === 0) {
            return '<div class="empty-field-wrapper"><span class="empty-text">No items found</span></div>';
        }

        let html = '<div class="threadListGroup">';

        data.forEach((item, index) => {
            const title = item?.title || item?.name || 'Untitled';
            const desc = item?.desc || item?.description || '';
            const url = item?.redirectUrl?.dweb || item?.redirectUrl?.dWeb || item?.webViewLink || item?.url;
            
            // Render icon
            let iconHtml = '';
            try {
                const iconEl = renderIcons(
                    item?.source || item?.type,
                    item?.extIcon || item?.iconUrl,
                    item?.providerIcon || item?.icon
                );
                iconHtml = iconEl?.outerHTML || '';
            } catch (e) {
                iconHtml = '';
            }

            html += `
                <div class="threadListItem" ${url ? `onclick="window.open('${encodeHtml(url)}', '_blank')" style="cursor: pointer;"` : ''}>
                    <div class="leftCol">${iconHtml}</div>
                    <div class="rightCol">
                        <div class="leftDetails">
                            <div class="namgeGroup">
                                <div class="name">${encodeHtml(title)}</div>
                            </div>
                            ${desc ? `<div class="details">${encodeHtml(desc)}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }
}

export default ResultTemplate;

