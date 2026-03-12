import { searchIcon, attachmentIcon, ActionsFlashIcon, arrowCirlceUpIcon, Teamsimg, Slackimg, MinimizeIcon, RadioButtonChecked, createCloseIcon, PlusIcon } from "../icons-library";
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
                    <div class="teams-recipients-label">Channel or People</div>
                    <div class="teams-search-field">
                        <div class="teams-search-input-wrapper" id="teams-search-input-wrapper-${data?.reqId}">
                            <div class="teams-selected-recipients" id="teams-selected-recipients-${data?.reqId}"></div>
                            <input
                                type="text"
                                class="teams-search-input"
                                placeholder="Search user or user groups"
                                id="teams-search-${data?.reqId}"
                            />
                        </div>
                    </div>
                </div>
                <div class="teams-message-section">
                    <div class="teams-message-label">Message</div>
                    <div class="teams-message-body">
                        <div
                            class="teams-message-editor"
                            id="teams-message-body-${data?.reqId}"
                            contenteditable="true"
                            placeholder="Type your message here..."
                        >${data?.content?.message || ''}</div>
                    </div>
                </div>

                <div class="slackfooter-wrapper">
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
                            <sl-button class="primary-button-black teams-send-btn" id="teams-send-${data?.reqId}" variant="primary" disabled>                            
                                Send
                            </sl-button>
                        </div>
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
    }, 0);

    return html;
}

const decodeHtmlEntities = (text) => {
    if (typeof document === 'undefined') return text;
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
};

const renderTeamsSuccessSmallCard = (channels, text, tenantName, attachments) => {
    const decoded = decodeHtmlEntities(text || '');
    const truncated = decoded.length > 108 ? decoded.slice(0, 98) + "<span class='seemorehtml'>...see more</span>" : decoded;
    const chip0 = channels?.[0];
    const chip1 = channels?.[1];

    const profilePicHtml = (chip) => {
        if (!chip) return '';
        if (chip.meta?.type === 'channel') return `<div class="profilepic groupIcon">${(chip.label || '').charAt(0).toUpperCase()}</div>`;
        if (chip.meta?.type === 'people') {
            return chip.meta?.icon
                ? `<div class="profilepic"><img src="${chip.meta.icon}" /></div>`
                : `<div class="profilepic groupIcon">${(chip.label || '').charAt(0).toUpperCase()}</div>`;
        }
        return `<div class="profilepic groupIcon">${(chip.label || '').charAt(0).toUpperCase()}</div>`;
    };

    return `
        <div class="emailSmallCard msTeamsSmallCard teams-success-card" data-expanded="false">
            <div class="headingtitle slacktitle" style="background:#474876;">
                <div class="gmailwrap">${Teamsimg({ size: 20 })}</div>
                <div class="titlechip slacktitlechip">${tenantName || 'Teams'}</div>
            </div>
            <div class="bodychordwrap">
                <div class="bodyanswer">
                    ${chip0 ? `
                        <div class="chordname slackchord" style="border-color:#bfdbfe;background:#eff6ff;">
                            <div class="personname">
                                ${profilePicHtml(chip0)}
                                <span>${chip0.label || ''}</span>
                            </div>
                        </div>
                    ` : ''}
                    ${chip1 ? `
                        <div class="chordname slackchord" style="border-color:#bfdbfe;background:#eff6ff;">
                            <div class="personname">
                                ${profilePicHtml(chip1)}
                                <span>${chip1.label || ''}</span>
                            </div>
                        </div>
                    ` : ''}
                    ${(channels?.length || 0) > 2 ? `
                        <div class="chordname slackmore">
                            <div class="personname">${channels.length - 2} more</div>
                        </div>
                    ` : ''}
                </div>
                <div class="footeranswer">
                    <span class="truncateText">${truncated}</span>
                </div>
                ${attachments?.length > 0 ? `
                    <div class="attachementInfo">
                        <div class="attachIcon">${attachmentIcon({ size: 14, color: '#667085' })}</div>
                        <div class="attachText">${attachments.length} ${attachments.length > 1 ? 'Attachments' : 'Attachment'}</div>
                    </div>
                ` : ''}
                <div class="accountIntegratedSuccess successmsg">
                    <div class="iconchip">${RadioButtonChecked({ size: 14 })}</div>
                    <div class="integratetext">Sent successfully</div>
                </div>
            </div>
        </div>
    `;
};

