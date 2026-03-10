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
                        <label>To:</label>
                        <select class="email-select-field" id="email-to-${data.reqId}" multiple></select>
                        <div class="cc-bcc-toggle" id="cc-bcc-toggle-${data?.reqId}">
                            <span class="cc-toggle-btn" id="cc-toggle-${data?.reqId}"${data?.content?.cc?.length ? ' style="display:none"' : ''}>CC</span>
                            <span class="bcc-toggle-btn" id="bcc-toggle-${data?.reqId}"${data?.content?.bcc?.length ? ' style="display:none"' : ''}>BCC</span>
                        </div>
                    </div>
                    <div class="email-field email-cc-row" id="email-cc-row-${data?.reqId}"${data?.content?.cc?.length ? '' : ' style="display:none"'}>
                       <label>CC:</label>
                       <select class="email-select-field" id="email-cc-${data.reqId}" multiple></select>
                    </div>
                    <div class="email-field email-bcc-row" id="email-bcc-row-${data?.reqId}"${data?.content?.bcc?.length ? '' : ' style="display:none"'}>
                      <label>BCC:</label>
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
                <div class="email-footer">
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

    let allRecievers = [...data?.content?.to || [], ...data?.content?.cc || [], ...data?.content?.bcc || []];

    let html = `
        <div class="emailSmallCard">
            <div class="email-summary">
                <h2>${data?.content?.subject}</h2>
            </div>
            <div class="email-summary-body">
                <div class="email-summary-to">
                    ${allRecievers?.map(email => `<span class="email-summary-to-item">${email?.name}</span>`).join('')}
                </div>
                <div class="email-summary-body-content">
                    ${data?.content?.body}
                </div>
            </div>
        </div>
    `

    return html;
}

export default { render };