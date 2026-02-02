/**
 * searchChannelRecepients
 * Functional module for managing recipient search functionality for Teams messages
 * Handles user/group search, selection, and UI updates
 */

import { getChannelRecepients } from "../redux/actions/global.action";
import store from "../redux/store";

/**
 * Get default mock data for users and groups
 */
const getDefaultDataSource = () => {
    return [
        { id: 'user-1', name: 'John Doe', email: 'john.doe@company.com', type: 'user' },
        { id: 'user-2', name: 'Jane Smith', email: 'jane.smith@company.com', type: 'user' },
        { id: 'user-3', name: 'Robert Johnson', email: 'robert.j@company.com', type: 'user' },
        { id: 'user-4', name: 'Emily Davis', email: 'emily.davis@company.com', type: 'user' },
        { id: 'user-5', name: 'Michael Brown', email: 'michael.b@company.com', type: 'user' },
        { id: 'group-1', name: 'Engineering Team', type: 'group', memberCount: 15 },
        { id: 'group-2', name: 'Marketing Team', type: 'group', memberCount: 8 },
        { id: 'group-3', name: 'Sales Team', type: 'group', memberCount: 12 },
        { id: 'group-4', name: 'Product Team', type: 'group', memberCount: 10 },
        { id: 'group-5', name: 'Design Team', type: 'group', memberCount: 6 },
    ];
};

/**
 * Initialize recipient search functionality
 * @param {Object} config - Configuration object
 * @param {string} config.reqId - Request ID for unique element identification
 * @param {Function} config.onRecipientsChange - Callback when recipients change
 * @param {Array} config.searchDataSource - Optional custom data source
 * @returns {Object} - API object with methods to interact with the search manager
 */
