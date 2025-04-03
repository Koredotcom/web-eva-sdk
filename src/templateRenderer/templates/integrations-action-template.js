import { encodeHtml } from "../utils/helper";

import TemplateComponents from "./index";

function render(data) {
	const { integration, form, validation, status, preview } = data;

	return `
        <div class="integration-action-template ${integration.provider || ""}">
            ${renderHeader(integration)}
            ${preview ? renderPreview(data) : renderForm(form, validation)}
            ${renderActions(status, preview)}
        </div>
    `;
}

function renderHeader(integration) {
	return `
        <div class="integration-header">
            ${
				integration.icon
					? `
                <div class="integration-icon">
                    <img 
                        src="${encodeHtml(integration.icon)}" 
                        alt="${encodeHtml(integration.name || "Integration")}"
                    />
                </div>
            `
					: ""
			}
            <div class="header-content">
                <h3 class="header-title">
                    ${encodeHtml(integration.title || "Integration Action")}
                </h3>
                ${
					integration.description
						? `
                    <p class="header-description">
                        ${encodeHtml(integration.description)}
                    </p>
                `
						: ""
				}
            </div>
        </div>
    `;
}

function renderForm(form, validation) {
	if (!form?.fields) return "";

	return `
        <div class="integration-form">
            ${form.fields
				.map((field) =>
					renderFormField(field, validation?.errors?.[field.name])
				)
				.join("")}
        </div>
    `;
}

function renderFormField(field, error) {
	return `
        <div class="form-field ${field.type} ${error ? "has-error" : ""}">
            ${renderFieldLabel(field)}
            ${renderFieldInput(field)}
            ${renderFieldError(error)}
            ${renderFieldHelp(field)}
        </div>
    `;
}

function renderFieldLabel(field) {
	if (!field.label) return "";

	return `
        <label class="field-label" for="${field.name}">
            ${encodeHtml(field.label)}
            ${field.required ? '<span class="required">*</span>' : ""}
        </label>
    `;
}

function renderFieldInput(field) {
	switch (field.type) {
		case "text":
		case "email":
		case "number":
		case "url":
		case "date":
			return `
                <input 
                    type="${field.type}"
                    id="${field.name}"
                    name="${field.name}"
                    class="field-input"
                    value="${encodeHtml(field.value || "")}"
                    ${
						field.placeholder
							? `placeholder="${encodeHtml(field.placeholder)}"`
							: ""
					}
                    ${field.required ? "required" : ""}
                    ${field.readonly ? "readonly" : ""}
                    ${field.disabled ? "disabled" : ""}
                />
            `;

		case "textarea":
			return `
                <textarea
                    id="${field.name}"
                    name="${field.name}"
                    class="field-textarea"
                    ${
						field.placeholder
							? `placeholder="${encodeHtml(field.placeholder)}"`
							: ""
					}
                    ${field.required ? "required" : ""}
                    ${field.readonly ? "readonly" : ""}
                    ${field.disabled ? "disabled" : ""}
                    rows="${field.rows || 4}"
                >${encodeHtml(field.value || "")}</textarea>
            `;

		case "select":
			return `
                <select
                    id="${field.name}"
                    name="${field.name}"
                    class="field-select"
                    ${field.required ? "required" : ""}
                    ${field.disabled ? "disabled" : ""}
                >
                    ${
						field.placeholder
							? `
                        <option value="" disabled ${
							!field.value ? "selected" : ""
						}>
                            ${encodeHtml(field.placeholder)}
                        </option>
                    `
							: ""
					}
                    ${field.options
						?.map(
							(option) => `
                        <option 
                            value="${encodeHtml(option.value)}"
                            ${option.value === field.value ? "selected" : ""}
                        >
                            ${encodeHtml(option.label)}
                        </option>
                    `
						)
						.join("")}
                </select>
            `;

		case "checkbox":
		case "radio":
			return `
                <div class="field-options">
                    ${field.options
						?.map(
							(option, index) => `
                        <label class="option-label">
                            <input
                                type="${field.type}"
                                name="${field.name}"
                                value="${encodeHtml(option.value)}"
                                ${
									field.type === "radio" &&
									option.value === field.value
										? "checked"
										: ""
								}
                                ${
									field.type === "checkbox" &&
									field.value?.includes(option.value)
										? "checked"
										: ""
								}
                                ${field.disabled ? "disabled" : ""}
                            />
                            <span class="option-text">${encodeHtml(
								option.label
							)}</span>
                        </label>
                    `
						)
						.join("")}
                </div>
            `;

		case "file":
			return `
                <div class="file-upload">
                    <input
                        type="file"
                        id="${field.name}"
                        name="${field.name}"
                        class="file-input"
                        ${field.accept ? `accept="${field.accept}"` : ""}
                        ${field.multiple ? "multiple" : ""}
                        ${field.required ? "required" : ""}
                        ${field.disabled ? "disabled" : ""}
                    />
                    <label class="file-label" for="${field.name}">
                        ${TemplateComponents.renderIcon("Upload")}
                        <span>${encodeHtml(
							field.placeholder || "Choose file"
						)}</span>
                    </label>
                </div>
            `;

		default:
			return "";
	}
}

function renderFieldError(error) {
	if (!error) return "";

	return `
        <div class="field-error">
            ${encodeHtml(error)}
        </div>
    `;
}

function renderFieldHelp(field) {
	if (!field.help) return "";

	return `
        <div class="field-help">
            ${
				field.help.icon
					? TemplateComponents.renderIcon(field.help.icon)
					: ""
			}
            <span>${encodeHtml(field.help.text)}</span>
        </div>
    `;
}

function renderPreview(data) {
	const { form, integration } = data;

	return `
        <div class="integration-preview">
            ${form.fields
				?.map(
					(field) => `
                <div class="preview-field">
                    <div class="preview-label">${encodeHtml(field.label)}</div>
                    <div class="preview-value">
                        ${renderPreviewValue(field)}
                    </div>
                </div>
            `
				)
				.join("")}
        </div>
    `;
}

function renderPreviewValue(field) {
	if (!field.value) return "-";

	switch (field.type) {
		case "file":
			return field.value
				.map(
					(file) => `
                <div class="file-preview">
                    ${TemplateComponents.renderIcon("File")}
                    <span>${encodeHtml(file.name)}</span>
                </div>
            `
				)
				.join("");

		case "checkbox":
			return (
				field.options
					?.filter((opt) => field.value.includes(opt.value))
					.map((opt) => encodeHtml(opt.label))
					.join(", ") || "-"
			);

		case "select":
		case "radio":
			return encodeHtml(
				field.options?.find((opt) => opt.value === field.value)
					?.label || field.value
			);

		default:
			return encodeHtml(field.value);
	}
}

function renderActions(status, preview) {
	return `
        <div class="integration-actions">
            <button class="kr-secondary-btn btn-sm" data-action="cancel">
                Cancel
            </button>
            ${
				preview
					? `
                <button class="kr-secondary-btn btn-sm" data-action="edit">
                    Edit
                </button>
                <button class="kr-primary-btn-black btn-sm" data-action="submit">
                    Submit
                </button>
            `
					: `
                <button class="kr-primary-btn-black btn-sm" data-action="preview">
                    Preview
                </button>
            `
			}
        </div>
    `;
}

export { render };
