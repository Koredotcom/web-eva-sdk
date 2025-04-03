import { encodeHtml } from "../utils/helper";

import TemplateComponents, { renderIcon } from "./index";

function render(data) {
	const { feedback = {}, status } = data;

	return `
        <div class="feedback-template ${status || ""}">
            ${renderFeedbackButtons(feedback)}
            ${renderFeedbackForm(feedback)}
        </div>
    `;
}

function renderFeedbackButtons(feedback) {
	return `
        <div class="feedback-buttons">
            <button 
                class="feedback-btn ${
					feedback.type === "positive" ? "active" : ""
				}" 
                data-action="feedback" 
                data-type="positive"
            >
                ${renderIcon("ThumbsUp")}
            </button>
            <button 
                class="feedback-btn ${
					feedback.type === "negative" ? "active" : ""
				}" 
                data-action="feedback" 
                data-type="negative"
            >
                ${renderIcon("ThumbsDown")}
            </button>
        </div>
    `;
}

function renderFeedbackForm(feedback) {
	if (!feedback.showForm) return "";

	return `
        <div class="feedback-form">
            <textarea 
                placeholder="Please provide your feedback"
                class="feedback-input"
            >${encodeHtml(feedback.comment || "")}</textarea>
            <div class="feedback-actions">
                <button class="cancel-btn" data-action="cancel-feedback">
                    Cancel
                </button>
                <button class="submit-btn" data-action="submit-feedback">
                    Submit
                </button>
            </div>
        </div>
    `;
}

export { render };
