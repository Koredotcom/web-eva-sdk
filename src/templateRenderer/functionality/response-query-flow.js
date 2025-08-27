import { CheveronDownIcon, cheveronRightIcon } from "../icons-library";

const ResponseQueryFlowFunctionality = ({ data }) => {
    

    if(data?.status === 'completed' || data?.status === 'terminated'){
        const queryResponseFlow = document.querySelector('.query-response-flow');
        if (queryResponseFlow) {                        
            const icon = queryResponseFlow.querySelector('.query-response-flow-header-icon');
            if (icon) {
                icon.style.display = 'block';
                
                
                // Add click functionality to toggle the flow
                const headerContainer = queryResponseFlow.querySelector('.query-response-flow-header-container');
                if (headerContainer) {
                    headerContainer.style.cursor = 'pointer';
                    
                    
                    // Check if listener already exists
                    if (!headerContainer.dataset.listenerAdded) {
                        headerContainer.addEventListener('click', function(event) {
                            
                            toggleResponseFlow(event, data?.reqFlow?.[data?.reqFlow?.length - 1]?.content);
                        });
                        headerContainer.dataset.listenerAdded = 'true';
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

function toggleResponseFlow(event, content) {

    let queryResponseHeader = document.querySelector('.query-response-flow-header-text');
    
    
    const queryResponseFlow = event.currentTarget.closest('.query-response-flow');
    if (!queryResponseFlow) {
        console.log('Query response flow not found');
        return;
    }
    
    const icon = queryResponseFlow.querySelector('.query-response-flow-header-icon');
    const displayDiv = queryResponseFlow.querySelector('.display-query-response-flow');
    
    
    if (!icon) return;
    
    // Check current state based on icon content
    const isCurrentlyExpanded = icon.innerHTML.includes('wa-CheveronDownIcon');
    
    if (isCurrentlyExpanded) {
        // Collapse: Switch to right chevron and hide display div
        icon.innerHTML = `${cheveronRightIcon({ size: 16, color: "#667085" })}`;
        if (displayDiv) {
            displayDiv.style.display = 'none';
            queryResponseHeader.innerText = content;
        }
    } else {
        // Expand: Switch to down chevron and show display div
        icon.innerHTML = `${CheveronDownIcon({ size: 16, color: "#667085" })}`;
        if (displayDiv) {
            displayDiv.style.display = 'block';
            queryResponseHeader.innerText = "Response Flow";
        }
    }
}

export default ResponseQueryFlowFunctionality;