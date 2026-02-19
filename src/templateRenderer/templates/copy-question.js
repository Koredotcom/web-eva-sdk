import { CheckCircle, createCopyIcon } from "../icons-library";
import { toast } from "../../chat";
import { resolveSdkAssetPath } from "../../utils/helpers";
import store from "../../redux/store";

const normalizeTextForComposeBar = (value) => {
    // Remove leading/trailing whitespace and collapse internal newlines/indentation
    // introduced by HTML formatting/indentation in templates.
    return String(value || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const getCopyIcon = () => {
    const env = store.getState()?.global?.env;
    if (env === 'MS') {
        return `<img src="${resolveSdkAssetPath("images/MS-Icons/copy-ms.svg")}" alt="Copy" width="16" height="16" />`;
    }
    return createCopyIcon({ size: 16, color: '#667085', className: 'questcopy-icon' });
};

function render(data, type = 'question') {
    let messageTextId = '', copyButtonId = '', messageDivId = '';
    messageTextId = `message-text-${data?.messageId || data?.reqId}`;
    copyButtonId = `copy-btn-${data?.messageId || data?.reqId}`;
    messageDivId = `copy-message-${data?.messageId || data?.reqId}`;
    if (type === 'answer') {
        copyButtonId = `copyAnswerButton-${data?.messageId}`;
        messageDivId = `copyAnswerMessage-${data?.messageId}`;
    }

    let timeout;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        const copyButton = document.getElementById(copyButtonId);
        if (copyButton) {
            // Add click event for copying text
            copyButton.addEventListener('click', () => {
                if (type === 'answer') {
                    const messageDiv = document.querySelector(`#answer-${data?.messageId} .message-renderer`);
                    if (messageDiv) {
                        const htmlData = messageDiv.outerHTML;
                        const blob = new Blob([htmlData], { type: 'text/html' });
                        const clipboardItem = new ClipboardItem({ 'text/html': blob });
                        navigator.clipboard.write([clipboardItem])
                            .then(() => console.log('Copied with formatting!'))
                            .catch(err => console.error('Clipboard copy failed:', err));
                    } else {
                        navigator.clipboard.writeText(data?.answer);
                    }
                } else {
                    const messageText = document.getElementById(messageTextId);
                    if (messageText) {
                        const cleanedText = normalizeTextForComposeBar(messageText.textContent);
                        navigator.clipboard.writeText(cleanedText);
                        const composeBarInput = document.querySelector('.eva-compose-textarea');
                        if (!composeBarInput?.value?.length) {
                            composeBarInput.value = cleanedText;
                            // Trigger input event to update ComposeBar's internal state                        
                            const inputEvent = new Event('input', { bubbles: true });
                            composeBarInput.dispatchEvent(inputEvent);
                        }
                    }
                }
                // Show the message div
                const messageDiv = document.getElementById(messageDivId);
                if (messageDiv) {
                    messageDiv.style.display = 'flex';

                    // Hide the message div after 1 second
                    setTimeout(() => {
                        messageDiv.style.display = 'none';
                    }, 3000);
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

    const tooltipTitle = type === 'answer' ? 'Copy Response:' : 'Copy';
    const tooltipSubtitle = type === 'answer'
        ? 'Copy the response to your clipboard.'
        : '';
    const triggerStyle = type === 'answer'
        ? 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;'
        : '';
    const copiedMessageText = type === 'answer' ? 'Response Copied' : 'Copied to Clipboard';

    return `
    <sl-tooltip placement="bottom">
        <div slot="content" class="caTooltips">
            <div class="tooltip-title">${tooltipTitle}</div>
            <div class="tooltip-subtitle">${tooltipSubtitle}</div>
        </div>
        <div class='questcopy' id='${copyButtonId}' ${triggerStyle ? `style="${triggerStyle}"` : ''}>
            ${getCopyIcon()}
        </div>
    </sl-tooltip>
    <div id='${messageDivId}' class='copy-message wa-dropdown-enter-anim'>        
        <div class='copy-message-icon'>
            ${CheckCircle({ size: 16, color: '#039855' })}
        </div>
        <div class='copy-message-text'>${copiedMessageText}</div>
    </div>
    `
}

export { render };