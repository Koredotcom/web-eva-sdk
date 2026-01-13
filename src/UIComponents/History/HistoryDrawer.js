import HistoryInterface from "../../history/historyInterface";
import { constructHistoryItems, constructHistorySkeleton } from "./HistoryComponent";
import NewChat from "../../chat/NewChat";
import JoinChatThread from "../../chat/JoinChatThread";
import RecentAgentsFunc from "../RecentAgents/RecentAgents";

const { unHideRecentAgentsDiv } = RecentAgentsFunc();

let isHistoryLoading = false;
let currentHistory = [];
let historyInstance = null;
let unsubscribeHistory = null;

const HistoryDrawerFunc = () => {
    // Initialize history interface
    if (!historyInstance) {
        historyInstance = HistoryInterface();
    }

    const isSameDay = (date1, date2) => {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    };

    const constructHistoryList = (history = []) => {
        if (isHistoryLoading) {
            return constructHistorySkeleton(4);
        }

        if (history.length === 0) {
            return `<div class="history-empty">No conversations yet</div>`;
        }

        // Group by date
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        const grouped = {
            today: [],
            yesterday: [],
            lastWeek: [],
            older: []
        };

        history.forEach(item => {
            const itemDate = new Date(item.createdOn);
            if (isSameDay(itemDate, today)) {
                grouped.today.push(item);
            } else if (isSameDay(itemDate, yesterday)) {
                grouped.yesterday.push(item);
            } else if (itemDate > lastWeek) {
                grouped.lastWeek.push(item);
            } else {
                grouped.older.push(item);
            }
        });

        let html = '<div class="history-list">';

        
        if (grouped.today.length > 0) {
            html += `<div class="section-divider">Today</div>`;
            html += constructHistoryItems(grouped.today, { showDate: false, useIndex: false });
        }

        if (grouped.yesterday.length > 0) {
            html += `<div class="section-divider">Yesterday</div>`;
            html += constructHistoryItems(grouped.yesterday, { showDate: false, useIndex: false });
        }

        if (grouped.lastWeek.length > 0) {
            html += `<div class="section-divider">Last 7 Days</div>`;
            html += constructHistoryItems(grouped.lastWeek, { showDate: false, useIndex: false });
        }

        if (grouped.older.length > 0) {
            html += `<div class="section-divider">Older</div>`;
            html += constructHistoryItems(grouped.older, { showDate: false, useIndex: false });
        }

        html += '</div>';
        return html;
    };

    const constructDrawer = () => {
        return `
            <div class="history-drawer-panel">
                <div class="drawer-header">
                    <h2 class="drawer-title">
                        <sl-icon name="chat-square-text" library="default"></sl-icon>
                        <span>History</span>
                    </h2>
                    <div class="drawer-actions">
                        <sl-icon-button 
                            name="plus-lg" 
                            label="New Chat"
                            class="new-chat-trigger"
                        ></sl-icon-button>
                        <sl-icon-button 
                            name="layout-sidebar-inset" 
                            label="Close sidebar"
                            class="drawer-close-trigger"
                        ></sl-icon-button>
                    </div>
                </div>
                <div class="drawer-content" id="history-drawer-content">
                    ${constructHistoryList(currentHistory)}
                </div>
            </div>
            <div class="floating-toggle visible">
                <sl-icon-button 
                    name="layout-sidebar-inset" 
                    label="Open sidebar"
                    class="drawer-open-trigger"
                ></sl-icon-button>
            </div>
        `;
    };

    const setupHistoryClickHandlers = () => {
        const container = document.getElementById('history-drawer-content');
        if (!container) return;

        const items = container.querySelectorAll('.history-item[data-history-id]');

        items.forEach(item => {
            const historyId = item.getAttribute('data-history-id');
            const historyItem = currentHistory.find(h => h.id === historyId);

            // Click on item
            item.addEventListener('click', async (e) => {
                if (e.target.closest('.history-item-actions')) return;
                
                if (historyItem?.id) {
                    await JoinChatThread({ boardId: historyItem.id });
                }
            });

            // Bookmark button
            const bookmarkBtn = item.querySelector('.history-bookmark-btn');
            if (bookmarkBtn) {
                bookmarkBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (historyItem && historyInstance) {
                        await historyInstance.bookMarkChatThreadItem(historyItem);
                    }
                });
            }

            // Delete button
            const deleteBtn = item.querySelector('.history-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (historyItem && historyInstance) {
                        await historyInstance.deleteHistoryBoard(historyItem);
                    }
                });
            }

            // Hover effects
            item.addEventListener('mouseenter', () => {
                item.classList.add('hovered');
            });

            item.addEventListener('mouseleave', () => {
                item.classList.remove('hovered');
            });
        });
    };

    const setupDrawerEventListeners = () => {
        // Close button
        const closeBtn = document.querySelector('.drawer-close-trigger');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeDrawer());
        }

        // Open button (floating)
        const openBtn = document.querySelector('.drawer-open-trigger');
        if (openBtn) {
            openBtn.addEventListener('click', () => openDrawer());
        }

        // New chat button
        const newChatBtn = document.querySelector('.new-chat-trigger');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                NewChat();
                // Show recent agents container when starting new chat
                unHideRecentAgentsDiv('recent-agents-container');
                document.dispatchEvent(new CustomEvent('new-chat'));
            });
        }

        // Keyboard shortcut (Ctrl/Cmd + B to toggle)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                toggleDrawer();
            }
        });
    };

    const updateHistoryContent = () => {
        const contentContainer = document.getElementById('history-drawer-content');
        if (contentContainer) {
            contentContainer.innerHTML = constructHistoryList(currentHistory);
            setupHistoryClickHandlers();
        }
    };

    const openDrawer = () => {
        const panel = document.querySelector('.history-drawer-panel');
        const floatingToggle = document.querySelector('.floating-toggle');

        if (panel) panel.classList.add('open');
        if (floatingToggle) floatingToggle.classList.remove('visible');

        document.dispatchEvent(new CustomEvent('drawer-open'));
    };

    const closeDrawer = () => {
        const panel = document.querySelector('.history-drawer-panel');
        const floatingToggle = document.querySelector('.floating-toggle');

        if (panel) panel.classList.remove('open');
        if (floatingToggle) floatingToggle.classList.add('visible');

        document.dispatchEvent(new CustomEvent('drawer-close'));
    };

    const toggleDrawer = () => {
        const panel = document.querySelector('.history-drawer-panel');
        if (panel?.classList.contains('open')) {
            closeDrawer();
        } else {
            openDrawer();
        }
    };

    const isDrawerOpen = () => {
        const panel = document.querySelector('.history-drawer-panel');
        return panel?.classList.contains('open') ?? false;
    };

    const renderHistoryDrawer = (divId) => {
        const targetElement = document.getElementById(divId);
        if (!targetElement) {
            console.error(`Element with ID "${divId}" not found`);
            return;
        }

        isHistoryLoading = true;
        currentHistory = [];

        // Render initial drawer with loading state (closed by default)
        targetElement.innerHTML = constructDrawer();
        setupDrawerEventListeners();

        // Subscribe to history updates
        if (unsubscribeHistory) {
            unsubscribeHistory();
        }

        unsubscribeHistory = historyInstance.subscribe((history, historyRes, bookMarkedThreads) => {
            isHistoryLoading = false;
            currentHistory = history?.data || [];
            updateHistoryContent();
        });
    };

    const destroyHistoryDrawer = () => {
        if (unsubscribeHistory) {
            unsubscribeHistory();
            unsubscribeHistory = null;
        }
    };

    return {
        renderHistoryDrawer,
        destroyHistoryDrawer,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        isDrawerOpen
    };
};

export default HistoryDrawerFunc;
