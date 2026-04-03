import { MessageRenderer } from "../../plugins/Markdown/message-renderer";
import { encodeHtml } from "../utils/helper";
import { renderThoughts, setupThoughtsToggle } from "./bot-conversation";

function render(data) {
    let thoughtsHTML = "";

    // Only render standalone thoughts when there is NO reqFlow.
    // When reqFlow exists (first agent-triggering question), thoughts are rendered
    // inside the response-query-flow expanded section (matching Kora-React's QueryResponseFlow).
    if (data?.thoughts?.length > 0 && !data?.reqFlow?.length) {
        const thoughtData = {
            messageId: data.messageId || data.id,
            thoughts: data.thoughts,
            question: data.answer,
        };
        thoughtsHTML = renderThoughts(thoughtData, data);

        const thoughtTime = data.thoughts[data.thoughts.length - 1]?.thoughtTime;
        setTimeout(() => {
            setupThoughtsToggle(data.messageId || data.id, thoughtTime);
        }, 500);
    }

    let html = `
        <div class="search-answer-container">
            ${thoughtsHTML}
            ${renderAnswer(data)}
        </div>
    `;

    return html;
}



function renderAnswer(data) {
    if (!data.answer) return "";

    let html = `
        <div id="answer-${data.messageId || data.id}" class="threadName maxLength">
            ${MessageRenderer(data.answer)}
        </div>
    `;
    return html;
}



function renderSourcesForDrawer(data) {
    if (!data?.data?.length) return "";

    return `
        <div style="padding: 20px;">
            <div class="sources-list">
                ${data.data
            .map(
                (source, index) => `
                    <div class="source-item" style="
                        margin-bottom: 20px; 
                        padding-bottom: 20px; 
                        border-bottom: 1px solid #e0e0e0;
                    ">
                        <div style="
                            font-weight: 600; 
                            font-size: 14px;
                            margin-bottom: 8px;
                            color: #333;
                        ">
                            ${index + 1}. ${encodeHtml(source.title || source.subject || 'Untitled')}
                        </div>
                        <div style="
                            font-size: 12px;
                            color: #666;
                            margin-bottom: 8px;
                            line-height: 1.6;
                        ">
                            <div style="margin-bottom: 4px;">
                                <strong>Sent by:</strong> ${encodeHtml(source.fromEmail || source.from || 'Unknown')}
                            </div>
                            <div style="margin-bottom: 4px;">
                                <strong>${formatEmailDate(source.date || source.receivedTime || source.modifiedTime)}
                            </div>
                            ${source.attachments?.length > 0 || source.hasAttachments ? `
                                <div>
                                    <strong>Attachments:</strong> ${source.attachments?.length || 1} ${source.attachments?.length === 1 ? 'attachment' : 'attachments'}
                                </div>
                            ` : ''}
                        </div>
                        ${source.redirectUrl?.dweb || source.redirectUrl?.mob ? `
                            <a href="${encodeHtml(source.redirectUrl.dweb || source.redirectUrl.mob)}" 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               style="
                                   font-size: 12px; 
                                   color: #0066cc; 
                                   text-decoration: none;
                                   padding: 6px 12px;
                                   border: 1px solid #0066cc;
                                   border-radius: 4px;
                                   display: inline-block;
                                   transition: all 0.2s;
                               "
                               onmouseover="this.style.background='#0066cc'; this.style.color='white';"
                               onmouseout="this.style.background='transparent'; this.style.color='#0066cc';">
                                📧 Open Email
                            </a>
                        ` : ''}
                    </div>
                `
            )
            .join("")}
            </div>
        </div>
    `;
}

// Helper function to format email date
function formatEmailDate(timestamp) {
    if (!timestamp) return 'Unknown date';

    try {
        const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };

        // Format: "Thu, Nov 27 2025, 3:24PM"
        const formatted = date.toLocaleString('en-US', options);
        return formatted.replace(',', '').replace(/(\d{1,2}:\d{2})\s*(AM|PM)/, '$1$2');
    } catch (error) {
        return 'Invalid date';
    }
}

// Function to open the sources drawer
function openSourcesDrawer(drawerId) {
    const drawer = document.getElementById(drawerId);
    if (drawer) {
        drawer.show();
    }
}

// Make function globally accessible
if (typeof window !== 'undefined') {
    window.openSourcesDrawer = openSourcesDrawer;
}

export { render };
