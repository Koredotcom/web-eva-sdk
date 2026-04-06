import { encodeHtml } from "../utils/helper";
import { CheveronDownIcon, cheveronRightIcon } from "../icons-library";
import ResponseQueryFlowFunctionality from "../functionality/response-query-flow";

function render(data) { 
    // Guard covers both empty array (length === 0) and undefined/null reqFlow
    if(!data?.reqFlow?.length){
        return `<div></div>`;
    }
    
    const uniqueId = `query-response-flow-${data?.messageId || data?.reqId}`;

    // Kora-React parity: when thoughts exist AND the question does NOT use botConversation,
    // the collapsed header shows "Thoughts for X secs" (not the last reqFlow item).
    // When botConversation is present, bot-conversation.js owns thoughts display — keep the
    // last reqFlow content as the header to avoid showing "Thoughts" twice.
    const hasThoughts = data?.thoughts?.length > 0;
    const hasBotConversation = !!data?.botConversation;
    const totalThoughtTime = hasThoughts
        ? data.thoughts[data.thoughts.length - 1]?.thoughtTime
        : 0;
    const collapsedHeaderText = (hasThoughts && !hasBotConversation)
        ? `Thoughts for ${totalThoughtTime} secs`
        : (data?.generatingAnswerMsg || data?.reqFlow?.[data?.reqFlow?.length - 1]?.content || 'Analyzing...');
    
    let timeout;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        ResponseQueryFlowFunctionality({ data, uniqueId });
    }, 100); // Reduced timeout for better responsiveness

    return `
            <div class='query-response-flow' id='query-response-flow-${uniqueId}'${(hasThoughts && !hasBotConversation) ? ` data-thought-time="${totalThoughtTime}"` : ''}>
                <div class='query-response-flow-header-container'>
                    <div class="query-response-flow-header ans-generating">                    
                        <div class="query-response-flow-header-text">${collapsedHeaderText}</div>
                        <span class="query-response-flow-header-icon ${data?.status === 'completed' || data?.status === 'terminated' ? '' : 'hidden'}">${cheveronRightIcon({ size: 16, color: "#667085" })}</span>                
                    </div>                    
                </div>
                <div class="display-query-response-flow" style="display: none;">${renderReqFlow(data, !hasBotConversation)}</div>
            </div>
    `        
}

function renderReqFlow(data, includeThoughts = true) {
    if (!data.reqFlow) return "";

    const thoughts = data?.thoughts || [];
    let html = `
        <div class='query-response-flow-items'>
            ${data.reqFlow.map((item, index) => {
        return `
                    <div class='query-response-flow-item'>
                        <div class='query-response-flow-item-icon'>
                            <img src="${item?.icon || ''}" alt="Flow icon"/>
                        </div>
                        <div class='query-response-flow-item-content'>
                            ${encodeHtml(item?.content || '')}
                        </div>
                    </div>
                `;
    }).join('')}
            ${(includeThoughts && thoughts.length > 0) ? renderThoughtsInFlow(thoughts) : ''}
        </div>
    `;
    return html;
}

// Renders thoughts as a sub-item inside the expanded response flow, matching Kora-React's
// QueryResponseFlow.jsx renderThoughts() output (screenshot 3 format).
function renderThoughtsInFlow(thoughts) {
    const totalThoughtTime = thoughts[thoughts.length - 1]?.thoughtTime || 0;
    return `
        <div class='query-response-flow-item thoughts-item'>
            <div class='query-response-flow-item-icon'>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="#424242" stroke-width="2"/>
                </svg>
            </div>
            <div class='query-response-flow-item-content'>
                <div class='query-response-flow-thought-header'>Thoughts for ${totalThoughtTime} secs</div>
                <div class='query-response-flow-thoughts-content'>
                    ${thoughts.map((thought, index) => `
                        <div class='query-response-flow-thought-item' style='animation-delay: ${index * 0.2}s'>
                            <div class='thoughts-content-wrapper'>
                                <div class='border-line'></div>
                                <div class='thought-text'>${thought?.content || ''}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

export { render };