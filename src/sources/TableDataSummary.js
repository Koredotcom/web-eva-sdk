import { encodeHtml } from '../utils/helpers.js';

/**
 * TableDataSummary - Renders table data summary
 * Note: This is a simplified version. Full table rendering would require EvaTable component integration
 */
class TableDataSummary {
    /**
     * Render table data summary
     * @param {Object} params - { summaryData, scrollBottom, closeSourcesPanel }
     */
    static render({ summaryData, scrollBottom, closeSourcesPanel }) {
        if (!summaryData?.data?.[0]) {
            return '<div>No table data available</div>';
        }

        // This is a simplified version
        // Full implementation would require EvaTable component
        const rowData = summaryData?.data?.[0]?.rows || [];
        const columns = summaryData?.data?.[0]?.columns || [];

        let html = `
            <div class="sidebar-preview-table">
                <div class="table-summary-header">
                    <h3>${encodeHtml(summaryData?.sources?.[0]?.title || 'Table Data')}</h3>
                </div>
                <div class="table-summary-content">
                    <p>Showing ${rowData.length} rows with ${columns.length} columns</p>
                    <p class="table-note">Full table view requires EvaTable component integration</p>
                </div>
            </div>
        `;

        return html;
    }
}

export default TableDataSummary;

