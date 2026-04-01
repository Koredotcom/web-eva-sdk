import { searchIcon, attachmentIcon, ActionsFlashIcon, arrowCirlceUpIcon, Teamsimg, Slackimg, MinimizeIcon, RadioButtonChecked, createCloseIcon, PlusIcon, CheveronDownIcon, tickMarkIcon, getFileTypeIconHtml } from "../icons-library";
import "./../styles/template.scss";
import FileUploader from "../../utils/FileUploader";
import { getFileExtension, getUID, generateComponentId, resolveSdkAssetPath } from "../../utils/helpers";
import store from "../../redux/store";
import axios from "axios";
import { initializeRecipientSearch } from "../../utils/searchChannelRecepients";
import { sendIntegrationMessage, smartComposeEmail, getSpecificSkills } from "../../redux/actions/global.action";
import SSOMethods from "../utils/sso-methods";
import eventBus from "../utils/eventbus";

const UndoIconSvg = (size = 12, color = '#667085') => `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4.5H8.25C9.49264 4.5 10.5 5.50736 10.5 6.75C10.5 7.99264 9.49264 9 8.25 9H6" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 2L2 4.5L4.5 7" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const RefreshIconSvg = (size = 12, color = '#667085') => `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 2V5H4.5" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.195 7.5A4.5 4.5 0 1 0 1.5 5" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function render(data) {

    if (data?.status === 'completed') {
        return renderTeamsMessageSummary(data);
    }

    const colorCombo = ["#9F1AB1", "#6927DA", "#A15C07", "#027A48"];
    const backgroundCombo = ["#FBE8FF", "#ECE9FE", "#FEF7C3", "#D1FADF"];
    let teamsList = data?.templateInfo?.connections;
    let defaultConnectionId = data?.templateInfo?.defaultConnections;
    let selectedConn = teamsList?.find(conn => conn?.id === defaultConnectionId) || teamsList?.[0];

    let html = `
        <div class="teams-message-template">
            <div class='teams-message-container'>
                <div class="teams-header-block">
                    <div class="recipientslack-btn-cntr" id="teams-conn-cntr-${data?.reqId}">
                        <div class="contentslack" id="teams-conn-trigger-${data?.reqId}">
                            <div class="connection-provider-icon teams-provider-icon">
                                ${Teamsimg({ size: 16 })}
                            </div>
                            <div class="text-icon-group">
                                <div class="orgname" id="teams-conn-label-${data?.reqId}">${selectedConn?.label || selectedConn?.name || 'Select connection'}</div>
                                <div class="chevrondown">${CheveronDownIcon({ size: 10, color: '#D0D5DD' })}</div>
                            </div>
                        </div>
                        <div class="accountadd" id="teams-accountadd-${data?.reqId}" style="display:none;">
                            <div class="existingaccounts" id="teams-existing-accounts-${data?.reqId}">
                                ${teamsList?.map((conn, i) => `
                                    <div class="peopleinformation" data-conn-id="${conn?.id}" data-conn-label="${conn?.label || conn?.name || ''}" data-conn-email="${conn?.emailId || ''}">
                                        <div class="personicon teams-personicon" style="color:${colorCombo[i % 4]};background-color:${backgroundCombo[i % 4]}">${(conn?.label || conn?.name || '?').charAt(0)}</div>
                                        <div class="accountperson">
                                            <div class="personname">${conn?.label || conn?.name || ''}</div>
                                            <div class="personemail">${conn?.emailId || ''}</div>
                                        </div>
                                        <div class="tickicon${selectedConn?.id === conn?.id ? ' active' : ''}">${tickMarkIcon({ size: 15, color: '#475467' })}</div>
                                    </div>
                                `).join('') || ''}
                            </div>
                            <div class="moreaccounts">
                                <div class="accountaddition" id="teams-add-account-${data?.reqId}">
                                    <div class="plusicon">${PlusIcon({ size: 14, color: '#155EEF' })}</div>
                                    <div class="newaccount">Add account</div>
                                </div>
                            </div>
                        </div>
                    </div>
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

                <div class="kiaas-attachment-list" id="teams-attachments-preview-${data?.reqId}"></div>

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
                                <span class="attachment-text">Attach</span>
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
                        const ext = (file.extName || getFileExtension(name) || '').toLowerCase();
                        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'image'].includes(ext) || (file.fileType && file.fileType.startsWith('image'));
                        const previewSrc = file.thumbnailURL || file.publicUrl || '';
                        const iconHtml = isImage && previewSrc
                            ? `<img class="attachment-type" src="${previewSrc}" alt="${name}" />`
                            : `<span class="extIcons">${getFileTypeIconHtml(ext, 28)}</span>`;
                        const overlayClass = isImage ? '' : 'noOverlay';
                        return `<div class="kiaas-attachments" title="${name}"><div class="attachment-list-item ${overlayClass}">${iconHtml}</div></div>`;
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
    const source = data?.provider || 'msteams';
    const messageBody = document.getElementById(`teams-message-body-${reqId}`);
    const messageBodyWrapper = messageBody?.parentElement;
    const sendButton = document.getElementById(`teams-send-${reqId}`);
    const smartComposeBtn = document.getElementById(`teams-smart-compose-${reqId}`);
    const attachmentInput = document.getElementById(`teams-attachments-${reqId}`);
    const attachmentsPreview = document.getElementById(`teams-attachments-preview-${reqId}`);

    const acColorCombo = ["#9F1AB1", "#6927DA", "#A15C07", "#027A48"];
    const acBackgroundCombo = ["#FBE8FF", "#ECE9FE", "#FEF7C3", "#D1FADF"];

    let connections = [...(data?.templateInfo?.connections || [])];
    let selectedConnectionId = data?.templateInfo?.defaultConnections || connections[0]?.id;
    let selectedConnectionLabel = connections.find(c => c?.id === selectedConnectionId)?.label || connections.find(c => c?.id === selectedConnectionId)?.name || '';
    let attachedFiles = [];
    let isAccountDropdownOpen = false;

    const connTrigger = document.getElementById(`teams-conn-trigger-${reqId}`);
    const connLabel = document.getElementById(`teams-conn-label-${reqId}`);
    const accountAddDropdown = document.getElementById(`teams-accountadd-${reqId}`);
    const existingAccountsContainer = document.getElementById(`teams-existing-accounts-${reqId}`);
    const addAccountBtn = document.getElementById(`teams-add-account-${reqId}`);

    let recipientSearchManager = initializeRecipientSearch({
        reqId,
        connectionId: selectedConnectionId,
        userId,
        source,
        onRecipientsChange: (recipients) => {
            validateForm();
        }
    });

    const toggleAccountDropdown = (forceClose) => {
        if (forceClose || isAccountDropdownOpen) {
            if (accountAddDropdown) accountAddDropdown.style.display = 'none';
            isAccountDropdownOpen = false;
            connTrigger?.classList.remove('active');
        } else {
            if (accountAddDropdown) accountAddDropdown.style.display = '';
            isAccountDropdownOpen = true;
            connTrigger?.classList.add('active');
        }
    };

    const renderAccountList = () => {
        if (!existingAccountsContainer) return;
        existingAccountsContainer.innerHTML = connections.map((conn, i) => `
            <div class="peopleinformation" data-conn-id="${conn?.id}" data-conn-label="${conn?.label || conn?.name || ''}" data-conn-email="${conn?.emailId || ''}">
                <div class="personicon teams-personicon" style="color:${acColorCombo[i % 4]};background-color:${acBackgroundCombo[i % 4]}">${(conn?.label || conn?.name || '?').charAt(0)}</div>
                <div class="accountperson">
                    <div class="personname">${conn?.label || conn?.name || ''}</div>
                    <div class="personemail">${conn?.emailId || ''}</div>
                </div>
                <div class="tickicon${selectedConnectionId === conn?.id ? ' active' : ''}">${tickMarkIcon({ size: 15, color: '#475467' })}</div>
            </div>
        `).join('');
        attachAccountSelectionListeners();
    };

    const selectConnection = (connId) => {
        const conn = connections.find(c => c?.id === connId);
        if (!conn) return;
        selectedConnectionId = connId;
        selectedConnectionLabel = conn.label || conn.name || '';
        if (connLabel) connLabel.textContent = selectedConnectionLabel;
        toggleAccountDropdown(true);
        renderAccountList();

        recipientSearchManager.destroy();
        recipientSearchManager = initializeRecipientSearch({
            reqId,
            connectionId: selectedConnectionId,
            userId,
            source,
            onRecipientsChange: (recipients) => {
                validateForm();
            }
        });
    };

    const attachAccountSelectionListeners = () => {
        existingAccountsContainer?.querySelectorAll('.peopleinformation').forEach(el => {
            el.addEventListener('click', () => {
                selectConnection(el.dataset.connId);
            });
        });
    };

    const handleAddAccount = async () => {
        toggleAccountDropdown(true);
        try {
            const response = await store.dispatch(getSpecificSkills({ userId, connectorId: source }));
            const authProfile = response?.payload?.authProfiles?.[0];
            if (authProfile?.type === 'oauth2') {
                const config = {
                    label: `Connection ${(response?.payload?.connections?.length || 0) + 1}`,
                    allowedCapabilities: response?.payload?.capabilities
                };
                eventBus.on('postOauth2Connection', handlePostOauthConnection);
                new SSOMethods().connect(source, null, config);
            }
        } catch (err) {
            console.error('[TeamsTemplate] Add account error:', err);
        }
    };

    const handlePostOauthConnection = async () => {
        eventBus.remove('postOauth2Connection', handlePostOauthConnection);
        try {
            const response = await store.dispatch(getSpecificSkills({ userId, connectorId: source }));
            const newConnections = response?.payload?.connections || [];
            connections = newConnections;
            renderAccountList();
            if (newConnections.length > 0) {
                const lastConn = newConnections[newConnections.length - 1];
                selectConnection(lastConn.id);
            }
        } catch (err) {
            console.error('[TeamsTemplate] Refresh connections error:', err);
        }
    };

    if (connTrigger) {
        connTrigger.addEventListener('click', () => toggleAccountDropdown());
    }
    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', handleAddAccount);
    }

    document.addEventListener('click', (e) => {
        const cntr = document.getElementById(`teams-conn-cntr-${reqId}`);
        if (cntr && !cntr.contains(e.target) && isAccountDropdownOpen) {
            toggleAccountDropdown(true);
        }
    });

    attachAccountSelectionListeners();

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
        if (!attachmentsPreview) return;

        if (attachedFiles.length === 0) {
            attachmentsPreview.innerHTML = '';
            return;
        }

        attachmentsPreview.innerHTML = attachedFiles.map((file, index) => {
            const ext = (file.extName || getFileExtension(file.name || '') || '').toLowerCase();
            const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
            const previewSrc = file.fileUrl?.thumbnailURL || file.fileUrl?.publicUrl || file.previewUrl;

            const iconHtml = isImage && previewSrc
                ? `<img class="attachment-type" src="${previewSrc}" alt="${file.name}" />`
                : `<span class="extIcons">${getFileTypeIconHtml(ext, 28)}</span>`;

            if (file.loading) {
                return `
                    <div class="kiaas-attachments attachment__Loading" data-index="${index}">
                        <div class="attachment-list-item noOverlay">${iconHtml}</div>
                        <div class="attachment-loader"><div class="kiaas-spinner"></div></div>
                        <span class="attachment-close" data-index="${index}"></span>
                    </div>`;
            }
            if (file.error) {
                return `
                    <div class="kiaas-attachments" data-index="${index}" title="${file.error}">
                        <div class="attachment-list-item noOverlay error-item">${iconHtml}</div>
                        <span class="attachment-close" data-index="${index}"></span>
                    </div>`;
            }
            return `
                <div class="kiaas-attachments" data-index="${index}" title="${file.name || ''}">
                    <div class="attachment-list-item ${isImage ? '' : 'noOverlay'}">${iconHtml}</div>
                    <span class="attachment-close" data-index="${index}"></span>
                </div>`;
        }).join('');

        attachmentsPreview.querySelectorAll('.attachment-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                attachedFiles.splice(idx, 1);
                updateAttachmentsPreview();
                validateForm();
            });
        });
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
            const message = messageBody?.innerText || messageBody?.textContent || '';
            const uploadedAttachments = attachedFiles.filter(file => file.uploaded && !file.error);
            const selectedRecipients = recipientSearchManager.getSelectedRecipients();

            const attachmentIds = uploadedAttachments.map(f => f.fileId || f.docId);

            const componentPayload = uploadedAttachments.map(f => {
                const fUrl = f.fileUrl || {};
                return {
                    fileType: fUrl.fileType || f.type || 'attachment',
                    fileSize: fUrl.fileSize || f.size,
                    fileId: fUrl.fileId || f.fileId || f.docId,
                    fileName: fUrl.fileName || f.name || f.title,
                    originalFilename: fUrl.originalFilename || f.name || f.title,
                };
            });

            const conversationPayload = selectedRecipients.map(r => ({
                id: r.id,
                label: r.label || r.name,
                meta: r.meta || {}
            }));

            const payload = {
                nodeType: "actions",
                eventId: "send_message",
                connectionId: selectedConnectionId,
                boardId: data?.boardId,
                params: {
                    conversations: conversationPayload,
                    attachments: attachmentIds,
                    components: componentPayload,
                    message: message,
                },
                contextParams: {
                    messageId: data?.messageId,
                }
            };

            sendButton.disabled = true;
            sendButton.textContent = 'Sending...';
            templateEl.setAttribute('data-sending', 'true');

            store.dispatch(sendIntegrationMessage({
                userId,
                source: source || 'msteams',
                payload
            })).then(response => {
                templateEl.removeAttribute('data-sending');
                if (response?.payload && !response?.error) {
                    const channels = selectedRecipients.map(r => ({
                        id: r.id,
                        label: r.label || r.name,
                        meta: r.meta || {}
                    }));
                    const text = messageBody?.innerText || messageBody?.textContent || '';
                    const tenantName = data?.content?.tenantName || data?.content?.workSpace || selectedConnectionLabel || 'Teams';
                    const attachments = uploadedAttachments.map(f => ({
                        originalFilename: f.name || f.title,
                        name: f.name || f.title,
                        fileName: f.name || f.title,
                        fileType: f.type,
                        publicUrl: f.fileUrl?.publicUrl || f.fileUrl?.thumbnailURL || '',
                        thumbnailURL: f.fileUrl?.thumbnailURL || f.fileUrl?.publicUrl || '',
                        extName: f.extName || getFileExtension(f.name || f.title || '') || '',
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
                templateEl.removeAttribute('data-sending');
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