const renderTeamsSuccessExpandedCard = (channels, text, tenantName, attachments) => {
    const decoded = decodeHtmlEntities(text || '');
    const paragraphs = decoded.split('\n').filter(p => p.trim() !== '');

    const chipHtml = (channel) => {
        let picHtml = '';
        if (channel.meta?.type === 'channel') picHtml = `<div class="profilepic groupIcon">${(channel.label || '').charAt(0).toUpperCase()}</div>`;
        else if (channel.meta?.type === 'people') {
            picHtml = channel.meta?.icon
                ? `<div class="profilepic"><img src="${channel.meta.icon}" /></div>`
                : `<div class="profilepic groupIcon">${(channel.label || '').charAt(0).toUpperCase()}</div>`;
        } else {
            picHtml = `<div class="profilepic groupIcon">${(channel.label || '').charAt(0).toUpperCase()}</div>`;
        }
        return `<div class="chiphandle" style="border-color:#bfdbfe;background:#eff6ff;">${picHtml}<span>${channel.label || ''}</span></div>`;
    };

    return `
        <div class="emailExpandedcard slackExpanedcard msTeamsExpandedCard teams-success-card" data-expanded="true">
            <div class="emailExpandHeader" style="background:#474876;">
                <div class="expandChip" style="background:#474876;">
                    <div class="exIcon">${Teamsimg({ size: 20 })}</div>
                    <div class="exId" style="color:#fff;">${tenantName || 'Teams'}</div>
                </div>
                <div class="collapseChip teams-collapse-btn">${MinimizeIcon({ size: 14, color: '#fff' })}</div>
            </div>
            <div class="emailUserList slackuserlist">
                <div class="listItems slacklistitems">
                    ${(channels || []).map(chipHtml).join('')}
                </div>
            </div>
            <div class="emailBody slackbody">
                ${paragraphs.map(p => `<div>${p}</div>`).join('')}
            </div>
            ${attachments?.length > 0 ? `
                <div class="kiaas-attachment-list">
                    ${attachments.map((file) => {
                        const name = file.originalFilename || file.name || file.fileName || '';
                        return `<div class="kiaas-attachments"><div class="attachment-list-item noOverlay"><span>${attachmentIcon({ size: 14, color: '#667085' })}</span><span class="attach-name">${name}</span></div></div>`;
                    }).join('')}
                </div>
            ` : ''}
        </div>
    `;
};

const attachTeamsExpandCollapseListeners = (wrapper, channels, text, tenantName, attachments) => {
    const smallCard = wrapper.querySelector('.emailSmallCard.teams-success-card');
    if (smallCard) {
        smallCard.addEventListener('click', () => {
            wrapper.innerHTML = renderTeamsSuccessExpandedCard(channels, text, tenantName, attachments);
            const collapseBtn = wrapper.querySelector('.teams-collapse-btn');
            if (collapseBtn) {
                collapseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    wrapper.innerHTML = renderTeamsSuccessSmallCard(channels, text, tenantName, attachments);
                    attachTeamsExpandCollapseListeners(wrapper, channels, text, tenantName, attachments);
                });
            }
        });
    }
};

const renderTeamsMessageSummary = (data) => {
    const channels = data?.content?.conversations || data?.content?.channels || [];
    const tenantName = data?.content?.tenantName || data?.content?.workSpace;
    const text = data?.content?.message?.msg || data?.content?.message?.text || '';
    const attachments = data?.content?.message?.attachments || [];
    const wrapperId = `teams-success-${data?.reqId || Date.now()}`;

    setTimeout(() => {
        const wrapper = document.getElementById(wrapperId);
        if (wrapper && !wrapper._successInit) {
            wrapper._successInit = true;
            attachTeamsExpandCollapseListeners(wrapper, channels, text, tenantName, attachments);
        }
    }, 0);

    return `<div class="teams-success-wrapper" id="${wrapperId}">${renderTeamsSuccessSmallCard(channels, text, tenantName, attachments)}</div>`;
};

