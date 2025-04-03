import { encodeHtml } from "../utils/helper";

export function render(data) {
	const { error } = data;

	return `
        <div class="error-message">
            <div class="error-icon">⚠️</div>
            <div class="error-content">
                <h3>Error</h3>
                <p>${error.message}</p>
                ${error.code ? `<code>${error.code}</code>` : ""}
            </div>
        </div>
    `;
}

export default { render };
