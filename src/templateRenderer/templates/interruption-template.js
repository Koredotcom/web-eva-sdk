import { encodeHtml } from "../utils/helper";

import TemplateComponents from "./index";

function render(data) {
	const { templateInfo, answer } = data;

	return `
        <div class="interruption-template">
            ${renderAnswer(answer)}
            ${renderInterruptionFields(templateInfo?.interruptionFields)}
        </div>
    `;
}

function renderAnswer(answer) {
	if (!answer) return "";

	return `
        <div class="interruption-answer">
            ${encodeHtml(answer)}
        </div>
    `;
}

function renderInterruptionFields(fields) {
	if (!fields?.length) return "";

	return `
        <div class="interruption-fields">
            ${fields.map((field) => renderField(field)).join("")}
        </div>
    `;
}

function renderField(field) {
	const { key, label, value } = field;

	switch (value?.type) {
		case "heading":
			return `
                <div class="field-heading">
                    <div class="field-label">${encodeHtml(label)}</div>
                    <div class="field-value">${encodeHtml(value.value)}</div>
                </div>
            `;

		case "textarea":
			return `
                <div class="field-textarea">
                    <div class="field-label">${encodeHtml(label)}</div>
                    <textarea 
                        class="comment-textarea"
                        placeholder="${encodeHtml(value.placeholder || "")}"
                        data-field="${key}"
                    ></textarea>
                </div>
            `;

		case "buttons":
			return `
                <div class="field-buttons">
                    ${value.buttons
						.map(
							(button) => `
                        <button 
                            class="kr-${
								button.type === "cancel"
									? "secondary"
									: "primary-black"
							}-btn btn-sm"
                            data-action="${button.id || button.type}"
                        >
                            ${encodeHtml(button.label)}
                        </button>
                    `
						)
						.join("")}
                </div>
            `;

		case "choices":
			return renderChoices(field);

		default:
			return "";
	}
}

function renderChoices(field) {
	const { key, label, value } = field;
	const isMulti = value.multi || false;

	if (value.groups) {
		return renderGroupedChoices(field);
	}

	return `
        <div class="field-choices">
            ${
				label
					? `<div class="field-label">${encodeHtml(label)}</div>`
					: ""
			}
            <div class="choices-list">
                ${value.choices
					.map(
						(choice) => `
                    <div class="choice-item">
                        ${
							isMulti
								? renderCheckbox(choice, key)
								: renderRadio(choice, key)
						}
                        ${renderNestedChoices(choice, key)}
                    </div>
                `
					)
					.join("")}
            </div>
        </div>
    `;
}

function renderGroupedChoices(field) {
	const { key, label, value } = field;
	const isMulti = value.multi || false;

	return `
        <div class="field-choices grouped">
            ${
				label
					? `<div class="field-label">${encodeHtml(label)}</div>`
					: ""
			}
            ${value.groups
				.map(
					(group) => `
                <div class="choice-group">
                    ${
						group.label
							? `
                        <div class="group-label">${encodeHtml(
							group.label
						)}</div>
                    `
							: ""
					}
                    <div class="choices-list">
                        ${group.choices
							.map(
								(choice) => `
                            <div class="choice-item">
                                ${
									isMulti
										? renderCheckbox(choice, key)
										: renderRadio(choice, key)
								}
                                ${renderNestedChoices(choice, key)}
                            </div>
                        `
							)
							.join("")}
                    </div>
                </div>
            `
				)
				.join("")}
        </div>
    `;
}

function renderCheckbox(choice, fieldKey) {
	return `
        <label class="choice-label checkbox">
            <input 
                type="checkbox"
                class="choice-checkbox"
                data-field="${fieldKey}"
                data-choice-id="${choice.id}"
                ${choice.checked ? "checked" : ""}
            />
            <span class="choice-text">${encodeHtml(choice.label)}</span>
        </label>
    `;
}

function renderRadio(choice, fieldKey) {
	return `
        <label class="choice-label radio">
            <input 
                type="radio"
                name="${fieldKey}"
                class="choice-radio"
                data-field="${fieldKey}"
                data-choice-id="${choice.id}"
                ${choice.checked ? "checked" : ""}
            />
            <span class="choice-text">${encodeHtml(choice.label)}</span>
        </label>
    `;
}

function renderNestedChoices(choice, parentKey) {
	if (!choice.nested) return "";

	const nestedValue = choice.nested.value;
	const isMulti = nestedValue.multi || false;

	return `
        <div class="nested-choices" data-parent-choice="${choice.id}">
            <div class="choices-list">
                ${nestedValue.choices
					.map(
						(nestedChoice) => `
                    <div class="choice-item">
                        ${
							isMulti
								? renderCheckbox(
										nestedChoice,
										choice.nested.key
								  )
								: renderRadio(nestedChoice, choice.nested.key)
						}
                    </div>
                `
					)
					.join("")}
            </div>
        </div>
    `;
}

export { render };
