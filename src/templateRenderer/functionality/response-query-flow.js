import { CheveronDownIcon, cheveronRightIcon } from "../icons-library";

// Kora-React parity: persist open/close state for specific agents (Work aAAgent / supervisor)
// across re-renders so the response flow doesn't unexpectedly collapse/expand.
const persistedStateMap = new Map();

const ResponseQueryFlowFunctionality = ({ data, uniqueId }) => {
    

    if(data?.status === 'completed' || data?.status === 'terminated'){
        const queryResponseFlow = document.getElementById(`query-response-flow-${uniqueId}`);
        if (queryResponseFlow) {                        
            const icon = queryResponseFlow.querySelector('.query-response-flow-header-icon');
            const queryResponseFlowMainDiv = queryResponseFlow.querySelector('.query-response-flow-header.ans-generating');
            if(queryResponseFlowMainDiv){
                queryResponseFlowMainDiv.classList.remove('ans-generating');
            }

            if (icon) {
                icon.style.display = 'flex';
                
                
                // Add click functionality to toggle the flow
                const headerContainer = queryResponseFlow.querySelector('.query-response-flow-header-container');
                if (headerContainer) {
                    headerContainer.style.cursor = 'pointer';
                    
                    
                    // Remove any existing listeners and add new one
                    const newHeaderContainer = headerContainer.cloneNode(true);
                    headerContainer.parentNode.replaceChild(newHeaderContainer, headerContainer);
                    
                    newHeaderContainer.addEventListener('click', function(event) {
                        const key = data?.id || data?.messageId || data?.reqId || uniqueId;
                        const isPersisted = shouldPersistState(data);
                        toggleResponseFlow(event, data?.reqFlow?.[data?.reqFlow?.length - 1]?.content, {
                            persistKey: isPersisted ? key : null,
                        });
                    });

                    // Kora-React behavior: for Work aAAgent / supervisor, default to expanded
                    // after completion unless user manually toggled.
                    const key = data?.id || data?.messageId || data?.reqId || uniqueId;
                    if (shouldPersistState(data)) {
                        const persisted = persistedStateMap.get(key) || {};
                        const manual = !!persisted.manualInteraction;
                        const desiredExpanded = manual ? !!persisted.isOpen : true;
                        applyExpandedState(queryResponseFlow, desiredExpanded, data?.reqFlow?.[data?.reqFlow?.length - 1]?.content);
                        if (!manual) {
                            persistedStateMap.set(key, { ...persisted, isOpen: desiredExpanded });
                        }
                    }
                } else {
                    
                }
            } else {
                
            }
        } else {
            console.log('Query response flow element not found');
        }
    }
}

function shouldPersistState(data) {
    const f = data?.followUpContext;
    return !!(
        !data?.historicalData &&
        (f?.isSupervisor || (f?.agentType === 'aAAgent' && f?.title === 'Work'))
    );
}

function applyExpandedState(queryResponseFlow, expanded, content) {
    const icon = queryResponseFlow.querySelector('.query-response-flow-header-icon');
    const displayDiv = queryResponseFlow.querySelector('.display-query-response-flow');
    const queryResponseHeader = queryResponseFlow.querySelector('.query-response-flow-header-text');
    if (!icon) return;

    if (expanded) {
        icon.innerHTML = `${CheveronDownIcon({ size: 10, color: "#667085" })}`;
        if (displayDiv) displayDiv.style.display = 'block';
        if (queryResponseHeader) queryResponseHeader.innerText = "Response Flow";
    } else {
        icon.innerHTML = `${cheveronRightIcon({ size: 10, color: "#667085" })}`;
        if (displayDiv) displayDiv.style.display = 'none';
        if (queryResponseHeader) queryResponseHeader.innerText = content || queryResponseHeader.innerText;
    }
}

function toggleResponseFlow(event, content, options = {}) {

    const queryResponseFlow = event.currentTarget.closest('.query-response-flow');
    if (!queryResponseFlow) {
        return;
    }
    
    const icon = queryResponseFlow.querySelector('.query-response-flow-header-icon');
    if (!icon) return;

    const isCurrentlyExpanded = icon.innerHTML.includes('wa-CheveronDownIcon');
    const nextExpanded = !isCurrentlyExpanded;
    applyExpandedState(queryResponseFlow, nextExpanded, content);

    if (options?.persistKey) {
        const current = persistedStateMap.get(options.persistKey) || {};
        persistedStateMap.set(options.persistKey, {
            ...current,
            isOpen: nextExpanded,
            manualInteraction: true,
        });
    }
}

export default ResponseQueryFlowFunctionality;