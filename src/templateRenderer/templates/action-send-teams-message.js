import { searchIcon, attachmentIcon, ActionsFlashIcon, arrowCirlceUpIcon, Teamsimg } from "../icons-library";
import "./../styles/template.scss";
import FileUploader from "../../utils/FileUploader";
import { getFileExtension, getUID, generateComponentId } from "../../utils/helpers";
import store from "../../redux/store";
import axios from "axios";
import { initializeRecipientSearch } from "../../utils/searchChannelRecepients";

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
    const tenantName = data?.content?.tenantName;
    
    let html = `
        <div class="teams-message-small-card">
            <div class="teams-summary-header">
                <div class="teams-icon">
                    ${Teamsimg({ size: 20 })}
                </div>
                <h3>${tenantName}</h3>
            </div>
            <div class="teams-summary-body">
                <div class="teams-summary-recipients">
                    <strong>To:</strong>
                    ${recipients?.map(recipient => `<span class="recipient-tag">${recipient?.name || recipient?.email}</span>`).join('')}
                </div>
                <div class="teams-summary-message">
                    ${data?.content?.message?.msg}
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
    const userId = window.sdkConfig.userId;
    const reqId = data?.reqId;
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
                                ${file?.extName ? `<img src="images/${file?.extName}.png" alt="${file?.name}" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;" />` : ''}
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

    if (smartComposeBtn) {
        smartComposeBtn.addEventListener('click', () => {
            console.log('Smart compose triggered');
        });
    }

    if (sendButton) {
        sendButton.addEventListener('click', () => {
            const message = messageBody?.innerHTML || '';
            const uploadedAttachments = attachedFiles.filter(file => file.uploaded && !file.error);
            const selectedRecipients = recipientSearchManager.getSelectedRecipients();
            
            console.log('Sending Teams message:', {
                recipients: selectedRecipients,
                message,
                attachments: uploadedAttachments,
                fileIds: uploadedAttachments.map(f => f.fileId)
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

