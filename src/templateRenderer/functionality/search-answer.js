/**
 * Functionality for search-answer template
 * Handles copy, export, and feedback actions
 */

function initSearchAnswerFunctionality({ data }) {
    if (!data) return;

    // Find the container
    const messageId = data?.id || data?.messageId;
    const container = document.querySelector(`[data-message-id="${messageId}"]`);
    
    if (!container) {
        console.warn('Search answer container not found for message:', messageId);
        return;
    }

    attachCopyButtonListener(container, data);
    attachExportButtonListener(container, data);
    attachFeedbackButtonListeners(container, data);
    attachMoreOptionsListener(container, data);
}

/**
 * Attach copy button functionality
 */
function attachCopyButtonListener(container, data) {
    const copyBtn = container.querySelector('.copy-btn');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        try {
            const answer = data?.answer || '';
            
            if (!answer) {
                console.warn('No answer text to copy');
                return;
            }

            // Use the Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(answer);
            } else {
                // Fallback for older browsers or non-secure context
                const textArea = document.createElement('textarea');
                textArea.value = answer;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                
                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
                
                document.body.removeChild(textArea);
            }

            // Visual feedback
            copyBtn.classList.add('copied');
            copyBtn.setAttribute('title', 'Copied!');
            
            // Reset after 2 seconds
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.setAttribute('title', 'Copy response');
            }, 2000);

        } catch (error) {
            console.error('Error copying to clipboard:', error);
        }
    });
}

/**
 * Attach export button functionality with dropdown menu
 */
function attachExportButtonListener(container, data) {
    const exportBtn = container.querySelector('.export-btn');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showExportMenu(e, container, data);
    });
}

/**
 * Show export menu with PDF and Word options
 */
function showExportMenu(event, container, data) {
    const button = event.target.closest('.export-btn');
    if (!button) return;

    // Create menu if it doesn't exist
    let menu = document.getElementById(`export-menu-${data?.id || data?.messageId}`);
    
    if (!menu) {
        menu = document.createElement('div');
        menu.id = `export-menu-${data?.id || data?.messageId}`;
        menu.className = 'export-dropdown-menu';
        menu.innerHTML = `
            <button class="export-option" data-format="pdf">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z"/>
                </svg>
                <span>Export as PDF</span>
            </button>
            <button class="export-option" data-format="docx">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z"/>
                </svg>
                <span>Export as Word</span>
            </button>
        `;
        
        // Position the menu below the button
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.left = rect.left + 'px';
        menu.style.zIndex = '10000';
        
        // Add event listeners to export options
        menu.querySelectorAll('.export-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                handleExport(format, data);
                menu.remove();
            });
        });

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !button.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);

        document.body.appendChild(menu);
    } else {
        menu.remove();
    }
}

/**
 * Handle export action
 */
function handleExport(format, data) {
    try {
        const answer = data?.answer || '';
        
        if (!answer) {
            console.warn('No answer to export');
            return;
        }

        if (format === 'pdf') {
            exportToPDF(answer, data);
        } else if (format === 'docx') {
            exportToWord(answer, data);
        }
    } catch (error) {
        console.error('Export failed:', error);
    }
}

/**
 * Export content as PDF
 */
function exportToPDF(content, data) {
    try {
        // For basic PDF export, we'll use a simple approach
        // In production, you'd use a library like jsPDF or pdfkit
        const element = document.createElement('div');
        element.innerHTML = content;
        element.style.padding = '20px';
        element.style.fontFamily = 'Arial, sans-serif';
        
        // Create a print window and print to PDF
        const printWindow = window.open('', '', 'height=500,width=500');
        printWindow.document.write('<html><head><title>Export</title></head><body>');
        printWindow.document.write(element.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    } catch (error) {
        console.error('PDF export failed:', error);
    }
}

/**
 * Export content as Word document
 */
function exportToWord(content, data) {
    try {
        const header = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Export</title>
</head>
<body>`;
        
        const footer = `</body>
</html>`;
        
        const html = header + content + footer;
        
        const blob = new Blob([html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `response-${new Date().getTime()}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Word export failed:', error);
    }
}

/**
 * Attach feedback button functionality
 */
function attachFeedbackButtonListeners(container, data) {
    const feedbackBtns = container.querySelectorAll('.feedback-btn');
    
    feedbackBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const value = btn.dataset.value;
            const messageId = data?.id || data?.messageId;
            
            if (!messageId) {
                console.warn('No message ID for feedback');
                return;
            }

            handleFeedback(messageId, value, btn);
        });
    });
}

