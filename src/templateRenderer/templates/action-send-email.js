import sendEmailFunctionality from "../functionality/action-send-email";
import { encodeHtml } from "../utils/helper";
import "./../styles/template.scss";

export function render(data) {

    if(data?.status === 'completed') {
        return renderEmailSummary(data);
    }

    let emailList = data?.templateInfo?.connections;
    let defaultConnectionId = data?.templateInfo?.defaultConnections;

    let html = `
        <div class="email-template">
            <div class='email-selection-field'>
                <div class="email-field email-header-block">
                    <sl-select id="email-connection-${data?.reqId}" value="${defaultConnectionId || ''}">
                        ${emailList?.map((email, index) =>
                        `
                        <sl-option value="${email?.id}" id="email-connection-${index}">${email?.emailId}</sl-option>
                        `
                        ).join('')}
                    </sl-select>
                </div>
                <div class="email-header">
                    <div class="email-field">
                        <label>To</label>
                        <select id="email-to-${data.reqId}" multiple placeholder="Enter email address">
                        </select>
                    </div>
                    <div class="email-field">
                        ${getEmailValue(data, 'cc')}
                        <sl-input
                        label="CC"
                        type="text"
                        placeholder="Enter email address"
                        id="email-cc-${data?.reqId}"
                        value="${data?.ccChoices?.input || ''}"
                        ></sl-input>
                        <div class="email-suggestions-dropdown">
                        ${data?.ccChoices?.res?.map((email, index) =>
                        `
                        <sl-option id="email-cc-${data?.reqId}-${index}" value="${email?.id}">${email?.id}</sl-option>
                        `
                        ).join('') || ''}
                        </div>
                    </div>
                    <div class="email-field">
                      <label>BCC</label>
                      <select id="email-bcc-${data.reqId}" multiple placeholder="Enter email address"></select>
                    </div>
                    <div class="email-field email-subject">
                        <sl-input
                        label="Subject"
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
                    <div class="email-field email-attachments">
                        <sl-input
                        type="file"
                        id="email-attachments-${data?.reqId}"
                        multiple
                        ></sl-input>
                    </div>
                    <div class="email-field">
                        <sl-button id="email-send-${data?.reqId}" variant="primary" disabled>Send</sl-button>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        sendEmailFunctionality(data);
    }, 1000);

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
        <div>
    `

    return html;
}

export default { render };