import { attachmentIcon, ActionsFlashIcon, Slackimg, createCloseIcon, PlusIcon } from "../icons-library";
import "./../styles/template.scss";
import FileUploader from "../../utils/FileUploader";
import { getFileExtension, getUID, generateComponentId, resolveSdkAssetPath } from "../../utils/helpers";
import store from "../../redux/store";
import axios from "axios";
import { initializeRecipientSearch } from "../../utils/searchChannelRecepients";
import { sendIntegrationMessage, smartComposeEmail } from "../../redux/actions/global.action";

const UndoIconSvg = (size = 12, color = '#667085') => `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4.5H8.25C9.49264 4.5 10.5 5.50736 10.5 6.75C10.5 7.99264 9.49264 9 8.25 9H6" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 2L2 4.5L4.5 7" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const RefreshIconSvg = (size = 12, color = '#667085') => `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 2V5H4.5" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.195 7.5A4.5 4.5 0 1 0 1.5 5" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function render(data) {

    if (data?.status === 'completed') {
        return renderSlackMessageSummary(data);
    }

    let slackList = data?.templateInfo?.connections;
    let defaultConnectionId = data?.templateInfo?.defaultConnections;
    
    let html = `
        <div class="slack-message-template">
            <div class='slack-message-container'>
                <div class="slack-header-block">
                    <div class='connection-provider-icon slack-provider-icon'>                            
                        ${Slackimg({ size: 16, color: "#131316" })}
                    </div>
                    <sl-select id="slack-connection-${data?.reqId}" value="${defaultConnectionId || ''}">
                        ${slackList?.map((item, index) =>
        `
                        <sl-option value="${item?.id}" id="slack-connection-${index}">${item?.label || item?.name}</sl-option>
                        `
    ).join('')}
                    </sl-select>
                </div>
                
                <div class="slack-recipients-section">
                    <div class="slack-recipients-label">Channel or People</div>
                    <div class="slack-search-field">
                        <div class="slack-search-input-wrapper" id="slack-search-input-wrapper-${data?.reqId}">
                            <div class="slack-selected-recipients" id="slack-selected-recipients-${data?.reqId}"></div>
                            <input
                                type="text"
                                class="slack-search-input"
                                placeholder="Search user or user groups"
                                id="slack-search-${data?.reqId}"
                            />
                        </div>
                    </div>
                </div>
                <div class="slack-message-section">
                    <div class="slack-message-label">Message</div>
                    <div class="slack-message-body">
                        <div
                            class="slack-message-editor"
                            id="slack-message-body-${data?.reqId}"
                            contenteditable="true"
                            placeholder="Type your message here..."
                        >${data?.content?.message || ''}</div>
                    </div>
                </div>

                <div class="slackfooter-wrapper">
                    <div class="slack-message-footer">
                        <div class="slack-footer-left">
                            <label for="slack-attachments-${data?.reqId}" class="slack-attachment-btn">
                                <input
                                    type="file"
                                    id="slack-attachments-${data?.reqId}"
                                    multiple
                                    style="display: none;"
                                />
                                <span class="attachment-icon">
                                    ${attachmentIcon({ size: 16, color: "#667085" })}
                                </span>
                                <span class="attachment-text">Attachments</span>
                            </label>
                            
                            <button class="slack-smart-compose-btn" id="slack-smart-compose-${data?.reqId}">
                                <span class="smart-compose-icon">
                                    ${ActionsFlashIcon({ size: 16, color: "#667085" })}
                                </span>
                                <span class="smart-compose-text">Smart Compose</span>
                            </button>
                        </div>
                        
                        <div class="slack-footer-right">
                            <sl-button class="primary-button-black slack-send-btn" id="slack-send-${data?.reqId}" variant="primary" disabled>                            
                                Send
                            </sl-button>
                        </div>
                    </div>
                </div>

                <div class="slack-attachments-preview" id="slack-attachments-preview-${data?.reqId}">
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        initializeSlackMessageFunctionality(data);
    }, 0);

    return html;
}

const renderSlackMessageSummary = (data) => {
    let recipients = data?.content?.recipients || [];    
    const tenantName = data?.content?.tenantName;
    
    let html = `
        <div class="slack-message-small-card">
            <div class="slack-summary-header">
                <div class="slack-icon">
                    ${Slackimg({ size: 20 })}
                </div>
                <h3>${tenantName || 'Slack'}</h3>
            </div>
            <div class="slack-summary-body">
                <div class="slack-summary-recipients">
                    <strong>To:</strong>
                    ${recipients?.map(recipient => `<span class="recipient-tag">${recipient?.name || recipient?.label || recipient?.email}</span>`).join('')}
                </div>
                <div class="slack-summary-message">
                    ${data?.content?.message?.msg || data?.content?.text || ''}
                </div>
                ${data?.content?.attachments?.length > 0 ? `
                    <div class="slack-summary-attachments">
                        <strong>Attachments:</strong> ${data?.content?.attachments?.length} file(s)
                    </div>
                ` : ''}
            </div>
        </div>
    `

    return html;
}

const initializeSlackMessageFunctionality = (data) => {
    const reqId = data?.reqId;

    // Guard: prevent duplicate initialization when template re-renders.
    // Without this, multiple sets of event listeners are added, causing multiple API calls.
    const templateEl = document.getElementById(`slack-message-body-${reqId}`)?.closest('.slack-message-template');
    if (!templateEl || templateEl._functionalityInitialized) return;
    templateEl._functionalityInitialized = true;

    const userId = window.sdkConfig.userId;
    const connectionId = data?.connId;
    const source = data?.provider || 'slack';
    const messageBody = document.getElementById(`slack-message-body-${reqId}`);
    const messageBodyWrapper = messageBody?.parentElement;
    const sendButton = document.getElementById(`slack-send-${reqId}`);
    const smartComposeBtn = document.getElementById(`slack-smart-compose-${reqId}`);
    const attachmentInput = document.getElementById(`slack-attachments-${reqId}`);
    const attachmentsPreview = document.getElementById(`slack-attachments-preview-${reqId}`);
    const connectionSelect = document.getElementById(`slack-connection-${reqId}`);

    let attachedFiles = [];
    
    const recipientSearchManager = initializeRecipientSearch({
        reqId,
        connectionId,
        userId,
        source,
        provider: 'slack',
        prefix: 'slack',
        onRecipientsChange: (recipients) => {
            validateForm();
        }
    });

    if (messageBody) {
        if (messageBodyWrapper) {
            messageBodyWrapper.addEventListener('click', () => {
                messageBody.focus();
            });
        }

        messageBody.setAttribute('contenteditable', 'true');
        messageBody.style.pointerEvents = 'auto';
        messageBody.style.userSelect = 'text';
    }

    const uploadFileInitial = (file, fileUID, onComplete) => {
        const state = store.getState().global;
        const localSize = file.size / Math.pow(1024, 2);
        const allowedFileSize = Math.round(state.maxAllowedFileSize / Math.pow(1024, 2));
        
        if (localSize > allowedFileSize) {
            onComplete({
                success: false,
                error: 'size',
                message: `File Size has to be less than ${allowedFileSize} MB`,
                name: file.name,
                uID: fileUID
            });
            return;
        }

        const userAccessToken = window.sdkConfig.accessToken;
        const cancelSource = axios.CancelToken.source();
        const mediaName = getUID(6);

        const uploadConfig = {
            file: file,
            userInfoId: userId,
            fileContext: 'runtime',
            userAccessToken: userAccessToken,
            mediaName: mediaName,
            source: cancelSource,
            uID: fileUID
        };

        const uploader = new FileUploader(uploadConfig);

        uploader.start(
            (progress) => {
                const fileIndex = attachedFiles.findIndex(f => f.uID === fileUID);
                if (fileIndex >= 0) {
                    attachedFiles[fileIndex].progress = progress;
                    updateAttachmentsPreview();
                }
            },
            (uploadedFile) => {
                const componentId = generateComponentId();
                const fileData = {
                    ...uploadedFile,
                    uID: fileUID,
                    loading: false,
                    uploaded: true,
                    componentId,
                    extName: getFileExtension(uploadedFile.fileName),
                    source: 'attachment',
                    title: uploadedFile.fileName,
                    docId: uploadedFile.fileUrl?.fileId,
                    fileId: uploadedFile.fileUrl?.fileId,
                    name: uploadedFile.fileName,
                    size: uploadedFile.filesize,
                    type: uploadedFile.type,
                    cancelSource: cancelSource
                };
                
                onComplete({
                    success: true,
                    data: fileData
                });
            },
            (errorMsg, errorData) => {
                onComplete({
                    success: false,
                    error: 'type',
                    message: `The file type is not compatible`,
                    name: file.name,
                    uID: fileUID
                });
            }
        );
    };

    if (attachmentInput) {
        attachmentInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            
            if (files && files.length > 0) {
                files.forEach(file => {
                    const fileUID = getUID(6);
                    attachedFiles.push({
                        name: file.name,
                        size: file.size,
                        loading: true,
                        uploaded: false,
                        uID: fileUID,
                        progress: 0
                    });
                    
                    uploadFileInitial(file, fileUID, (result) => {
                        const fileIndex = attachedFiles.findIndex(f => f.uID === result?.data?.uID);
                        
                        if (fileIndex >= 0) {
                            if (result.success) {
                                attachedFiles[fileIndex] = result.data;
                            } else {
                                attachedFiles[fileIndex].loading = false;
                                attachedFiles[fileIndex].error = result.message;
                            }
                        }
                        
                        updateAttachmentsPreview();
                    });
                });
                
                updateAttachmentsPreview();
            }
            
            e.target.value = '';
        });
    }

    const updateAttachmentsPreview = () => {
        if (attachmentsPreview && attachedFiles.length > 0) {
            attachmentsPreview.innerHTML = `
                <div class="attachments-list">
                    ${attachedFiles.map((file, index) => `
                        <div class="attachment-item ${file.error ? 'error' : ''}">
                            <div class="attachment-name" title="${file.name}">
                                ${file?.extName ? `<img src="${resolveSdkAssetPath(`images/${file?.extName}.png`)}" alt="${file?.name}" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;" />` : ''}
                                <span class="attachment-filename">${file.name}</span>
                                <span class="attachment-filesize">
                                    (${file.size > 1024 * 1024
                                            ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                                            : `${(file.size / 1024).toFixed(2)} KB`
                                    })
                                </span>
                                ${file.loading ? `<span class="attachment-loading">Uploading..</span>` : '<button class="attachment-remove" data-index="${index}" title="Remove">×</button>'}                                
                                ${file.error ? `<span class="attachment-error">${file.error}</span>` : ''}
                            </div>                           
                        </div>
                    `).join('')}
                </div>
            `;
            
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

    let isSmartCompose = false;
    let smartReplyGenerated = false;
    let showSmartReplyPrompt = true;
    let previousBodyText = '';
    let smartComposeTextNode = null;
    let newlyAddedGeneratedText = '';
    let selectionRange = null;
    let isProcessingReply = false;
    let smartComposeEl = null;

    const cloneSelection = () => {
        try {
            const sel = document.getSelection();
            if (sel && sel.rangeCount > 0) {
                selectionRange = sel.getRangeAt(0).cloneRange();
            }
        } catch (e) { /* ignore */ }
    };

    if (messageBody) {
        messageBody.addEventListener('keyup', cloneSelection);
        messageBody.addEventListener('click', cloneSelection);
    }

    const getSmartComposeSuggestions = () => {
        const hasText = messageBody?.innerText?.trim()?.length > 0;
        return hasText ? ['Rephrase', 'Make it shorter'] : ['Apply leave', 'Approve request'];
    };

    const insertTextAtCaret = (content, replace) => {
        if (!content || !messageBody) return;
        if (replace) {
            messageBody.innerText = '';
        }
        smartComposeTextNode = document.createTextNode(content);
        newlyAddedGeneratedText = content;
        if (selectionRange && messageBody.contains(selectionRange.startContainer)) {
            selectionRange.insertNode(smartComposeTextNode);
        } else {
            messageBody.appendChild(smartComposeTextNode);
        }
        validateForm();
    };

    const composeSmartReply = (reply, type, replace = false) => {
        if (!reply?.trim()) return;

        previousBodyText = messageBody?.innerText || '';
        isProcessingReply = true;
        renderSmartComposePanel();

        let payload;
        if (type === 'generate') {
            payload = { userInput: reply, type };
        } else {
            payload = { text: reply, type };
        }

        store.dispatch(smartComposeEmail({
            params: { userId },
            payload
        })).then(response => {
            const generatedText = response?.payload?.textSuggestions?.[0]?.body;
            if (generatedText && messageBody) {
                insertTextAtCaret(generatedText, replace);
            }
            isProcessingReply = false;
            smartReplyGenerated = reply;
            showSmartReplyPrompt = false;
            renderSmartComposePanel();
        }).catch(() => {
            isProcessingReply = false;
            renderSmartComposePanel();
        });
    };

    const handleSmartReplyPromptClick = (promptText) => {
        if (promptText === 'Make it shorter') {
            composeSmartReply(messageBody?.innerText || '', 'shorter', true);
        } else if (promptText === 'Rephrase') {
            composeSmartReply(messageBody?.innerText || '', 'regenerate', true);
        } else {
            composeSmartReply(promptText, 'generate', true);
        }
        showSmartReplyPrompt = false;
        renderSmartComposePanel();
    };

    const handleSmartReplyUndo = () => {
        if (smartComposeTextNode && smartComposeTextNode.parentNode) {
            smartComposeTextNode.remove();
        }
        smartComposeTextNode = null;
        smartReplyGenerated = false;
        showSmartReplyPrompt = true;
        validateForm();
        renderSmartComposePanel();
    };

    const handleSmartReplyRegenerate = () => {
        if (smartComposeTextNode && smartComposeTextNode.parentNode) {
            smartComposeTextNode.remove();
        }
        smartComposeTextNode = null;
        composeSmartReply(newlyAddedGeneratedText, 'regenerate', false);
        showSmartReplyPrompt = false;
        renderSmartComposePanel();
    };

    const handleSmartReplyAddMore = () => {
        smartReplyGenerated = false;
        renderSmartComposePanel();
    };

    const closeSmartCompose = () => {
        isSmartCompose = false;
        smartReplyGenerated = false;
        showSmartReplyPrompt = true;
        isProcessingReply = false;
        renderSmartComposePanel();
    };

    const renderSmartComposePanel = () => {
        const footerEl = messageBody?.closest('.slack-message-container')?.querySelector('.slackfooter-wrapper');
        if (!footerEl) return;

        if (!isSmartCompose) {
            if (smartComposeEl) {
                smartComposeEl.remove();
                smartComposeEl = null;
            }
            smartComposeBtn?.classList.remove('active');
            return;
        }

        smartComposeBtn?.classList.add('active');

        if (!smartComposeEl) {
            smartComposeEl = document.createElement('div');
            smartComposeEl.className = 'emailSmartCompose';
            footerEl.insertBefore(smartComposeEl, footerEl.firstChild);
        }

        const suggestions = getSmartComposeSuggestions();

        let html = '';

        if (!isProcessingReply && showSmartReplyPrompt) {
            html += `<div class="suggestListGroup">
                ${suggestions.map((s, i) => `<button class="kr-secondary-btn sc-suggestion-btn" data-prompt="${s}">${s}</button>`).join('')}
            </div>`;
        }

        if (!isProcessingReply && smartReplyGenerated) {
            html += `
                <div class="suggestListGroup slackcomposeposition">
                    <button class="kr-secondary-btn btn-changes undoIcon sc-undo-btn">
                        <span class="btn-icon">${UndoIconSvg(12, '#667085')}</span>
                        <span>Undo</span>
                    </button>
                    <button class="kr-secondary-btn btn-changes sc-regenerate-btn">
                        <span class="btn-icon">${RefreshIconSvg(12, '#667085')}</span>
                        <span>Re-generate</span>
                    </button>
                    <button class="kr-secondary-btn btn-changes sc-addmore-btn">
                        <span class="btn-icon">${PlusIcon({ size: 12, color: '#667085' })}</span>
                        <span>Add more</span>
                    </button>
                </div>
                <div class="clsIcon composecloseicon sc-close-btn">${createCloseIcon({ size: 13, color: '#667085' })}</div>
            `;
        } else {
            html += `
                <div class="smIcon">${ActionsFlashIcon({ size: 16, color: '#667085' })}</div>
                <div class="clsIcon sc-close-btn">${createCloseIcon({ size: 13, color: '#667085' })}</div>
                <input type="text" class="sc-prompt-input" placeholder="${isProcessingReply ? 'Generating reply...' : 'Enter your prompt'}" ${isProcessingReply ? 'disabled' : ''} />
            `;
        }

        smartComposeEl.innerHTML = html;

        smartComposeEl.querySelectorAll('.sc-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => handleSmartReplyPromptClick(btn.dataset.prompt));
        });

        const undoBtn = smartComposeEl.querySelector('.sc-undo-btn');
        if (undoBtn) undoBtn.addEventListener('click', handleSmartReplyUndo);

        const regenBtn = smartComposeEl.querySelector('.sc-regenerate-btn');
        if (regenBtn) regenBtn.addEventListener('click', handleSmartReplyRegenerate);

        const addMoreBtn = smartComposeEl.querySelector('.sc-addmore-btn');
        if (addMoreBtn) addMoreBtn.addEventListener('click', handleSmartReplyAddMore);

        smartComposeEl.querySelectorAll('.sc-close-btn').forEach(btn => {
            btn.addEventListener('click', closeSmartCompose);
        });

        const promptInput = smartComposeEl.querySelector('.sc-prompt-input');
        if (promptInput) {
            promptInput.focus();
            promptInput.addEventListener('keydown', (e) => {
                if (e.currentTarget.value.length === 0) return;
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    composeSmartReply(e.currentTarget.value, 'generate', false);
                    e.currentTarget.value = '';
                } else if (e.key === 'Escape') {
                    closeSmartCompose();
                }
            });
        }
    };

    if (smartComposeBtn) {
        smartComposeBtn.addEventListener('click', () => {
            setTimeout(() => {
                isSmartCompose = !isSmartCompose;
                if (isSmartCompose) {
                    smartReplyGenerated = false;
                    showSmartReplyPrompt = true;
                }
                renderSmartComposePanel();
            }, 10);
        });
    }

    if (sendButton) {
        sendButton.addEventListener('click', () => {
            const message = messageBody?.innerHTML || '';
            const uploadedAttachments = attachedFiles.filter(file => file.uploaded && !file.error);
            const selectedRecipients = recipientSearchManager.getSelectedRecipients();
            const selectedConnectionId = connectionSelect?.value || connectionId;

            const attachmentComponents = uploadedAttachments.map(f => ({
                fileId: f.fileId || f.docId,
                fileName: f.name || f.title,
                fileType: f.type,
                fileSize: f.size,
            }));

            const channelPayload = selectedRecipients.map(r => ({
                id: r.id,
                name: r.label || r.name,
                type: r.meta?.type || 'channel'
            }));

            const payload = {
                question: data?.question,
                nodeType: "actions",
                appId: "slack",
                eventId: "send_message",
                connectionId: selectedConnectionId,
                boardId: data?.boardId,
                params: {
                    channels: channelPayload,
                    text: message,
                    attachments: attachmentComponents,
                    components: uploadedAttachments.map(f => ({
                        componentId: f.componentId,
                        fileId: f.fileId || f.docId,
                    }))
                }
            };

            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';

            store.dispatch(sendIntegrationMessage({
                userId,
                source: 'slack',
                payload
            })).then(response => {
                if (response?.payload && !response?.error) {
                    sendButton.textContent = 'Sent!';
                    sendButton.classList.add('sent-success');
                } else {
                    sendButton.disabled = false;
                    sendButton.textContent = 'Retry';
                }
            }).catch(() => {
                sendButton.disabled = false;
                sendButton.textContent = 'Retry';
            });
        });
    }

    const validateForm = () => {
        const selectedRecipients = recipientSearchManager.getSelectedRecipients();
        const hasRecipients = selectedRecipients.length > 0;
        const hasMessage = messageBody?.textContent?.trim().length > 0;
        
        if (sendButton) {
            sendButton.disabled = !(hasRecipients && hasMessage);
        }
    };

    if (messageBody) {
        messageBody.addEventListener('input', validateForm);
    }

    validateForm();
};

export default { render };
