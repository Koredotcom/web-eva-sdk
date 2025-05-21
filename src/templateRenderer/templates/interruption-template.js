import InterruptionTemplateFunc from "../functionality/interruption-template";
import { encodeHtml } from "../utils/helper";

import TemplateComponents from "./index";

function createGmailDriveInterruptions(data) {
    const interruptionFields = data?.templateInfo?.interruptionFields;
    return `
    <div class="interruption-block">
        ${interruptionFields?.map(option => `
            <div class="option-block-wrapper">
                ${option?.value?.type !== "groupedCheckbox" ? `
                    <div class="prTitle">${option?.label}</div>
                ` : ""}
                    <div class="project-group-wrapper ${option.key}">
                    ${(option?.value?.type === "checkbox" || option?.value?.type === "nestedCheckbox") ? `
                        ${option?.value?.choices?.[0]?.nested?.value?.type === "checkbox" ? `
                        ${option?.value?.choices?.map((choice, index) => `
                            <div class="field-radiobutton withoutBorder${choice?.nested?.value?.type === "checkbox" ? ' wrapBox' : ''}">
                            <div class="field-radiobutton withoutBorder">
                                <input type="checkbox" id="binary-${choice?.id}" key="${index}" name="${option?.key}" />
                                <label for="binary-${choice?.id}">${choice?.label}</label>
                            </div>
                            <div class="prjWhiteBoxGroup">
                                <div class="prjParentGroup">
                                ${choice?.nested?.value?.type === "checkbox" ? `
                                    <div class="pojectsGroup">
                                    ${choice?.nested?.value?.choices?.map((subChoice, subIndex) => `
                                        <div class="field-checkbox">
                                        <input type="checkbox" id="binary-${choice?.id}-${subChoice?.id}" key="${subIndex}" />
                                        <label for="binary-${choice?.id}-${subChoice?.id}">${subChoice?.label}</label>
                                        </div>
                                    `).join('')}
                                    </div>
                                ` : ''}
                                </div>
                            </div>
                            </div>
                        `).join('')}
                        ` : `
                        ${option?.value?.choices?.map((choice, index) => `
                            ${choice?.nested ? `
                            <div class="field-checkbox-dropdown">
                                <div class="leftBox">
                                <input type="checkbox" id="binary-${choice?.id}" key="${index}" />
                                <label for="binary-${choice?.id}">${choice?.label}</label>
                                </div>
                                ${choice?.nested?.value?.type === "dropdown" ? `
                                    <div class="custom-dropdown">
                                        <div class="dropdown-label">${choice?.nested?.value?.label}</div>
                                        <div class="dropdown-options">
                                        ${choice?.nested?.value?.choices?.map((subChoice, subIndex) => `
                                            <label>
                                            <input type="checkbox" value="${subChoice?.label}" id = "binary-${choice?.id}-${subChoice?.id}" key="${subIndex}" />
                                            ${subChoice?.label}
                                            </label>
                                        `).join('')}
                                        </div>
                                    </div>
                                    ` : ''}
                                ${choice?.nested?.value?.type === "checkbox" ? `
                                ${choice?.nested?.value?.choices?.map((subChoice, subIndex) => `
                                    <div class="field-checkbox">
                                    <input type="checkbox" id="binary-${choice?.id}-${subChoice?.id}" key="${subIndex}" />
                                    <label for="binary-${choice?.id}-${subChoice?.id}">${subChoice?.label}</label>
                                    </div>
                                `).join('')}
                                ` : ''}
                            </div>
                            ` : `
                            <div class="${option?.key !== 'timeline' ? 'field-checkbox' : 'field-radiobutton'}">
                                <input type="${option?.key !== 'timeline' ? 'checkbox' : 'radio'}" id="binary-${choice?.id}" key="${index}" name="${option?.key}" />
                                <label for="binary-${choice?.id}">${choice?.label}</label>
                            </div>
                            `}
                        `).join('')}
                        `}
                    ` : ''}
                    </div>

                    ${(option?.value?.type === "text" || option?.value?.type === "number") ? `
                        <div class="inputDropdowngroup">
                            <div class="drInputSection">
                                <input type="${option.value.type === "number" ? "number" : "text"}" placeholder="Enter ${option.key}" id = "inputValue-${option.key}" />
                            </div>
                        </div>
                    ` : ""}
                    ${option?.value?.type === "groupedCheckbox" ? `
                        <div class="field-radiobutton withoutBorder wrapBox">
                            ${option?.value?.groups?.map((group,index) => `
                                <div class="prTitle">${group.label}</div>
                                <div class="checkbox-group-${index}">
                                    ${group?.choices?.map((choice, index) => `
                                        <div class="checkboxWithLable">
                                            <input type="radio" id="groupedCheckbox-${index}" name="radio-${option.key}" key="${index}" value = "${index}"/>
                                            <label for="groupedCheckbox-${index}">${choice.label}</label>
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    ` : ""}
                    ${option?.value?.type === "date" ? `
                        <div class="inputDropdowngroup">
                            <div class="drInputSection">
                                <input type="date" placeholder="Enter due date" class="entityValue" id = "date-${option.key}" />
                            </div>
                        </div>
                    ` : ""}
                    ${option?.value?.type === "heading" ? `
                        <div class="heading">${option.value.value}</div>
                    ` : ""}
                    ${option?.value?.type === "textarea" ? `
                        <div class="textarea">
                            <textarea class="textarea" id = "textarea-${option.key}" placeholder="${option.value.placeholder}"></textarea>
                        </div>
                    ` : ""}
                    ${option?.value?.type === "buttons" ? `
                        <div class="btnsGroup moreGroup">
                            ${option?.value?.buttons?.map((button, index) => `
                                <button class="buttons-${index}">
                                ${button?.label}
                                </button>`
                            ).join('')}
                        </div>` : ''
                    }
                </div>
            </div>
        `).join('')}
        ${!interruptionFields?.some(f => f?.value?.type === "buttons") ? `
            <div class="buttons-wrapper">
                <button class="cancel-btn" id = "cancel-btn-${data?.reqId}">Cancel</button>
                <button class="continue-btn" id = "continue-btn-${data?.reqId}">Continue</button>
            </div>
        ` : ""}
    </div>
    `;
}

function render(data) {
    const html = `
    <div id="interruption-template-${data?.id}">
        ${data?.status !== "discard" ? `
            <div class="interruptionAnswer">
                We didn't locate relevant sources in your past two weeks' data. We'll now search comprehensively. Please confirm few things before we proceed.
            </div>
        ` : ""}
        <div class="threadName">
            ${data?.status === "discard" ? `
                Discarded. I see you interrupted the action. Please let me know how I can assist you further.
            ` : `
                <div class="interruption-wrapper">
                    ${createGmailDriveInterruptions(data)}
                </div>
            `}
        </div>
    </div>
    `;
    
    let timeout;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        InterruptionTemplateFunc(data);
    }, 1000);
    
    return html;
}

export { render };
