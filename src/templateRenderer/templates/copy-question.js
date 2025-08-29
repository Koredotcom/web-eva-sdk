import { createCopyIcon } from "../icons-library";

function render(data) {

    const messageTextId = `message-text-${data?.messageId || data?.reqId}`;
    const copyButtonId = `copy-btn-${data?.messageId || data?.reqId}`;

    let timeout;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        const copyButton = document.getElementById(copyButtonId);
        if(copyButton){
            // Add click event for copying text
            copyButton.addEventListener('click', () => {
                const messageText = document.getElementById(messageTextId);
                if(messageText) {
                    navigator.clipboard.writeText(messageText.textContent);
                }
            });

            // Find the parent message-content div
            const messageContent = copyButton.closest('.message-content');
            // if(messageContent) {
            //     // Ensure relative positioning for absolute positioning to work
            //     if(getComputedStyle(messageContent).position === 'static') {
            //         messageContent.style.position = 'relative';
            //     }
                
            //     // Show copy icon on hover
            //     messageContent.addEventListener('mouseenter', () => {
            //         copyButton.style.opacity = '1';
            //     });
                
            //     // Hide copy icon when not hovering
            //     messageContent.addEventListener('mouseleave', () => {
            //         copyButton.style.opacity = '0';
            //     });
            // }
        }
    }, 1000);

    return `
    <sl-tooltip content="Copy" placement="bottom">
        <div class='questcopy' id='${copyButtonId}'>
            ${createCopyIcon({size: 16, color: '#666', className: 'questcopy-icon'})}
        </div>
    </sl-tooltip>
    `
}

export { render };