export const initializeRecipientSearch = (config) => {
    const { reqId, onRecipientsChange = () => {}, searchDataSource = getDefaultDataSource() } = config;
    
    // DOM Elements
    let searchInputWrapper = null;
    let searchInput = null;
    let searchDropdown = null;
    let searchDropdownList = null;
    let selectedRecipientsContainer = null;
    
    // State
    let selectedRecipients = [];
    let dataSource = searchDataSource;

    /**
     * Initialize DOM references and event listeners
     */
    const initialize = () => {
        searchInputWrapper = document.getElementById(`teams-search-input-wrapper-${reqId}`);
        searchInput = document.getElementById(`teams-search-${reqId}`);
        searchDropdown = document.getElementById(`teams-search-dropdown-${reqId}`);
        searchDropdownList = document.getElementById(`teams-search-dropdown-list-${reqId}`);
        selectedRecipientsContainer = document.getElementById(`teams-selected-recipients-${reqId}`);
        
        attachEventListeners();
    };

    /**
     * Attach all event listeners
     */
    const attachEventListeners = () => {
        // Click on wrapper focuses input
        if (searchInputWrapper) {
            searchInputWrapper.addEventListener('click', (e) => {
                if (!e.target.closest('sl-tag')) {
                    searchInput?.focus();
                }
            });
        }

        // Search input events
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                handleSearchInput(e.target.value);
            });

            searchInput.addEventListener('focus', () => {
                handleSearchFocus();
            });
        }

        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (searchDropdown && 
                !searchInputWrapper?.contains(e.target) && 
                !searchDropdown.contains(e.target)) {
                hideDropdown();
            }
        });
    };

    /**
     * Search recipients based on query
     * @param {string} query - Search query
     * @returns {Array} - Filtered recipients
     */
    const searchRecipients = async (query) => {                        
        const lowerQuery = query.toLowerCase();
        const payload = {
            nodeType: "actions",
            appId: "msteams",
            eventId: "send_message",
            dataType: "listConversation",
            fieldId: "channel",
            params: {
                keyword: lowerQuery
            },
            meta: {},
            connectionId: config.connectionId,
        }
        return store.dispatch(getChannelRecepients({userId: config.userId, source: config.source, payload})).then(response => {
            console.log(response);
            return response.payload;
        });        
    };

    /**
     * Handle search input changes
     * @param {string} query - Search query
     */
    const handleSearchInput = async (query) => {
        const results = await searchRecipients(query);
        renderSearchDropdown(results);
        
        if (results.length > 0 || query.trim() !== '') {
            showDropdown();
        } else {
            hideDropdown();
        }
    };

    /**
     * Handle search input focus
     */
    const handleSearchFocus = async () => {
        const results = await searchRecipients(searchInput?.value || '');
        renderSearchDropdown(results);
        showDropdown();
    };

    /**
     * Render search dropdown with results
     * @param {Array} results - Search results (grouped structure)
     */
    const renderSearchDropdown = async (results) => {
        if (!searchDropdownList) return;
        
        // Check if results is empty or has no groups
        if (!results?.groupedChoices || !Array.isArray(results?.groupedChoices) || results?.groupedChoices?.length === 0) {
            searchDropdownList.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }

        // Render grouped results
        searchDropdownList.innerHTML = results?.groupedChoices?.map(group => {            

            // Render group header
            const groupHeader = `
                <div class="dropdown-group-header">
                    <div class="dropdown-group-name">${group.groupName}</div>                   
                </div>
            `;

            // Render group items
            const groupItems = group?.choices?.map(item => {
                const isSelected = selectedRecipients.some(r => r.id === item.id);
                const itemType = item.meta?.type || 'user';
                
                // Get first letter of label for avatar
                const firstLetter = item.label?.charAt(0)?.toUpperCase() || '?';
                
                // Build subtitle based on type
                let subtitle = '';
                if (itemType === 'channel' && item.meta?.teamLabel) {
                    subtitle = item.meta.teamLabel;
                } else if (itemType === 'user' && item.meta?.email) {
                    subtitle = item.meta.email;
                } else if (itemType === 'group' && item.meta?.memberCount) {
                    subtitle = `${item.meta.memberCount} members`;
                }

                return `
                    <div class="dropdown-item ${isSelected ? 'selected' : ''}" data-id="${item.id}" data-type="${itemType}">
                        <div class="dropdown-item-content">
                            <div class="dropdown-item-avatar">${firstLetter}</div>
                            <div class="dropdown-item-details">
                                <div class="dropdown-item-name">${item.label}</div>
                                ${subtitle ? `<div class="dropdown-item-subtitle">${subtitle}</div>` : ''}
                            </div>
                        </div>
                        ${isSelected ? `
                            <span class="dropdown-item-checkmark">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.3332 4L5.99984 11.3333L2.6665 8" stroke="#12B76A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                        ` : ''}
                    </div>
                `;
            }).join('');

            return groupHeader + groupItems;
        }).join('');

        // Attach click handlers to dropdown items
        searchDropdownList.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const itemId = e.currentTarget.getAttribute('data-id');
                const itemType = e.currentTarget.getAttribute('data-type');
                
                // Find the item in the results
                let selectedItem = null;
                for (const group of results.groupedChoices) {
                    if (group.choices) {
                        selectedItem = group.choices.find(choice => choice.id === itemId);
                        if (selectedItem) break;
                    }
                }
                
                if (selectedItem) {
                    if (searchInput) {
                        searchInput.value = '';
                    }
                    toggleRecipient(selectedItem);
                }
            });
        });
    };

    /**
     * Toggle recipient selection
     * @param {Object} recipient - Recipient to toggle
     */
    const toggleRecipient = async (recipient) => {
        const existingIndex = selectedRecipients.findIndex(r => r.id === recipient.id);
        
        if (existingIndex >= 0) {
            selectedRecipients.splice(existingIndex, 1);
        } else {
            selectedRecipients.push(recipient);
        }
        
        updateSelectedRecipients();
        const results = await searchRecipients(searchInput?.value || '');
        renderSearchDropdown(results);
        notifyRecipientsChange();
    };

    /**
     * Update selected recipients UI
     */
    const updateSelectedRecipients = () => {
        if (!selectedRecipientsContainer) return;
        
        if (selectedRecipients.length === 0) {
            selectedRecipientsContainer.style.display = 'none';
            selectedRecipientsContainer.innerHTML = '';
            if (searchInput) {
                searchInput.placeholder = 'Search user or user groups';
            }
            return;
        }
        
        selectedRecipientsContainer.style.display = 'flex';
        selectedRecipientsContainer.innerHTML = selectedRecipients.map(recipient => {
            const recipientType = recipient.meta?.type || recipient.type || 'user';
            const variant = recipientType === 'group' ? 'primary' : (recipientType === 'channel' ? 'success' : 'neutral');
            const displayName = recipient.label || recipient.name || 'Unknown';
            return `
                <sl-tag variant="${variant}" size="small" removable data-id="${recipient.id}">
                    ${displayName}
                </sl-tag>
            `;
        }).join('');

        if (searchInput) {
            searchInput.placeholder = '';
        }

        // Attach remove handlers to tags
        selectedRecipientsContainer.querySelectorAll('sl-tag').forEach(tag => {
            tag.addEventListener('sl-remove', (e) => {
                const recipientId = e.target.getAttribute('data-id');
                const recipient = selectedRecipients.find(r => r.id === recipientId);
                if (recipient) {
                    toggleRecipient(recipient);
                }
            });
        });
    };

    /**
     * Show the dropdown
     */
    const showDropdown = () => {
        if (searchDropdown) {
            searchDropdown.style.display = 'block';
        }
    };

    /**
     * Hide the dropdown
     */
    const hideDropdown = () => {
        if (searchDropdown) {
            searchDropdown.style.display = 'none';
        }
    };

    /**
     * Notify parent of recipients change
     */
    const notifyRecipientsChange = () => {
        onRecipientsChange([...selectedRecipients]);
    };

    /**
     * Get currently selected recipients
     * @returns {Array} - Array of selected recipients
     */
    const getSelectedRecipients = () => {
        return [...selectedRecipients];
    };

    /**
     * Set recipients programmatically
     * @param {Array} recipients - Array of recipients to set
     */
    const setSelectedRecipients = (recipients) => {
        selectedRecipients = [...recipients];
        updateSelectedRecipients();
        notifyRecipientsChange();
    };

    /**
     * Clear all selected recipients
     */
    const clearSelectedRecipients = () => {
        selectedRecipients = [];
        updateSelectedRecipients();
        notifyRecipientsChange();
    };

    /**
     * Update the data source for search
     * @param {Array} newDataSource - New data source
     */
    const setDataSource = (newDataSource) => {
        dataSource = newDataSource;
        if (searchInput) {
            handleSearchInput(searchInput.value || '');
        }
    };

    /**
     * Destroy the manager and clean up event listeners
     */
    const destroy = () => {
        // Remove event listeners
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
        }
        if (searchInputWrapper) {
            searchInputWrapper.replaceWith(searchInputWrapper.cloneNode(true));
        }
        
        // Clear references
        searchInputWrapper = null;
        searchInput = null;
        searchDropdown = null;
        searchDropdownList = null;
        selectedRecipientsContainer = null;
        selectedRecipients = [];
    };

    // Initialize on creation
    initialize();

    // Return public API
    return {
        getSelectedRecipients,
        setSelectedRecipients,
        clearSelectedRecipients,
        setDataSource,
        destroy
    };
};

export default initializeRecipientSearch;

