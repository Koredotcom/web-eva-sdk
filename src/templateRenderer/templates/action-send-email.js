import sendEmailFunctionality from "../functionality/action-send-email";
import { encodeHtml } from "../utils/helper";

export function render(data) {
    const { to, subject, body, cc, bcc } = data?.content;

    let emailList = data?.templateInfo?.connections;
    let defaultConnectionId = data?.templateInfo?.defaultConnections;

    let html = `
        <div class="email-template">
        <div class='email-selection-field'>
            <div class="email-field">
                <select>
                    ${emailList?.map((email, index) => 
                        `<option id = ${index} value="${email?.id}" ${email?.id === defaultConnectionId ? 'selected' : ''}>${email?.emailId}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="email-header">
                <div class="email-field">
                    <label>To:</label>
                    <input type="text" placeholder="Enter email address" id = ${`email-to-${data?.reqId}`} />
                    ${data?.toChoices ? data?.toChoices?.map((email, index) => 
                        `<option id = ${index} value="${email?.id}">${email?.id}</option>`
                    ).join('') : ''}
                </div>
                <div class="email-field">
                    <label>CC:</label>
                    <input type="text" placeholder="Enter email address" id = ${`email-cc-${data?.reqId}`} />
                    ${data?.ccChoices ? data?.ccChoices?.map((email, index) => 
                        `<option id = ${index} value="${email?.id}">${email?.id}</option>`
                    ).join('') : ''}
                </div>
                <div class="email-field">
                    <label>BCC:</label>
                    <input type="text" placeholder="Enter email address" id = ${`email-bcc-${data?.reqId}`} />
                    ${data?.bccChoices ? data?.bccChoices?.map((email, index) => 
                        `<option id = ${index} value="${email?.id}">${email?.id}</option>`
                    ).join('') : ''}
                </div>
                <div class="email-field">
                    <label>Subject:</label>
                    <input type="text" placeholder="Enter subject" id = ${`email-subject-${data?.reqId}`} value = 'Subject'/>
                </div>
            </div>
            <div class="email-body">
                <textarea id = ${`email-body-${data?.reqId}`}></textarea>
            </div>
            <div class="email-footer">
                <div class="email-field">
                    <input type="file" id = ${`email-attachments-${data?.reqId}`} multiple></input>
                </div>
                <div class="email-field">
                    ${getSmartComposeData(data)}
                </div>
                <div class="email-field">
                    <button id = ${`email-send-${data?.reqId}`}>Send</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        sendEmailFunctionality(data);
    }, 1000);

    return html;
}

const getSmartComposeData = (data) => {

    let html;

    let smartComposeButton = `
        <button id = ${`email-smart-compose-${data?.reqId}`}>Smart Compose</button>
    `

    let smartComposeInput = `
        <input type="text" placeholder="Enter prompt" id = ${`email-smart-prompt-${data?.reqId}`} style = "display: none;"/>
    `

    let suggestionsArray = [['Apply leave', 'Approve request'], ['Rephrase', 'Make it shorter']];
    
    
    return `
        ${smartComposeButton}
        ${smartComposeInput}
    `
}

export default { render };
