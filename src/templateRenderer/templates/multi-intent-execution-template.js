import { encodeHtml } from "../utils/helper";

import TemplateComponents from "./index";

function render(data) {
	const { executionPipeline = [], status } = data;

	if (status === "terminated" || executionPipeline.length === 0) {
		return `
            <div class="threadName">
                I see you interrupted the answer generation. Please feel free to provide more details or let me know how can I assist you further
            </div>
        `;
	}

	return `
        <div class="multi-intent-execution ${status || ""}">
            ${renderExecutionPipeline(executionPipeline)}
        </div>
    `;
}

function renderExecutionPipeline(pipeline) {
	return `
        <div class="execution-pipeline">
            ${pipeline
				.map((item, index) => renderPipelineItem(item, index))
				.join("")}
        </div>
    `;
}

function renderPipelineItem(item, index) {
	return `
        <div class="pipeline-item ${item.status || ""}" data-index="${index}">
            <div class="item-header">
                <span class="item-number">${index + 1}</span>
                <span class="item-title">${encodeHtml(item.title || "")}</span>
                ${renderItemStatus(item.status)}
            </div>
            <div class="item-content">
                ${renderItemContent(item)}
            </div>
        </div>
    `;
}

function renderItemStatus(status) {
	if (!status) return "";

	const statusIcons = {
		completed: "CheckCircle",
		running: "Loading",
		pending: "Clock",
		error: "Error",
	};

	return `
        <span class="item-status ${status}">
            ${
				statusIcons[status]
					? TemplateComponents.renderIcon(statusIcons[status])
					: ""
			}
            ${encodeHtml(status)}
        </span>
    `;
}

function renderItemContent(item) {
	if (item.error) {
		return `
            <div class="error-message">
                ${encodeHtml(item.error.message || "An error occurred")}
            </div>
        `;
	}

	return item.content || "";
}

export { render };
