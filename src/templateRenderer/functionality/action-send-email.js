import { cloneDeep } from "lodash";
import { delayedSearchCallback, getFileExtension, getUID } from "../../utils/helpers";
import store from "../../redux/store";
import { updateChatData } from "../../redux/globalSlice";
import { sendEmail, smartComposeEmail } from "../../redux/actions/global.action";
import { Gmail, Outlookimg, Teamsimg, Slackimg } from "../icons-library";
import FileUploader from "../../utils/FileUploader";



const sendEmailFunctionality = (data) => {

    const getState = () => {
        let state = store?.getState()?.global
        // For multi-intent task steps, the question is keyed by cId/id (stepId), not reqId.
        // Fallback chain: cId → id → reqId
        const key = data?.cId || data?.id || data?.reqId;
        const currentData = state?.questions?.[key];
        return { state, currentData };
    };

    // Helper function to get icon based on provider
    const getProviderIcon = (provider) => {
        const iconSize = 16;
        const iconColor = "#131316";
        
        switch(provider?.toLowerCase()) {
            case 'gmail':
                return Gmail({ size: iconSize, color: iconColor });
            case 'outlook':
                return Outlookimg({ size: iconSize, color: iconColor });
            case 'teams':
                return Teamsimg({ size: iconSize, color: iconColor });
            case 'slack':
                return Slackimg({ size: iconSize, color: iconColor });
            default:
                return Gmail({ size: iconSize, color: iconColor }); // Default fallback
        }
    };

    // Local reference to current question 
    let { state: initialState, currentData: initialCurrentData } = getState();
    let localCurrentData = cloneDeep(initialCurrentData);

    // Store TomSelect instances to manually sync with local data
    const tomSelectInstances = {};
        
    let isSyncing = false;

    const getSearchedUsers = async (text, type) => {
        if (!text?.length) return [];

        let { currentData } = getState();

        let values = preserveEmailContent();
        let obj = {
            value: text,
            connectionSource: currentData?.provider,
            connectionId: currentData?.templateInfo?.defaultConnections || currentData?.connId || data?.templateInfo?.defaultConnections || data?.connId,
            fieldTo: type
        };

        let response = await delayedSearchCallback(obj);

        if (!localCurrentData.content) localCurrentData.content = {};
        localCurrentData.content.subject = values?.subject;
        localCurrentData.content.body = values?.body;
        localCurrentData[`${type}Choices`] = {
            res: response,
            input: text
        };

        return response || [];
    };

    const insertEmail = (email, type) => {
        
        if (isSyncing) return;
        
        
        if (!localCurrentData.content) localCurrentData.content = {};
        if (!localCurrentData.content[type]) localCurrentData.content[type] = [];
        
        let existingEmails = [...localCurrentData.content[type]];
        existingEmails.push(email);
        localCurrentData.content[type] = existingEmails;

        
        let values = preserveEmailContent();
        localCurrentData.content.subject = values?.subject;
        localCurrentData.content.body = values?.body;

        
        if (localCurrentData[`${type}Choices`]) {
            delete localCurrentData[`${type}Choices`];
        }

        
        clearTomSelectSearchState(type);

        
        setTimeout(()=>validateSendButton(), 100);
    }

    const removePerson = (email, type) => {
        
        if (isSyncing) return;
        
        
        if (localCurrentData.content && localCurrentData.content[type]) {
            let existingEmails = [...localCurrentData.content[type]];
            existingEmails = existingEmails.filter(item => item?.id !== email?.id);
            localCurrentData.content[type] = existingEmails;
        }

        
        let values = preserveEmailContent();
        localCurrentData.content.subject = values?.subject;
        localCurrentData.content.body = values?.body;

        
        clearTomSelectSearchState(type);

        
        setTimeout(()=>validateSendButton(), 100);
    }

    
        

    
    const clearTomSelectSearchState = (type) => {
        const tomInstance = tomSelectInstances[type];
        if (!tomInstance) return;
        
        tomInstance.control_input.value = '';
        
        
        tomInstance.close();
        
        
        tomInstance.clearOptions();
        
        // Re-add only the selected items as options
        const selectedItems = localCurrentData?.content?.[type] || [];
        selectedItems.forEach(item => {
            if (!tomInstance.options[item.id]) {
                tomInstance.addOption({
                    value: item.id,
                    text: item.id,
                    raw: item
                });
            }
        });
    };

    const preserveEmailContent = () => {
        let { state, currentData } = getState();
        let emailSubject = document.getElementById(`email-subject-${currentData?.reqId}`);
        let _emailBody = document.getElementById(`email-body-${currentData?.reqId}`);

        let values = {
            subject: '',
            body: ''
        }
        if(emailSubject) {
            values.subject = emailSubject.value;
        }
        if(_emailBody) {
            values.body = _emailBody.innerHTML;
        }
        // Use local state as source of truth for email fields (not global state!)
        if(localCurrentData?.content?.to) {
            values.to = localCurrentData.content.to;
        }
        if(localCurrentData?.content?.cc) {
            values.cc = localCurrentData.content.cc;
        }
        if(localCurrentData?.content?.bcc) {
            values.bcc = localCurrentData.content.bcc;
        }
        if(currentData?.content?.includeSource) {
            values.includeSource = currentData?.content?.includeSource;
        }
        if(currentData?.content?.attachmentPreview) {
            values.attachments = currentData?.content?.attachmentPreview;
        }

        return values;
    }

    const send = async () => {
        let { state } = getState();
                
        let values = preserveEmailContent();
        localCurrentData.content.subject = values?.subject;
        localCurrentData.content.body = values?.body;
        
        const to = localCurrentData?.content?.to?.map(item => {
            return {
                label: item?.label,
                id:  item?.id
            }
        })?.flat();
        const cc = localCurrentData?.content?.cc?.map(item => {
            return {
                label: item?.label,
                id: item?.id
            }
        })?.flat();
        const bcc = localCurrentData?.content?.bcc?.map(item => {
            return {
                label: item?.label,
                id: item?.id
            }
        })?.flat();


        let emailSubject = document.getElementById(`email-subject-${data?.reqId}`);
        let emailBody = document.getElementById(`email-body-${data?.reqId}`);

        const includeSource =  localCurrentData?.includeSource;
        const subject = emailSubject?.value || '';
        const body = emailBody?.innerHTML || '';
        const connectionId = document.getElementById(`email-connection-${data?.reqId}`)?.value
            || localCurrentData?.templateInfo?.defaultConnections
            || localCurrentData?.connId
            || data?.templateInfo?.defaultConnections
            || data?.connId
            || '';
        const attachments =  localCurrentData?.attachmentPreview;
        const attachmentsIds = [], attachmentComponents= []
        attachments?.map(attach => {
            attachmentsIds.push(attach?.fileUrl?.fileId)
            attachmentComponents.push(attach?.fileUrl)
        })

        if(to?.length === 0) {
            return;
        }

        let params = {
            userId: state?.profile?.data?.id,
            provider: localCurrentData?.provider || data?.provider
        }

        const payload = {
            connectionId: connectionId,
            params: {
                subject,
                content: body,
                to,
                cc,
                bcc,
                attachments: attachmentsIds,
                components: attachmentComponents
            },
            contextParams: {
                includeSource,                
                messageId:  localCurrentData?.messageId,
                dataId: localCurrentData?.parentMessageId || localCurrentData?.menuId
            }
        }

        let response = await store.dispatch(sendEmail({params, payload}));
        
        // Only update global store after successful response
        let updatedQuestions = cloneDeep(state?.questions);
        updatedQuestions[data?.reqId] = response?.payload;
        store.dispatch(updateChatData(updatedQuestions));
        
        // Update local reference with successful response
        localCurrentData = response?.payload;
    }

    let toSection = document.getElementById(`email-to-${data?.reqId}`);
    let ccSection = document.getElementById(`email-cc-${data?.reqId}`);
    let bccSection = document.getElementById(`email-bcc-${data?.reqId}`);

    if(toSection && !toSection?.eventListenerAdded) {
        const tomInstance = setupTomSelect({
            selectorId: `email-to-${data?.reqId}`,
            type: 'to',
            initialItems: localCurrentData?.content?.to || [],
            fetchSuggestions: getSearchedUsers,
            onAdd: insertEmail,
            onRemove: removePerson
          });

        // Store TomSelect instance for manual syncing
        tomSelectInstances['to'] = tomInstance;

        toSection.eventListenerAdded = true;
    }

    if(ccSection && !ccSection?.eventListenerAdded) {
        const ccInstance = setupTomSelect({
            selectorId: `email-cc-${data?.reqId}`,
            type: 'cc',
            initialItems: localCurrentData?.content?.cc || [],
            fetchSuggestions: getSearchedUsers,
            onAdd: insertEmail,
            onRemove: removePerson
        });

        // Store TomSelect instance for manual syncing
        tomSelectInstances['cc'] = ccInstance;

        ccSection.eventListenerAdded = true;
    }

    if(bccSection && !bccSection?.eventListenerAdded) {
        const bccInstance = setupTomSelect({
            selectorId: `email-bcc-${data?.reqId}`,
            type: 'bcc',
            initialItems: localCurrentData?.content?.bcc || [],
            fetchSuggestions: getSearchedUsers,
            onAdd: insertEmail,
            onRemove: removePerson
          });

        // Store TomSelect instance for manual syncing
        tomSelectInstances['bcc'] = bccInstance;

        bccSection.eventListenerAdded = true;
    }

    // CC / BCC toggle buttons
    const ccToggleBtn = document.getElementById(`cc-toggle-${data?.reqId}`);
    const bccToggleBtn = document.getElementById(`bcc-toggle-${data?.reqId}`);
    const ccRow = document.getElementById(`email-cc-row-${data?.reqId}`);
    const bccRow = document.getElementById(`email-bcc-row-${data?.reqId}`);

    if (ccToggleBtn && !ccToggleBtn.eventListenerAdded) {
        ccToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (ccRow) ccRow.style.display = '';
            ccToggleBtn.style.display = 'none';
            const ccInput = ccRow?.querySelector('.ts-control input');
            if (ccInput) setTimeout(() => ccInput.focus(), 0);
        });
        ccToggleBtn.eventListenerAdded = true;
    }

    if (bccToggleBtn && !bccToggleBtn.eventListenerAdded) {
        bccToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (bccRow) bccRow.style.display = '';
            bccToggleBtn.style.display = 'none';
            const bccInput = bccRow?.querySelector('.ts-control input');
            if (bccInput) setTimeout(() => bccInput.focus(), 0);
        });
        bccToggleBtn.eventListenerAdded = true;
    }

    function validateSendButton() {
        const sendBtn = document.getElementById(`email-send-${data?.reqId}`);
        if (!sendBtn) return;

        // 1. Check if at least 1 user is present in "to" field (from TomSelect DOM)
        const toSelectElement = document.getElementById(`email-to-${data?.reqId}`);
        const tomToInstance = tomSelectInstances['to'];
        
        let hasToRecipient = false;
        if (tomToInstance && tomToInstance.items) {
            // Get selected items directly from TomSelect instance
            hasToRecipient = tomToInstance.items.length > 0;
        } else if (toSelectElement && toSelectElement.selectedOptions) {
            // Fallback: check DOM select element
            hasToRecipient = toSelectElement.selectedOptions.length > 0;
        } else {
            // Last fallback: check local data
            const toEmails = localCurrentData?.content?.to || [];
            hasToRecipient = toEmails.length > 0;
        }

        // 2. Check if subject is filled
        const subjectInput = document.getElementById(`email-subject-${data?.reqId}`);
        const hasSubject = subjectInput?.value?.trim().length > 0;

        // 3. Check if body text is filled
        const bodyDiv = document.getElementById(`email-body-${data?.reqId}`);
        const bodyText = bodyDiv?.innerText?.replace(/\s+/g, '').trim();
        const hasBodyText = bodyText.length > 0;

        // All conditions must be met to enable send button
        const allConditionsMet = hasToRecipient && hasSubject && hasBodyText;

        // Enable/disable send button based on conditions
        sendBtn.disabled = !allConditionsMet;

        // Optional: Add visual feedback classes
        if (allConditionsMet) {
            sendBtn.classList.remove('disabled');
        } else {
            sendBtn.classList.add('disabled');
        }
      }
      

    document.getElementById(`email-subject-${data?.reqId}`)?.addEventListener('input', validateSendButton);
    document.getElementById(`email-body-${data?.reqId}`)?.addEventListener('input', validateSendButton);

    // Initial validation on form load
    setTimeout(()=>validateSendButton(), 100);

    let sendButton = document.getElementById(`email-send-${data?.reqId}`);
    if(sendButton && !sendButton?.eventListenerAdded) {
        sendButton.addEventListener('click', () => {
            send();
        });
        sendButton.eventListenerAdded = true;
    }

    // --- Attachment handling ---
    if (!localCurrentData.attachmentPreview) localCurrentData.attachmentPreview = [];

    function formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function getExtColor(ext) {
        if (!ext) return '#737373';
        switch (ext.toLowerCase()) {
            case 'pdf': return '#dc2626';
            case 'doc': case 'docx': return '#2563eb';
            case 'xls': case 'xlsx': case 'csv': return '#16a34a';
            case 'ppt': case 'pptx': return '#f97316';
            default: return '#737373';
        }
    }

    const renderAttachmentPreviews = () => {
        let container = document.getElementById(`email-attachment-preview-${data?.reqId}`);
        if (!container) {
            const sendBtn = document.getElementById(`email-send-${data?.reqId}`);
            const footer = sendBtn?.closest('.email-footer');
            if (footer) {
                const div = document.createElement('div');
                div.id = `email-attachment-preview-${data?.reqId}`;
                div.className = 'attachment-preview-container';
                footer.parentElement.insertBefore(div, footer);
                container = div;
            }
        }
        if (!container) return;

        container.innerHTML = localCurrentData.attachmentPreview.map((file, idx) => {
            const name = file.fileName || file._localName || 'file';
            const size = file.filesize || file._localSize || 0;
            const ext = name.includes('.') ? name.split('.').pop() : '';
            const extColor = getExtColor(ext);
            const sizeStr = formatFileSize(size);
            const isUploading = !!file._uploading;

            return `<div class="file-preview-chip${isUploading ? ' uploading' : ''}" data-idx="${idx}">
                <span class="file-type-badge" style="background:${extColor}">${ext ? ext.toUpperCase() : 'FILE'}</span>
                <span class="file-info">
                    <span class="file-title">${name}</span>${sizeStr ? `<span class="file-size"> (${sizeStr})</span>` : ''}
                </span>
                ${isUploading
                    ? '<span class="file-loader"></span>'
                    : `<span class="file-remove" data-idx="${idx}">&times;</span>`}
            </div>`;
        }).join('');

        container.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const i = parseInt(e.target.getAttribute('data-idx'), 10);
                localCurrentData.attachmentPreview.splice(i, 1);
                renderAttachmentPreviews();
                validateSendButton();
            });
        });
    };

    const handleFileSelect = (event) => {
        const files = event.target.files;
        if (!files || !files.length) return;

        const state = store.getState().global;
        const userId = window.sdkConfig?.userId || state?.profile?.data?.id;
        const accessToken = window.sdkConfig?.accessToken;

        Array.from(files).forEach(file => {
            const mediaName = getUID(6);
            const placeholder = { _uploading: true, _localName: file.name, _localSize: file.size, _id: mediaName };
            localCurrentData.attachmentPreview.push(placeholder);
            renderAttachmentPreviews();

            const config = {
                file,
                userInfoId: userId,
                fileContext: 'sendEmail',
                userAccessToken: accessToken,
                mediaName,
            };

            const uploader = new FileUploader(config);
            uploader.start(
                null,
                (result) => {
                    const idx = localCurrentData.attachmentPreview.indexOf(placeholder);
                    if (idx !== -1) {
                        localCurrentData.attachmentPreview[idx] = result;
                    } else {
                        localCurrentData.attachmentPreview.push(result);
                    }
                    renderAttachmentPreviews();
                    validateSendButton();
                },
                (err) => {
                    console.error('Email attachment upload failed:', err);
                    const idx = localCurrentData.attachmentPreview.indexOf(placeholder);
                    if (idx !== -1) localCurrentData.attachmentPreview.splice(idx, 1);
                    renderAttachmentPreviews();
                }
            );
        });

        event.target.value = '';
    };

    const attachInput = document.getElementById(`email-attachments-${data?.reqId}`);
    if (attachInput && !attachInput.eventListenerAdded) {
        attachInput.addEventListener('change', handleFileSelect);
        attachInput.eventListenerAdded = true;
    }

    if (localCurrentData.attachmentPreview.length) renderAttachmentPreviews();

    let emailBody = document.getElementById(`email-body-${data?.reqId}`);
    if(emailBody) {
        emailBody.contentEditable = true;
    }

    // --- Formatting toolbar ---
    const formatToolbar = document.getElementById(`email-format-toolbar-${data?.reqId}`);
    const optionsBtn = document.getElementById(`email-options-btn-${data?.reqId}`);
    const emailBodyEl = document.getElementById(`email-body-${data?.reqId}`);

    const isSelectionInside = (containerEl) => {
        if (!containerEl) return false;
        const sel = document.getSelection?.();
        if (!sel || !sel.rangeCount) return false;
        const node = sel.anchorNode;
        if (!node) return false;
        const el = node.nodeType === 3 ? node.parentElement : node; // 3 = TEXT_NODE
        return !!(el && containerEl.contains(el));
    };

    const syncFormatToolbarState = () => {
        if (!formatToolbar) return;
        const inside = isSelectionInside(emailBodyEl);
        formatToolbar.querySelectorAll('.fmt-btn[data-cmd]').forEach(btn => {
            const cmd = btn.dataset.cmd;
            let active = false;
            if (inside && cmd) {
                try {
                    active = !!document.queryCommandState(cmd);
                } catch (e) {
                    active = false;
                }
            }
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    };

    if (optionsBtn && !optionsBtn.eventListenerAdded) {
        optionsBtn.addEventListener('click', () => {
            if (!formatToolbar) return;
            const isVisible = formatToolbar.style.display !== 'none';
            formatToolbar.style.display = isVisible ? 'none' : '';
            optionsBtn.classList.toggle('active', !isVisible);
            if (!isVisible) {
                // Make sure active formatting is reflected when opening the toolbar
                setTimeout(syncFormatToolbarState, 0);
            }
        });
        optionsBtn.eventListenerAdded = true;
    }

    if (formatToolbar && !formatToolbar.eventListenerAdded) {
        formatToolbar.querySelectorAll('.fmt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const bodyEl = document.getElementById(`email-body-${data?.reqId}`);
                if (bodyEl) bodyEl.focus();
                document.execCommand(btn.dataset.cmd, false, null);
                setTimeout(syncFormatToolbarState, 0);
            });
        });

        formatToolbar.querySelectorAll('.fmt-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const bodyEl = document.getElementById(`email-body-${data?.reqId}`);
                if (bodyEl) bodyEl.focus();
                document.execCommand(sel.dataset.cmd, false, sel.value);
                sel.selectedIndex = 0;
            });
        });

        formatToolbar.querySelectorAll('.fmt-color-input').forEach(input => {
            input.addEventListener('input', () => {
                const bodyEl = document.getElementById(`email-body-${data?.reqId}`);
                if (bodyEl) bodyEl.focus();
                document.execCommand(input.dataset.cmd, false, input.value);
                setTimeout(syncFormatToolbarState, 0);
            });
        });

        formatToolbar.eventListenerAdded = true;
    }

    // Keep toolbar buttons in sync with caret/selection formatting state
    if (emailBodyEl && !emailBodyEl._formatStateListenerAdded) {
        const handler = () => syncFormatToolbarState();

        emailBodyEl.addEventListener('keyup', handler);
        emailBodyEl.addEventListener('mouseup', handler);
        emailBodyEl.addEventListener('input', handler);
        emailBodyEl.addEventListener('focus', handler);
        emailBodyEl.addEventListener('blur', handler);

        const docKey = `__emailFmtSelectionChange_${data?.reqId}`;
        if (!document[docKey]) {
            document[docKey] = handler;
            document.addEventListener('selectionchange', handler);
        }

        // Initial sync (useful when body is pre-filled with formatted HTML)
        setTimeout(syncFormatToolbarState, 0);

        emailBodyEl._formatStateListenerAdded = true;
    }

    //connection changes event listener
    let connectionSelect = document.getElementById(`email-connection-${data?.reqId}`);
    if(connectionSelect && !connectionSelect?.eventListenerAdded) {
        connectionSelect.addEventListener('sl-change', (event) => {
            const selectedConnectionId = event.target.value;            
            
            // selected connection from connections list
            const connections = localCurrentData?.templateInfo?.connections || [];
            const selectedConnection = connections.find(conn => conn?.id === selectedConnectionId);
            
            if (selectedConnection) {
                const provider = selectedConnection?.provider;                                
                // update the icon based on provider
                const iconContainer = document.querySelector('.connection-provider-icon');
                if (iconContainer) {
                    iconContainer.innerHTML = getProviderIcon(provider);
                }
            }
                        
            if (!localCurrentData.templateInfo) {
                localCurrentData.templateInfo = {};
            }
            localCurrentData.templateInfo.defaultConnections = selectedConnectionId;
                        
            validateSendButton();
        });
        connectionSelect.eventListenerAdded = true;
    }

    // --- Collapsed recipients preview ---
    let isRecipientsCollapsed = false;
    const collapsedEl = document.getElementById(`email-recipients-collapsed-${data?.reqId}`);
    const toRowEl = document.getElementById(`email-to-${data?.reqId}`)?.closest('.email-field');

    function getRecipientDisplayName(r) {
        return r?.name || r?.label || r?.email || r?.id || '';
    }

    function getAllRecipientNames() {
        const toNames = (localCurrentData?.content?.to || []).map(getRecipientDisplayName);
        const ccNames = (localCurrentData?.content?.cc || []).map(getRecipientDisplayName);
        const bccNames = (localCurrentData?.content?.bcc || []).map(getRecipientDisplayName);
        return [...toNames, ...ccNames, ...bccNames].filter(Boolean);
    }

    function renderCollapsedRecipients() {
        if (!collapsedEl) return;
        const names = getAllRecipientNames();
        if (!names.length) {
            collapsedEl.innerHTML = '<span class="collapsed-placeholder">Recipients</span>';
            return;
        }

        collapsedEl.innerHTML = names
            .map(n => `<span class="collapsed-recipient">${n}</span>`)
            .join('<span class="collapsed-sep">, </span>');

        const availableWidth = collapsedEl.clientWidth;
        if (collapsedEl.scrollWidth <= availableWidth) return;

        const maxRight = collapsedEl.getBoundingClientRect().left + availableWidth - 50;
        const spans = collapsedEl.querySelectorAll('.collapsed-recipient');
        let visibleCount = 0;

        for (let i = 0; i < spans.length; i++) {
            if (spans[i].getBoundingClientRect().right > maxRight && i > 0) break;
            visibleCount++;
        }

        if (visibleCount === 0) visibleCount = 1;
        const remaining = names.length - visibleCount;

        if (remaining > 0) {
            collapsedEl.innerHTML = names.slice(0, visibleCount)
                .map(n => `<span class="collapsed-recipient">${n}</span>`)
                .join('<span class="collapsed-sep">, </span>') +
                `<span class="collapsed-more"> +${remaining} more</span>`;
        }
    }

    function collapseRecipients() {
        isRecipientsCollapsed = true;

        if (toRowEl) toRowEl.style.display = 'none';
        if (ccRow) ccRow.style.display = 'none';
        if (bccRow) bccRow.style.display = 'none';

        if (collapsedEl) {
            collapsedEl.style.display = '';
            renderCollapsedRecipients();
        }
    }

    function expandRecipients() {
        isRecipientsCollapsed = false;

        if (collapsedEl) collapsedEl.style.display = 'none';
        if (toRowEl) toRowEl.style.display = '';

        const hasCc = (localCurrentData?.content?.cc || []).length > 0;
        const hasBcc = (localCurrentData?.content?.bcc || []).length > 0;

        if (ccRow) ccRow.style.display = hasCc ? '' : 'none';
        if (bccRow) bccRow.style.display = hasBcc ? '' : 'none';
        if (ccToggleBtn) ccToggleBtn.style.display = hasCc ? 'none' : '';
        if (bccToggleBtn) bccToggleBtn.style.display = hasBcc ? 'none' : '';

        const toInput = toRowEl?.querySelector('.ts-control input');
        if (toInput) setTimeout(() => toInput.focus(), 0);
    }

    if (collapsedEl && !collapsedEl.eventListenerAdded) {
        collapsedEl.addEventListener('click', () => {
            if (isRecipientsCollapsed) expandRecipients();
        });
        collapsedEl.eventListenerAdded = true;
    }

    function handleOutsideMousedown(e) {
        if (!collapsedEl || !document.contains(collapsedEl)) {
            document.removeEventListener('mousedown', handleOutsideMousedown);
            return;
        }
        if (isRecipientsCollapsed) return;
        if (toRowEl?.contains(e.target)) return;
        if (ccRow?.contains(e.target)) return;
        if (bccRow?.contains(e.target)) return;
        if (collapsedEl?.contains(e.target)) return;
        if (e.target.closest('.ts-dropdown')) return;

        collapseRecipients();
    }

    if (collapsedEl && !collapsedEl._outsideHandlerAdded) {
        document.addEventListener('mousedown', handleOutsideMousedown);
        collapsedEl._outsideHandlerAdded = true;
    }

}


export default sendEmailFunctionality;