/**
 * Handle feedback submission
 */
function handleFeedback(messageId, value, button) {
    try {
        // Toggle button state
        const isPositive = value === 'positive';
        const otherBtn = button.parentElement?.querySelector(
            `.feedback-btn[data-value="${isPositive ? 'negative' : 'positive'}"]`
        );

        // Remove active state from other button
        if (otherBtn) {
            otherBtn.classList.remove('active');
        }

        // Toggle current button
        button.classList.toggle('active');

        // Visual feedback
        const originalTitle = button.getAttribute('title');
        button.setAttribute('title', 'Feedback submitted');
        
        setTimeout(() => {
            button.setAttribute('title', originalTitle);
        }, 1500);

        // Dispatch custom event
        const feedbackEvent = new CustomEvent('messageFeedback', {
            detail: {
                messageId,
                feedback: value,
                timestamp: new Date().toISOString()
            }
        });
        document.dispatchEvent(feedbackEvent);

    } catch (error) {
        console.error('Error handling feedback:', error);
    }
}

/**
 * Attach more options (three dots menu) functionality
 */
function attachMoreOptionsListener(container, data) {
    const moreBtn = container.querySelector('.more-options-btn');
    if (!moreBtn) return;

    moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showMoreOptionsMenu(e, container, data);
    });
}

/**
 * Show more options menu
 */
function showMoreOptionsMenu(event, container, data) {
    const button = event.target.closest('.more-options-btn');
    if (!button) return;

    let menu = document.getElementById(`more-options-menu-${data?.id || data?.messageId}`);
    
    if (!menu) {
        menu = document.createElement('div');
        menu.id = `more-options-menu-${data?.id || data?.messageId}`;
        menu.className = 'more-options-dropdown-menu';
        menu.innerHTML = `
            <button class="menu-option" data-action="regenerate">
                <span>Regenerate Answer</span>
            </button>
            <button class="menu-option" data-action="share">
                <span>Share Response</span>
            </button>
        `;
        
        // Position the menu below the button
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        menu.style.zIndex = '10000';
        
        // Add event listeners to menu options
        menu.querySelectorAll('.menu-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                handleMoreOption(action, data);
                menu.remove();
            });
        });

        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !button.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);

        document.body.appendChild(menu);
    } else {
        menu.remove();
    }
}

/**
 * Handle more options actions
 */
function handleMoreOption(action, data) {
    try {
        if (action === 'regenerate') {
            // Dispatch regenerate event
            const event = new CustomEvent('regenerateAnswer', {
                detail: {
                    messageId: data?.id || data?.messageId,
                    question: data?.question,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
        } else if (action === 'share') {
            // Share functionality
            console.log('Share option triggered');
        }
    } catch (error) {
        console.error('Error handling more option:', error);
    }
}

// Add CSS for dropdown menus
function injectDefaultStyles() {
    if (document.getElementById('search-answer-dropdown-styles')) return;

    const style = document.createElement('style');
    style.id = 'search-answer-dropdown-styles';
    style.innerHTML = `
        .export-dropdown-menu,
        .more-options-dropdown-menu {
            background: white;
            border: 1px solid #e5e5e5;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            padding: 0.5rem 0;
            min-width: 180px;
            animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-4px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .export-option,
        .menu-option {
            background: none;
            border: none;
            width: 100%;
            padding: 0.75rem 1rem;
            text-align: left;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #424242;
            transition: background-color 0.2s ease;
        }

        .export-option:hover,
        .menu-option:hover {
            background-color: #f5f5f5;
            color: #141414;
        }

        .export-option svg,
        .menu-option svg {
            flex-shrink: 0;
        }
    `;
    document.head.appendChild(style);
}

// Inject styles when module loads
injectDefaultStyles();

export default initSearchAnswerFunctionality;
