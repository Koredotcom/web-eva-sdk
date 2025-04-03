import { encodeHtml } from "../utils/helper";

export function render(data) {
	const { to, subject, body } = data;

	return `
        <div class="email-template">
            <div class="email-header">
                <div class="email-field">
                    <label>To:</label>
                    <span>${encodeHtml(to)}</span>
                </div>
                <div class="email-field">
                    <label>Subject:</label>
                    <span>${encodeHtml(subject)}</span>
                </div>
            </div>
            <div class="email-body">
                ${encodeHtml(body)}
            </div>
        </div>
    `;
}

export default { render };
