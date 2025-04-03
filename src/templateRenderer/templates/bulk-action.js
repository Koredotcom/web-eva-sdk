import { encodeHtml } from "../utils/helper";

function render(data) {
	const { items, actions, status } = data;

	return `
        <div class="bulk-action-container">
            ${renderHeader(data)}
            ${renderItemsList(items)}
            ${renderActionButtons(actions, status)}
        </div>
    `;
}

function renderHeader(data) {
	return `
        <div class="bulk-action-header">
            <h3 class="header-title">
                ${encodeHtml(data.title || "Bulk Actions")}
            </h3>
            ${
				data.description
					? `
                <p class="header-description">
                    ${encodeHtml(data.description)}
                </p>
            `
					: ""
			}
        </div>
    `;
}

function renderItemsList(items) {
	if (!items?.length) return "";

	return `
        <div class="items-list">
            ${items
				.map(
					(item, index) => `
                <div class="item-row" data-item-id="${item.id}">
                    <div class="item-select">
                        <input 
                            type="checkbox" 
                            id="item-${index}" 
                            ${item.selected ? "checked" : ""}
                        />
                    </div>
                    <div class="item-content">
                        <div class="item-title">${encodeHtml(item.title)}</div>
                        ${
							item.description
								? `
                            <div class="item-description">
                                ${encodeHtml(item.description)}
                            </div>
                        `
								: ""
						}
                    </div>
                    ${renderItemStatus(item.status)}
                </div>
            `
				)
				.join("")}
        </div>
    `;
}

function renderItemStatus(status) {
	if (!status) return "";

	const statusClasses = {
		success: "status-success",
		error: "status-error",
		pending: "status-pending",
	};

	return `
        <div class="item-status ${statusClasses[status.type] || ""}">
            ${
				status.icon
					? `
                <span class="status-icon">${status.icon}</span>
            `
					: ""
			}
            <span class="status-text">
                ${encodeHtml(status.text)}
            </span>
        </div>
    `;
}

function renderActionButtons(actions, status) {
	if (!actions?.length) return "";

	return `
        <div class="action-buttons">
            <button class="kr-secondary-btn btn-sm" data-action="cancel">
                Cancel
            </button>
            ${actions
				.map(
					(action) => `
                <button 
                    class="kr-primary-btn-black btn-sm" 
                    data-action="${action.type}"
                    ${status === "processing" ? "disabled" : ""}
                >
                    ${
						action.icon
							? `<span class="action-icon">${action.icon}</span>`
							: ""
					}
                    ${encodeHtml(action.label)}
                </button>
            `
				)
				.join("")}
        </div>
    `;
}

return { render };
