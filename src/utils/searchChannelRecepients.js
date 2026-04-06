/**
 * searchChannelRecepients
 * Matches the Kora-React searchChannelPeopleSlack + SlackChannelDropDown behavior.
 *
 * Key design decisions:
 * - Dropdown is appended to document.body with position:fixed (like TomSelect),
 *   so it can never be clipped by parent overflow:hidden containers in the chat widget.
 * - _recipientSearchInit guard on the wrapper element prevents duplicate event
 *   listeners when the template re-renders (which would cause multiple API calls).
 * - Only ONE fetchData() path on initial click: the wrapper's click handler.
 *   The focus handler ONLY sets isSearchFocused (matching Kora-React onFocus).
 */

import { getChannelRecepients } from "../redux/actions/global.action";
import store from "../redux/store";
import { createCloseIcon } from "../templateRenderer/icons-library";

const MAX_RECIPIENTS = 5;
const INITIAL_RESULTS_PER_GROUP = 3;
const BLUR_DELAY = 500;

export const initializeRecipientSearch = (config) => {
    const {
        reqId,
        onRecipientsChange = () => {},
        provider = 'msteams',
        prefix = 'teams'
    } = config;

    const appId = provider === 'slack' ? 'slack' : 'msteams';
    const elementPrefix = prefix;

    let searchInputWrapper = null;
    let searchInput = null;
    let searchDropdown = null;
    let searchDropdownList = null;
    let selectedRecipientsContainer = null;

    let selectedRecipients = [];
    let isSearchFocused = false;
    let searchText = '';
    let blurTimer = null;
    let isFetching = false;

    // ─── Floating dropdown positioning (like TomSelect) ───────────────────────
    const positionDropdown = () => {
        if (!searchInputWrapper || !searchDropdown) return;
        const rect = searchInputWrapper.getBoundingClientRect();
        // position:fixed coordinates are ALWAYS viewport-relative.
        // getBoundingClientRect() already returns viewport-relative values.
        // DO NOT add window.scrollY/scrollX — that double-counts the scroll offset
        // and places the dropdown off-screen on any scrolled page.
        searchDropdown.style.top = `${rect.bottom + 4}px`;
        searchDropdown.style.left = `${rect.left}px`;
        searchDropdown.style.width = `${rect.width}px`;
    };

    const handleRepositionOnScroll = () => {
        if (searchDropdown && searchDropdown.style.display !== 'none') {
            positionDropdown();
        }
    };

    // ─── Initialization ────────────────────────────────────────────────────────
    const initialize = () => {
        searchInputWrapper = document.getElementById(`${elementPrefix}-search-input-wrapper-${reqId}`);
        searchInput = document.getElementById(`${elementPrefix}-search-${reqId}`);
        selectedRecipientsContainer = document.getElementById(`${elementPrefix}-selected-recipients-${reqId}`);

        if (!searchInput || !searchInputWrapper) {
            console.warn(`[RecipientSearch] DOM elements not found for prefix=${elementPrefix}, reqId=${reqId}`);
            return;
        }

        // Guard: prevent duplicate event listeners when template re-renders.
        // This is the primary fix for multiple API calls on click.
        if (searchInputWrapper._recipientSearchInit) return;
        searchInputWrapper._recipientSearchInit = true;

        // Create floating dropdown and append to body (like TomSelect's dropdownParent:'body').
        // This ensures the dropdown is never clipped by parent overflow:hidden elements
        // in the chat widget scroll container.
        searchDropdown = document.createElement('div');
        searchDropdown.id = `${elementPrefix}-search-dropdown-${reqId}`;
        searchDropdown.className = 'recipient-floating-dropdown';
        searchDropdown.style.display = 'none';

        searchDropdownList = document.createElement('div');
        searchDropdownList.id = `${elementPrefix}-search-dropdown-list-${reqId}`;
        searchDropdownList.className = 'recipient-floating-dropdown-list';
        searchDropdown.appendChild(searchDropdownList);

        document.body.appendChild(searchDropdown);

        window.addEventListener('scroll', handleRepositionOnScroll, true);
        window.addEventListener('resize', handleRepositionOnScroll);

        attachEventListeners();
    };

    // ─── Event Listeners ──────────────────────────────────────────────────────
    const attachEventListeners = () => {
        // Kora-React pattern: wrapper onClick focuses input + calls fetchData if empty.
        // This is the ONLY path that triggers a fetch on initial click.
        if (searchInputWrapper) {
            searchInputWrapper.addEventListener('click', (e) => {
                // Don't interfere with chip close buttons or the floating dropdown itself
                if (e.target.closest('.selectedChoice-close')) return;
                if (e.target.closest('.selectedChoice')) return;
                searchInput?.focus();
                if (searchText.length === 0) {
                    fetchData();
                }
            });
        }

        if (searchInput) {
            // Kora-React onFocus: ONLY sets the flag. Does NOT call fetchData.
            searchInput.addEventListener('focus', () => {
                isSearchFocused = true;
            });

            searchInput.addEventListener('blur', (e) => {
                e.stopPropagation();
                if (blurTimer) clearTimeout(blurTimer);
                blurTimer = setTimeout(() => {
                    isSearchFocused = false;
                    hideDropdown();
                }, BLUR_DELAY);
            });

            // Kora-React: useEffect([searchText]) → fetchData on every text change.
            searchInput.addEventListener('input', (e) => {
                isSearchFocused = true;
                searchText = e.target.value;
                if (selectedRecipients.length < MAX_RECIPIENTS) {
                    fetchData();
                }
            });

            // Kora-React handleKeyDown: Backspace removes last selection when input is empty
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && searchText.length === 0) {
                    if (selectedRecipients.length > 0) {
                        removeRecipient(selectedRecipients[selectedRecipients.length - 1]);
                    }
                }
            });

            searchInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.originalEvent || e).clipboardData.getData('text/plain');
                searchInput.value = text;
                searchText = text;
                isSearchFocused = true;
                fetchData();
            });
        }
    };

    // ─── Data Fetching ────────────────────────────────────────────────────────
    const fetchData = async () => {
        if (!isSearchFocused) return;
        if (selectedRecipients.length >= MAX_RECIPIENTS) return;
        // isFetching prevents concurrent calls from the same closure instance
        if (isFetching) return;

        isFetching = true;
        showDropdown();
        if (searchDropdownList) {
            searchDropdownList.innerHTML = '<div class="rfd-no-results">Loading...</div>';
        }

        try {
            const results = await searchRecipients(searchText);
            afterResultsSuccess(results);
        } catch (err) {
            console.error('[RecipientSearch] API error:', err);
            if (searchDropdownList) {
                searchDropdownList.innerHTML = '<div class="rfd-no-results">Failed to load. Try again.</div>';
            }
        } finally {
            isFetching = false;
        }
    };

    const afterResultsSuccess = (data) => {
        if (!data?.groupedChoices) {
            if (searchDropdownList) {
                searchDropdownList.innerHTML = '<div class="rfd-no-results">No results found</div>';
            }
            // Dropdown was already shown (Loading...) — keep it visible with the message
            if (isSearchFocused) showDropdown();
            return;
        }

        let groupedResults;
        if (searchText.length === 0) {
            // Kora-React: slice to INITIAL_RESULTS_PER_GROUP per group for empty search
            groupedResults = data.groupedChoices.map(group => ({
                ...group,
                choices: (group.choices || []).slice(0, INITIAL_RESULTS_PER_GROUP)
            }));
        } else {
            groupedResults = data.groupedChoices;
        }

        renderDropdown(groupedResults);
        // Always show the dropdown after results arrive (as long as input is focused).
        // Don't gate on groupedResults.some(...) — the dropdown was already open for
        // "Loading..." and must stay open to display the rendered results.
        if (isSearchFocused) {
            showDropdown();
        }
    };

    const searchRecipients = async (query) => {
        let payload;
        if (appId === 'slack') {
            payload = {
                connectionId: config.connectionId,
                fieldId: "channel",
                dataType: "listConversation",
                keyword: query,
                params: {},
                meta: { page: 0 }
            };
        } else {
            payload = {
                nodeType: "actions",
                appId: "msteams",
                eventId: "send_message",
                dataType: "listConversation",
                fieldId: "channel",
                params: { keyword: query },
                meta: {},
                connectionId: config.connectionId,
            };
        }

        const response = await store.dispatch(getChannelRecepients({
            userId: config.userId,
            source: config.source,
            payload
        }));
        return response.payload;
    };

    // ─── Dropdown Rendering (matches SlackChannelDropDown.jsx) ────────────────
    const renderDropdown = (groupedResults) => {
        if (!searchDropdownList) return;

        if (!groupedResults || groupedResults.length === 0) {
            searchDropdownList.innerHTML = '<div class="rfd-no-results">No results found</div>';
            return;
        }

        searchDropdownList.innerHTML = groupedResults.map(group => {
            const isPeopleGroup = group.groupId === 'peopleAndGroup';

            const headerHtml = `
                <div class="rfd-headerwrapper${isPeopleGroup ? ' peopleGroup' : ''}">
                    <div class="rfd-groupName ${group.choices?.length ? '' : 'highlighted'}">${group.groupName}</div>
                    ${isPeopleGroup ? `<div class="rfd-infocircle" title="Displaying only threads you interacted">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 14.667C11.682 14.667 14.667 11.682 14.667 8C14.667 4.318 11.682 1.333 8 1.333C4.318 1.333 1.333 4.318 1.333 8C1.333 11.682 4.318 14.667 8 14.667Z" stroke="#98A2B3" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8 10.667V8M8 5.333H8.007" stroke="#98A2B3" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>` : ''}
                </div>
            `;

            const choicesHtml = `<div class="rfd-choicewrap">${(group.choices || []).map(choice => {
                const isSelected = selectedRecipients.some(s => s.id === choice.id);
                const itemType = choice.meta?.type || 'user';
                const isPublic = itemType === 'public';
                const firstLetter = choice.label?.charAt(0)?.toUpperCase() || '?';

                let profileIconHtml;
                if (isPublic) {
                    profileIconHtml = `<div class="rfd-hash">#</div>`;
                } else if (itemType === 'people' && choice.meta?.icon) {
                    profileIconHtml = `<img src="${choice.meta.icon}" alt="${choice.label}" />`;
                } else {
                    profileIconHtml = `<div class="rfd-groupIcon">${firstLetter}</div>`;
                }

                const subtitle = choice.meta?.email || choice.meta?.teamLabel || choice.meta?.subLabel || '';

                return `
                    <div class="rfd-choice${isPublic ? ' channelChoice' : ''}" data-id="${choice.id}">
                        <div class="rfd-profileinfo">
                            <div class="rfd-groupBox${isPublic ? ' publicGroupBox' : ''}">
                                ${profileIconHtml}
                            </div>
                            <div class="rfd-details">
                                <div class="rfd-name">${choice.label}</div>
                                ${subtitle ? `<div class="rfd-sub">${subtitle}</div>` : ''}
                            </div>
                        </div>
                        ${isSelected ? `<div class="rfd-tick">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 3L4.5 8.5L2 6" stroke="#101828" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>` : ''}
                    </div>
                `;
            }).join('')}</div>`;

            return headerHtml + choicesHtml;
        }).join('');

        attachChoiceListeners(groupedResults);
    };

    const attachChoiceListeners = (groupedResults) => {
        if (!searchDropdownList) return;
        searchDropdownList.querySelectorAll('.rfd-choice').forEach(choiceEl => {
            choiceEl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const itemId = choiceEl.getAttribute('data-id');
                let found = null;
                for (const group of groupedResults) {
                    found = (group.choices || []).find(c => c.id === itemId);
                    if (found) break;
                }
                if (found) addRecipient(found);
            });
        });
    };

    // ─── Selection Management (matches searchChannelPeopleSlack.jsx) ──────────
    const addRecipient = (selection) => {
        if (selectedRecipients.some(s => s.id === selection.id)) return;
        if (selectedRecipients.length >= MAX_RECIPIENTS) return;

        selectedRecipients.push(selection);
        searchText = '';
        if (searchInput) searchInput.value = '';
        updateSelectedUI();
        notifyRecipientsChange();
        fetchData();
    };

    const removeRecipient = (selection) => {
        selectedRecipients = selectedRecipients.filter(s => s.id !== selection.id);
        updateSelectedUI();
        notifyRecipientsChange();
    };

    const updateSelectedUI = () => {
        if (!selectedRecipientsContainer) return;

        // Remove stale limit text
        const existingLimit = searchInputWrapper?.querySelector('.reachLimitText');
        if (existingLimit) existingLimit.remove();

        if (selectedRecipients.length === 0) {
            selectedRecipientsContainer.innerHTML = '';
            if (searchInput) {
                searchInput.style.display = '';
                searchInput.placeholder = 'Search user or user groups';
            }
            return;
        }

        // Render selected chips — display:contents on the container makes chips
        // appear as direct flex items of the wrapper (matching Kora-React's layout)
        selectedRecipientsContainer.innerHTML = selectedRecipients.map(sel => {
            const itemType = sel.meta?.type || 'user';
            const firstLetter = sel.label?.charAt(0)?.toUpperCase() || '?';

            let profileHtml;
            if (itemType === 'public') {
                profileHtml = `<div class="hashsymbol">#</div>`;
            } else if (itemType === 'people' && sel.meta?.icon) {
                profileHtml = `<div class="personimg"><img src="${sel.meta.icon}" /></div>`;
            } else {
                profileHtml = `<div class="groupIcon">${firstLetter}</div>`;
            }

            return `
                <div class="selectedChoice" data-id="${sel.id}">
                    <div class="profilechoice">${profileHtml}</div>
                    <div class="selectionLabel">${sel.label}</div>
                    <div class="selectedChoice-close">
                        ${createCloseIcon({ size: 10, color: '#667085' })}
                    </div>
                </div>
            `;
        }).join('');

        selectedRecipientsContainer.querySelectorAll('.selectedChoice-close').forEach(closeEl => {
            closeEl.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const choiceEl = closeEl.closest('.selectedChoice');
                const id = choiceEl?.getAttribute('data-id');
                const sel = selectedRecipients.find(s => s.id === id);
                if (sel) removeRecipient(sel);
            });
        });

        if (selectedRecipients.length >= MAX_RECIPIENTS) {
            if (searchInput) searchInput.style.display = 'none';
            const limitEl = document.createElement('div');
            limitEl.className = 'reachLimitText';
            limitEl.textContent = 'You reached the maximum limit.';
            searchInput.insertAdjacentElement('afterend', limitEl);
        } else {
            if (searchInput) {
                searchInput.style.display = '';
                searchInput.placeholder = '';
            }
        }
    };

    // ─── Dropdown Visibility ──────────────────────────────────────────────────
    const showDropdown = () => {
        if (!searchDropdown) return;
        positionDropdown();
        searchDropdown.style.display = 'block';
    };

    const hideDropdown = () => {
        if (searchDropdown) searchDropdown.style.display = 'none';
    };

    // ─── Public API ───────────────────────────────────────────────────────────
    const notifyRecipientsChange = () => {
        onRecipientsChange([...selectedRecipients]);
    };

    const getSelectedRecipients = () => [...selectedRecipients];

    const setSelectedRecipients = (recipients) => {
        selectedRecipients = [...recipients];
        updateSelectedUI();
        notifyRecipientsChange();
    };

    const clearSelectedRecipients = () => {
        selectedRecipients = [];
        updateSelectedUI();
        notifyRecipientsChange();
    };

    const destroy = () => {
        if (blurTimer) clearTimeout(blurTimer);
        window.removeEventListener('scroll', handleRepositionOnScroll, true);
        window.removeEventListener('resize', handleRepositionOnScroll);
        if (searchDropdown && document.body.contains(searchDropdown)) {
            searchDropdown.remove();
        }
        if (searchInputWrapper) {
            searchInputWrapper._recipientSearchInit = false;
        }
        searchInputWrapper = null;
        searchInput = null;
        searchDropdown = null;
        searchDropdownList = null;
        selectedRecipientsContainer = null;
        selectedRecipients = [];
    };

    initialize();

    return {
        getSelectedRecipients,
        setSelectedRecipients,
        clearSelectedRecipients,
        destroy
    };
};

export default initializeRecipientSearch;
