import { encodeHtml } from "../utils/helper";

function render(data) {
	const { message, status } = data;

	return `
        <div class="hold-conversation-template ${status || ""}">
            <div class="hold-message">
                ${encodeHtml(
					message || "Please wait while we process your request."
				)}
            </div>
            ${renderLoadingIndicator()}
        </div>
    `;
}

function renderLoadingIndicator() {
	return `
        <div class="loading-indicator">
            <div class="dot-flashing"></div>
        </div>
    `;
}

export { render };
