import { encodeHtml } from "../utils/helper";
import { CheveronDownIcon, cheveronRightIcon } from "../icons-library";
import ResponseQueryFlowFunctionality from "../functionality/response-query-flow";
import { set } from "lodash";

function render(data) { 
    let timeout;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        ResponseQueryFlowFunctionality({ data });
    }, 1000);

    return `
            <div class='query-response-flow'>
                <div class='query-response-flow-header-container'>
                    <div class="query-response-flow-header">                    
                        <div class="query-response-flow-header-text">${data?.generatingAnswerMsg || data?.reqFlow?.[data?.reqFlow?.length - 1]?.content || 'Analyzing...'}</div>
                        <span class="query-response-flow-header-icon" style="${data?.status === 'completed' || data?.status === 'terminated' ? '' : 'display: none;'}">${cheveronRightIcon({ size: 16, color: "#667085" })}</span>                
                    </div>                    
                </div>
                <div class="display-query-response-flow" style="display: none;">${renderReqFlow(data)}</div>
            </div>
    `        
}

function renderReqFlow(data) {
    if (!data.reqFlow) return "";

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
        </div>
    `;
    return html;
}

export { render };