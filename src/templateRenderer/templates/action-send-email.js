import sendEmailFunctionality from "../functionality/action-send-email";
import { encodeHtml } from "../utils/helper";
import { Gmail, Outlookimg } from "../icons-library";
import "./../styles/template.scss";

export function render(data) {

    if (data?.status === 'completed') {
        return renderEmailSummary(data);
    }

    let emailList = data?.templateInfo?.connections;
    let defaultConnectionId = data?.templateInfo?.defaultConnections;
    const defaultConnectionProvider = data?.templateInfo?.connections?.find(email => email?.id === defaultConnectionId)?.provider;
    let html = `
        <div class="email-template">
            <div class='email-selection-field'>
                <div class="email-field email-header-block">
                    <div class='connection-provider-icon'>                            
                            ${defaultConnectionProvider === 'gmail' ? Gmail({ size: 16, color: "#131316" }) : Outlookimg({ size: 16, color: "#131316" })}
                        </div>
                    <sl-select id="email-connection-${data?.reqId}" value="${defaultConnectionId || ''}">
                        ${emailList?.map((email, index) =>
        `
                        <sl-option value="${email?.id}" id="email-connection-${index}">${email?.emailId}</sl-option>
                        `
    ).join('')}
                    </sl-select>
                </div>
                <div class="email-header">
                    <div class="email-recipients-collapsed" id="email-recipients-collapsed-${data?.reqId}" style="display:none"></div>
                    <div class="email-field email-to-row">
                        <label>To</label>
                        <select class="email-select-field" id="email-to-${data.reqId}" multiple></select>
                        <div class="cc-bcc-toggle" id="cc-bcc-toggle-${data?.reqId}">
                            <span class="cc-toggle-btn" id="cc-toggle-${data?.reqId}"${data?.content?.cc?.length ? ' style="display:none"' : ''}>Cc</span>
                            <span class="bcc-toggle-btn" id="bcc-toggle-${data?.reqId}"${data?.content?.bcc?.length ? ' style="display:none"' : ''}>Bcc</span>
                        </div>
                    </div>
                    <div class="email-field email-cc-row" id="email-cc-row-${data?.reqId}"${data?.content?.cc?.length ? '' : ' style="display:none"'}>
                       <label>Cc</label>
                       <select class="email-select-field" id="email-cc-${data.reqId}" multiple></select>
                    </div>
                    <div class="email-field email-bcc-row" id="email-bcc-row-${data?.reqId}"${data?.content?.bcc?.length ? '' : ' style="display:none"'}>
                      <label>Bcc</label>
                      <select class="email-select-field" id="email-bcc-${data.reqId}" multiple></select>
                    </div>
                    <div class="email-field email-subject">
                        <sl-input
                        class="email-subject-field"
                        placeholder="Subject"
                        id="email-subject-${data?.reqId}"
                        value="${data?.content?.subject || ''}"
                        ></sl-input>
                    </div>
                </div>
                <div class="email-body">
                    <div
                        class="email-body-container"
                        id="email-body-${data?.reqId}"
                        contenteditable="true"
                        >
                        ${data?.content?.body || ''}
                    </div>
                </div>
                <div class="email-format-toolbar" id="email-format-toolbar-${data?.reqId}" style="display:none">
                    <button type="button" class="fmt-btn" data-cmd="bold" title="Bold"><b>B</b></button>
                    <button type="button" class="fmt-btn" data-cmd="italic" title="Italic"><i>I</i></button>
                    <button type="button" class="fmt-btn" data-cmd="underline" title="Underline"><u>U</u></button>
                   
                </div>
                <div class="email-footer">
                    <div class="email-footer-left">
                        <div class="email-field">
                            <label for="email-attachments-${data?.reqId}" class="custom-file-upload">
                                <input
                                    type="file"
                                    id="email-attachments-${data?.reqId}"
                                    multiple
                                />
                                <span class="file-upload-text">Attach</span>
                            </label>
                        </div>
                        <button type="button" class="email-options-btn" id="email-options-btn-${data?.reqId}">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                            <span>Options</span>
                        </button>
                    </div>
                    <div class="email-field">
                        <sl-button class="primary-button-black" id="email-send-${data?.reqId}" variant="primary" disabled>Send</sl-button>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        sendEmailFunctionality(data);
    }, 0);

    return html;
}

const renderEmailSummary = (data) => {
    const toRecipients = data?.content?.to || [];
    const ccRecipients = data?.content?.cc || [];
    const bccRecipients = data?.content?.bcc || [];
    const allRecipients = [...toRecipients, ...ccRecipients, ...bccRecipients];

    const defaultConn = data?.templateInfo?.connections?.find(c => c?.id === data?.templateInfo?.defaultConnections);
    const provider = data?.provider || defaultConn?.provider || 'gmail';
    const providerIcon = provider === 'gmail' ? Gmail({ size: 16, color: "#131316" }) : Outlookimg({ size: 16, color: "#131316" });
    const senderName = data?.content?.from?.name || data?.senderName || defaultConn?.name || defaultConn?.displayName || defaultConn?.emailId || '';

    const subject = data?.content?.subject || '(no subject)';
    const bodyRaw = data?.content?.body || data?.content?.content || '';
    const bodyText = bodyRaw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const bodyPreview = bodyText.length > 80 ? bodyText.slice(0, 80) + '...' : bodyText;

    const attachments = data?.content?.components || data?.content?.attachments || [];
    const attachList = Array.isArray(attachments) ? attachments : [];
    const attachCount = attachList.length;
    const uniqueId = data?.reqId || Math.random().toString(36).slice(2, 8);

    const getName = (r) => r?.name || r?.label || r?.email || r?.id || '';

    const recipientChips = allRecipients.slice(0, 3).map(r => {
        const name = getName(r);
        const initial = name.charAt(0).toUpperCase();
        return `<span class="es-recipient-chip"><span class="es-recipient-avatar">${initial}</span>${name}</span>`;
    }).join('');
    const moreRecipients = allRecipients.length > 3 ? `<span class="es-recipient-more">+${allRecipients.length - 3}</span>` : '';

    const recipientNames = allRecipients.map(r => getName(r)).join(', ');

    const attachLinksHtml = attachList.map(a => {
        const fname = a?.fileName || a?.name || 'attachment';
        const url = a?.fileUrl || a?.url || '#';
        return `<a class="es-attach-link" href="${url}" target="_blank" rel="noopener noreferrer">${fname}</a>`;
    }).join('');

    let html = `
        <div class="email-sent-wrapper" id="email-sent-${uniqueId}">
            <div class="email-sent-card" id="email-sent-card-${uniqueId}">
                <div class="es-header">
                    <span class="es-provider-icon">${providerIcon}</span>
                    <span class="es-subject">${subject}</span>
                </div>
                <div class="es-recipients">${recipientChips}${moreRecipients}</div>
                ${bodyPreview ? `<div class="es-body-preview">${bodyPreview}</div>` : ''}
                ${attachCount > 0 ? `<div class="es-attach-badge"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 8l-5.3 5.3a3.5 3.5 0 01-5 0 3.5 3.5 0 010-5L9 3a2.3 2.3 0 013.3 0 2.3 2.3 0 010 3.3l-5.4 5.3a1.2 1.2 0 01-1.6 0 1.2 1.2 0 010-1.6L10 5.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg> ${attachCount} Attachment${attachCount > 1 ? 's' : ''}</div>` : ''}
                <div class="es-status"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="#22c55e"/><path d="M5 8l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Sent successfully</div>
            </div>
            <div class="email-sent-expanded" id="email-sent-expanded-${uniqueId}" style="display:none">
                <div class="es-exp-header">
                    <span class="es-provider-icon">${providerIcon}</span>
                    <span class="es-sender-name">${senderName}</span>
                    <button type="button" class="es-collapse-btn" id="es-collapse-btn-${uniqueId}" title="Collapse">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2l-5 5M14 2h-4M14 2v4M2 14l5-5M2 14h4M2 14v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
                <div class="es-exp-row">${recipientNames}</div>
                <div class="es-exp-row es-exp-subject">${subject}</div>
                <div class="es-exp-body">${bodyRaw}</div>
                ${attachLinksHtml ? `<div class="es-exp-attachments">${attachLinksHtml}</div>` : ''}
            </div>
        </div>
    `;

    setTimeout(() => {
        const card = document.getElementById(`email-sent-card-${uniqueId}`);
        const expanded = document.getElementById(`email-sent-expanded-${uniqueId}`);
        const collapseBtn = document.getElementById(`es-collapse-btn-${uniqueId}`);

        if (card) card.addEventListener('click', () => {
            card.style.display = 'none';
            if (expanded) expanded.style.display = '';
        });
        if (collapseBtn) collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (expanded) expanded.style.display = 'none';
            if (card) card.style.display = '';
        });
    }, 0);

    return html;
}

export default { render };