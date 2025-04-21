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
                        ${option?.value?.choices?.map(choice => `
                            <div class="field-radiobutton withoutBorder${choice?.nested?.value?.type === "checkbox" ? " wrapBox" : ""}">
                                <input type="radio" id="binary-${choice.id}" ${false ? "checked" : ""} />
                                <label for="binary-${choice.id}">${choice.label}</label>
                                ${choice?.nested?.value?.type === "checkbox" ? `
                                    <div class="pojectsGroup">
                                        ${choice?.nested?.value?.choices?.map(subChoice => `
                                            <input type="checkbox" id="binary-${choice.id}-${subChoice.id}" ${false ? "checked" : ""} />
                                            <label for="binary-${choice.id}-${subChoice.id}">${subChoice.label}</label>
                                        `).join('')}
                                    </div>
                                ` : ""}
                            </div>
                        `).join('')}
                    ` : ""}
                    ${option?.value?.type === "dropdown" && option?.dynamic === true ? `
                        <div class="inputDropdowngroup">
                            <div class="drInputSection">
                                ${dropDownChoice ? `
                                    <div class="selectedChoice">
                                        <div class="selectedChip">
                                            <div class="selectedImg">
                                                <img src="${dropDownChoice.icon}" style="width: 20px; height: 20px;" />
                                            </div>
                                            <div class="selectionLabel">${dropDownChoice.label}</div>
                                            <div>×</div>
                                        </div>
                                    </div>
                                ` : ""}
                                <input type="text" placeholder="Select ${option.key}" value="${searchText}" class="${dropDownChoice ? "hide" : "autocompleteInput"}" />
                                ${searchText ? `
                                    <div class="dropDown">
                                        ${ddOptions && ddOptions.length > 0 ? ddOptions.map(opt => `
                                            <div class="dd-options">
                                                <div class="drimg">
                                                    <img src="${opt.icon}" style="width: 20px; height: 20px;" />
                                                </div>
                                                <div class="drName">${opt.label}</div>
                                            </div>
                                        `).join('') : ""}
                                    </div>
                                ` : ""}
                            </div>
                        </div>
                    ` : ""}
                    ${(option?.value?.type === "text" || option?.value?.type === "number") ? `
                        <div class="inputDropdowngroup">
                            <div class="drInputSection">
                                <input type="${option.value.type === "number" ? "number" : "text"}" placeholder="Enter ${option.key}" />
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
                                            <input type="radio" id="groupedCheckbox-${index}" name="radio-${option.key}" key="${index}"/>
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
                                <input type="date" placeholder="Enter due date" class="entityValue" />
                            </div>
                        </div>
                    ` : ""}
                    ${option?.value?.type === "heading" ? `
                        <div class="heading">${option.value.value}</div>
                    ` : ""}
                    ${option?.value?.type === "textarea" ? `
                        <div class="textarea">
                            <textarea class="textarea-${option.value.type}" placeholder="${option.value.placeholder}"></textarea>
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
                <button class="cancel-btn-${data?.id}">Cancel</button>
                <button class="continue-btn-${data?.id}">Continue</button>
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
