import { searchIcon, attachmentIcon, ActionsFlashIcon, arrowCirlceUpIcon, Teamsimg } from "../icons-library";
import "./../styles/template.scss";

export function render(data) {

    if (data?.status === 'completed') {
        return renderTeamsMessageSummary(data);
    }

    let teamsList = data?.templateInfo?.connections;
    let defaultConnectionId = data?.templateInfo?.defaultConnections;
    
    let html = `
        <div class="teams-message-template">
            <div class='teams-message-container'>
                <div class="teams-header-block">
                    <div class='connection-provider-icon'>                            
                        ${Teamsimg({ size: 16, color: "#131316" })}
                    </div>
                    <sl-select id="teams-connection-${data?.reqId}" value="${defaultConnectionId || ''}">
                        ${teamsList?.map((team, index) =>
        `
                        <sl-option value="${team?.id}" id="teams-connection-${index}">${team?.label || team?.name}</sl-option>
                        `
    ).join('')}
                    </sl-select>
                </div>
                
                <div class="teams-recipients-section">
                    <div class="teams-search-field">
                        <div class="teams-search-input-wrapper" id="teams-search-input-wrapper-${data?.reqId}">
                            <div class="teams-selected-recipients" id="teams-selected-recipients-${data?.reqId}">
                                <!-- Selected recipients will appear here as tags -->
                            </div>
                            <input
                                type="text"
                                class="teams-search-input"
                                placeholder="Search user or user groups"
                                id="teams-search-${data?.reqId}"
                            />
                        </div>
                        
                        <div class="teams-search-dropdown" id="teams-search-dropdown-${data?.reqId}" style="display: none;">
                            <div class="teams-search-dropdown-list" id="teams-search-dropdown-list-${data?.reqId}">
                                <!-- Search results will appear here -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="teams-message-body">
                    <div
                        class="teams-message-editor"
                        id="teams-message-body-${data?.reqId}"
                        contenteditable="true"
                        placeholder="Type your message here..."
                        >
                        ${data?.content?.message || ''}
                    </div>
                </div>

                <div class="teams-message-footer">
                    <div class="teams-footer-left">
                        <label for="teams-attachments-${data?.reqId}" class="teams-attachment-btn">
                            <input
                                type="file"
                                id="teams-attachments-${data?.reqId}"
                                multiple
                                style="display: none;"
                            />
                            <span class="attachment-icon">
                                ${attachmentIcon({ size: 16, color: "#667085" })}
                            </span>
                            <span class="attachment-text">Attachments</span>
                        </label>
                        
                        <button class="teams-smart-compose-btn" id="teams-smart-compose-${data?.reqId}">
                            <span class="smart-compose-icon">
                                ${ActionsFlashIcon({ size: 16, color: "#667085" })}
                            </span>
                            <span class="smart-compose-text">Smart Compose</span>
                        </button>
                    </div>
                    
                    <div class="teams-footer-right">
                        <sl-button class="primary-button-black teams-send-btn" id="teams-send-${data?.reqId}" variant="primary">                            
                            Send
                        </sl-button>
                    </div>
                </div>

                <div class="teams-attachments-preview" id="teams-attachments-preview-${data?.reqId}">
                    <!-- Attachment previews will be displayed here -->
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        initializeTeamsMessageFunctionality(data);
    }, 1000);

    return html;
}

const renderTeamsMessageSummary = (data) => {
    let recipients = data?.content?.recipients || [];
    
    let html = `
        <div class="teams-message-small-card">
            <div class="teams-summary-header">
                <div class="teams-icon">
                    ${Teamsimg({ size: 20 })}
                </div>
                <h3>Teams Message Sent</h3>
            </div>
            <div class="teams-summary-body">
                <div class="teams-summary-recipients">
                    <strong>To:</strong>
                    ${recipients?.map(recipient => `<span class="recipient-tag">${recipient?.name || recipient?.email}</span>`).join('')}
                </div>
                <div class="teams-summary-message">
                    ${data?.content?.message}
                </div>
                ${data?.content?.attachments?.length > 0 ? `
                    <div class="teams-summary-attachments">
                        <strong>Attachments:</strong> ${data?.content?.attachments?.length} file(s)
                    </div>
                ` : ''}
            </div>
        </div>
    `

    return html;
}

const initializeTeamsMessageFunctionality = (data) => {
    const reqId = data?.reqId;
    
    // Initialize search functionality
    const searchInputWrapper = document.getElementById(`teams-search-input-wrapper-${reqId}`);
    const searchInput = document.getElementById(`teams-search-${reqId}`);
    const searchDropdown = document.getElementById(`teams-search-dropdown-${reqId}`);
    const searchDropdownList = document.getElementById(`teams-search-dropdown-list-${reqId}`);
    const selectedRecipientsContainer = document.getElementById(`teams-selected-recipients-${reqId}`);
    const messageBody = document.getElementById(`teams-message-body-${reqId}`);
    const sendButton = document.getElementById(`teams-send-${reqId}`);
    const smartComposeBtn = document.getElementById(`teams-smart-compose-${reqId}`);
    const attachmentInput = document.getElementById(`teams-attachments-${reqId}`);
    const attachmentsPreview = document.getElementById(`teams-attachments-preview-${reqId}`);

    let attachedFiles = [];
    let selectedRecipients = [];
    
    // Focus input when clicking on wrapper
    if (searchInputWrapper) {
        searchInputWrapper.addEventListener('click', (e) => {
            // Don't focus if clicking on a tag's remove button
            if (!e.target.closest('sl-tag')) {
                searchInput?.focus();
            }
        });
    }
    
    // Static mock data for users and groups
    const mockUsersAndGroups = [
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

    // Function to search and filter users/groups
    const searchRecipients = (query) => {
        if (!query || query.trim() === '') {
            return mockUsersAndGroups;
        }
        const lowerQuery = query.toLowerCase();
        return mockUsersAndGroups.filter(item => 
            item.name.toLowerCase().includes(lowerQuery) || 
            (item.email && item.email.toLowerCase().includes(lowerQuery))
        );
    };

    // Function to render search dropdown
    const renderSearchDropdown = (results) => {
        if (!searchDropdownList) return;
        
        if (results.length === 0) {
            searchDropdownList.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }

        searchDropdownList.innerHTML = results.map(item => {
            const isSelected = selectedRecipients.some(r => r.id === item.id);
            const iconType = item.type === 'user' ? '👤' : '👥';
            const subtitle = item.type === 'user' ? item.email : `${item.memberCount} members`;
            
            return `
                <div class="dropdown-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
                    <div class="dropdown-item-content">
                        <span class="dropdown-item-icon">${iconType}</span>
                        <div class="dropdown-item-details">
                            <div class="dropdown-item-name">${item.name}</div>
                            <div class="dropdown-item-subtitle">${subtitle}</div>
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

        // Add click handlers
        searchDropdownList.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const itemId = e.currentTarget.getAttribute('data-id');
                const recipient = mockUsersAndGroups.find(r => r.id === itemId);
                if (recipient) {
                    toggleRecipient(recipient);
                }
            });
        });
    };

    // Function to toggle recipient selection
    const toggleRecipient = (recipient) => {
        const existingIndex = selectedRecipients.findIndex(r => r.id === recipient.id);
        
        if (existingIndex >= 0) {
            // Remove recipient
            selectedRecipients.splice(existingIndex, 1);
        } else {
            // Add recipient
            selectedRecipients.push(recipient);
        }
        
        updateSelectedRecipients();
        renderSearchDropdown(searchRecipients(searchInput?.value || ''));
        validateForm();
    };

    // Function to update selected recipients display
    const updateSelectedRecipients = () => {
        if (!selectedRecipientsContainer) return;
        
        if (selectedRecipients.length === 0) {
            selectedRecipientsContainer.style.display = 'none';
            selectedRecipientsContainer.innerHTML = '';
            // Show placeholder
            if (searchInput) {
                searchInput.placeholder = 'Search user or user groups';
            }
            return;
        }
        
        selectedRecipientsContainer.style.display = 'flex';
        selectedRecipientsContainer.innerHTML = selectedRecipients.map(recipient => {
            const variant = recipient.type === 'group' ? 'primary' : 'neutral';
            return `
                <sl-tag variant="${variant}" size="small" removable data-id="${recipient.id}">
                    ${recipient.name}
                </sl-tag>
            `;
        }).join('');

        // Hide placeholder when tags are present
        if (searchInput) {
            searchInput.placeholder = '';
        }

        // Add remove handlers
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

    // Handle search input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            const results = searchRecipients(query);
            renderSearchDropdown(results);
            
            if (searchDropdown) {
                searchDropdown.style.display = results.length > 0 || query.trim() !== '' ? 'block' : 'none';
            }
        });

        // Show dropdown on focus
        searchInput.addEventListener('focus', () => {
            const results = searchRecipients(searchInput.value || '');
            renderSearchDropdown(results);
            if (searchDropdown) {
                searchDropdown.style.display = 'block';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (searchDropdown && 
                !searchInputWrapper?.contains(e.target) && 
                !searchDropdown.contains(e.target)) {
                searchDropdown.style.display = 'none';
            }
        });
    }

    // Handle attachment selection
    if (attachmentInput) {
        attachmentInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            attachedFiles = [...attachedFiles, ...files];
            updateAttachmentsPreview();
        });
    }

    // Update attachments preview
    const updateAttachmentsPreview = () => {
        if (attachmentsPreview && attachedFiles.length > 0) {
            attachmentsPreview.innerHTML = `
                <div class="attachments-list">
                    ${attachedFiles.map((file, index) => `
                        <div class="attachment-item">
                            <span class="attachment-name">${file.name}</span>
                            <button class="attachment-remove" data-index="${index}">×</button>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Add remove handlers
            attachmentsPreview.querySelectorAll('.attachment-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    attachedFiles.splice(index, 1);
                    updateAttachmentsPreview();
                });
            });
            
            attachmentsPreview.style.display = 'block';
        } else if (attachmentsPreview) {
            attachmentsPreview.style.display = 'none';
        }
    };

    // Handle smart compose
    if (smartComposeBtn) {
        smartComposeBtn.addEventListener('click', () => {
            // Trigger smart compose functionality
            console.log('Smart compose triggered');
            // You can add your AI-powered composition logic here
        });
    }

    // Handle send button
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            const message = messageBody?.innerHTML || '';
            
            console.log('Sending Teams message:', {
                recipients: selectedRecipients,
                message,
                attachments: attachedFiles
            });
            
            // Add your send logic here
        });
    }

    // Enable/disable send button based on content
    const validateForm = () => {
        const hasRecipients = selectedRecipients.length > 0;
        const hasMessage = messageBody?.textContent?.trim().length > 0;
        
        if (sendButton) {
            sendButton.disabled = !(hasRecipients && hasMessage);
        }
    };

    // Add validation listeners
    if (messageBody) {
        messageBody.addEventListener('input', validateForm);
    }

    // Initial validation
    validateForm();
};

export default { render };

