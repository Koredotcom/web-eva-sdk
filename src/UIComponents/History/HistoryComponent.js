import HistoryInterface from "../../history/historyInterface";

let isHistoryLoading = false;
let currentHistory = [];
let historyInstance = null;


export const constructHistoryItem = (item, options = {}) => {
    const { showDate = true, useIndex = true, index = 0 } = options;
    const date = item?.createdOn ? new Date(item.createdOn).toLocaleDateString() : '';
    const indexAttr = useIndex ? `data-history-index="${index}"` : '';
    
    return `<div class="history-item ${item?.bookMarked ? 'bookmarked' : ''}" ${indexAttr} data-history-id="${item?.id}" title="${item?.name || 'Untitled'}">
        <div class="history-item-content">
            <span class="history-item-name">${item?.name || 'Untitled'}</span>
            ${showDate ? `<span class="history-item-date">${date}</span>` : ''}
        </div>
        <div class="history-item-actions">
            <button class="history-bookmark-btn" data-action="bookmark" title="${item?.bookMarked ? 'Remove bookmark' : 'Bookmark'}">
                ${item?.bookMarked ? '★' : '☆'}
            </button>
            <button class="history-delete-btn" data-action="delete" title="Delete">
                <sl-icon name="trash" library="default"></sl-icon>
            </button>
        </div>
    </div>`;
};


export const constructHistoryItems = (items, options = {}) => {
    return items.map((item, index) => constructHistoryItem(item, { ...options, index })).join('');
};


export const constructHistorySkeleton = (count = 4) => {
    return `<div class="history-loading">
        <div class="history-list">
            ${Array(count).fill('').map(() => `
                <div class="history-item skeleton-history">
                    <sl-skeleton effect="pulse"></sl-skeleton>
                </div>
            `).join('')}
        </div>
    </div>`;
};

const HistoryComponentFunc = () => {
    // Initialize history interface
    if (!historyInstance) {
        historyInstance = HistoryInterface();
    }

    const constructHistoryList = (history = []) => {
        if (isHistoryLoading) {
            return constructHistorySkeleton(5);
        } else {
            if (history?.length > 0) {
                return `<div class="history-container">
                    ${constructHistoryItems(history, { showDate: true })}
                </div>`;
            } else {
                return `<div class="history-empty">No history found</div>`;
            }
        }
    };

    const setupClickHandlers = (divId, callbacks = {}) => {
        const container = document.getElementById(divId);
        if (!container) return;

        // Add click handlers to history items
        const historyElements = container.querySelectorAll('.history-item[data-history-index]');
        historyElements.forEach(historyEl => {
            // Click on item to open
            historyEl.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.history-item-actions')) return;

                e.preventDefault();
                const historyIndex = parseInt(historyEl.getAttribute('data-history-index'));
                const historyItem = currentHistory[historyIndex];

                if (historyItem && callbacks.onItemClick) {
                    callbacks.onItemClick(historyItem);
                }
            });

            // Bookmark button
            const bookmarkBtn = historyEl.querySelector('.history-bookmark-btn');
            if (bookmarkBtn) {
                bookmarkBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const historyIndex = parseInt(historyEl.getAttribute('data-history-index'));
                    const historyItem = currentHistory[historyIndex];

                    if (historyItem) {
                        await historyInstance.bookMarkChatThreadItem(historyItem);
                        if (callbacks.onBookmark) {
                            callbacks.onBookmark(historyItem);
                        }
                    }
                });
            }

            // Delete button
            const deleteBtn = historyEl.querySelector('.history-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const historyIndex = parseInt(historyEl.getAttribute('data-history-index'));
                    const historyItem = currentHistory[historyIndex];

                    if (historyItem) {
                        await historyInstance.deleteHistoryBoard(historyItem);
                        if (callbacks.onDelete) {
                            callbacks.onDelete(historyItem);
                        }
                    }
                });
            }

            // Add hover effects
            historyEl.addEventListener('mouseenter', () => {
                historyEl.style.backgroundColor = '#f8f9fa';
            });

            historyEl.addEventListener('mouseleave', () => {
                historyEl.style.backgroundColor = '';
            });
        });
    };

    const renderHistory = (divId, callbacks = {}) => {
        const targetElement = document.getElementById(divId);
        if (!targetElement) {
            console.error(`Element with ID "${divId}" not found`);
            return;
        }

        // Show loading state
        isHistoryLoading = true;
        currentHistory = [];
        targetElement.innerHTML = constructHistoryList();

        // Subscribe to history updates
        const unsubscribe = historyInstance.subscribe((history, historyRes, bookMarkedThreads) => {
            isHistoryLoading = false;
            currentHistory = history?.data || [];
            targetElement.innerHTML = constructHistoryList(currentHistory);

            // click handlers after DOM is updated
            setupClickHandlers(divId, callbacks);
        });

        // Return unsubscribe function for cleanup
        return unsubscribe;
    };

    const hideHistoryDiv = (divId) => {
        const historyDiv = document.getElementById(divId);
        if (historyDiv) {
            historyDiv.style.display = 'none';
        } else {
            console.error(`Element with ID "${divId}" not found`);
        }
    };

    const unHideHistoryDiv = (divId) => {
        const historyDiv = document.getElementById(divId);
        if (historyDiv) {
            historyDiv.style.display = 'block';
        } else {
            console.error(`Element with ID "${divId}" not found`);
        }
    };

    return {
        renderHistory,
        hideHistoryDiv,
        unHideHistoryDiv,
        historyInstance 
    };
};

export default HistoryComponentFunc;