const initializeTeamsMessageFunctionality = (data) => {
    const reqId = data?.reqId;

    // Guard: prevent duplicate initialization when template re-renders.
    const templateEl = document.getElementById(`teams-message-body-${reqId}`)?.closest('.teams-message-template');
    if (!templateEl || templateEl._functionalityInitialized) return;
    templateEl._functionalityInitialized = true;

    const userId = window.sdkConfig.userId;
    const connectionId = data?.connId;
    const source = data?.provider;
    const messageBody = document.getElementById(`teams-message-body-${reqId}`);
    const messageBodyWrapper = messageBody?.parentElement;
    const sendButton = document.getElementById(`teams-send-${reqId}`);
    const smartComposeBtn = document.getElementById(`teams-smart-compose-${reqId}`);
    const attachmentInput = document.getElementById(`teams-attachments-${reqId}`);
    const attachmentsPreview = document.getElementById(`teams-attachments-preview-${reqId}`);

    let attachedFiles = [];
    
    // Initialize Recipient Search
    const recipientSearchManager = initializeRecipientSearch({
        reqId,
        connectionId,
        userId,
        source,
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

        const userId = window.sdkConfig.userId;
        const userAccessToken = window.sdkConfig.accessToken;
        const cancelSource = axios.CancelToken.source();
        const mediaName = getUID(6);

        const uploadConfig = {
            file: file,
            userInfoId: userId,
            // fileContext: 'knowledge',
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
        console.log('updateAttachmentsPreview', attachedFiles);
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
        const footerEl = messageBody?.closest('.teams-message-container')?.querySelector('.slackfooter-wrapper');
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
            const connectionSelect = document.getElementById(`teams-connection-${reqId}`);
            const selectedConnectionId = connectionSelect?.value || connectionId;

            const attachmentComponents = uploadedAttachments.map(f => ({
                fileId: f.fileId || f.docId,
                fileName: f.name || f.title,
                fileType: f.type,
                fileSize: f.size,
            }));

            const conversationPayload = selectedRecipients.map(r => ({
                id: r.id,
                name: r.label || r.name,
                type: r.meta?.type || 'user'
            }));

            const payload = {
                question: data?.question,
                nodeType: "actions",
                appId: "msteams",
                eventId: "send_message",
                connectionId: selectedConnectionId,
                boardId: data?.boardId,
                params: {
                    conversations: conversationPayload,
                    message: message,
                    attachments: attachmentComponents,
                    components: uploadedAttachments.map(f => ({
                        componentId: f.componentId,
                        fileId: f.fileId || f.docId,
                    }))
                },
                contextParams: {
                    messageId: data?.messageId,
                    dataId: data?.parentMessageId || data?.menuId
                }
            };

            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';

            store.dispatch(sendIntegrationMessage({
                userId,
                source: source || 'msteams',
                payload
            })).then(response => {
                if (response?.payload && !response?.error) {
                    const channels = selectedRecipients.map(r => ({
                        id: r.id,
                        label: r.label || r.name,
                        meta: r.meta || {}
                    }));
                    const text = messageBody?.innerText || messageBody?.textContent || '';
                    const tenantName = data?.content?.tenantName || data?.content?.workSpace || connectionSelect?.options?.[connectionSelect?.selectedIndex]?.text || 'Teams';
                    const attachments = uploadedAttachments.map(f => ({
                        originalFilename: f.name || f.title,
                        name: f.name || f.title,
                        fileName: f.name || f.title,
                        fileType: f.type,
                    }));

                    const templateRoot = templateEl;
                    if (templateRoot) {
                        const successWrapper = document.createElement('div');
                        successWrapper.className = 'teams-success-wrapper';
                        successWrapper.innerHTML = renderTeamsSuccessSmallCard(channels, text, tenantName, attachments);
                        templateRoot.replaceWith(successWrapper);
                        attachTeamsExpandCollapseListeners(successWrapper, channels, text, tenantName, attachments);
                    }
                } else {
                    sendButton.disabled = false;
                    sendButton.textContent = 'Send';
                }
            }).catch(() => {
                sendButton.disabled = false;
                sendButton.textContent = 'Send';
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

