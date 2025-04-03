import { encodeHtml } from "../utils/helper";

export function render(data) {
	const { channel, message } = data;

	return `
        <div class="slack-message-template">
            <div class="channel-info">
                <span class="channel-label">Channel:</span>
                <span class="channel-name">${encodeHtml(channel)}</span>
            </div>
            <div class="message-content">
                ${encodeHtml(message)}
            </div>
        </div>
    `;
}

export default { render };
