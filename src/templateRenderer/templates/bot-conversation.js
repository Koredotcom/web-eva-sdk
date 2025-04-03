import { encodeHtml } from "../utils/helper";

function render(data) {
	if (data.loading) {
		return renderLoading();
	}

	return `
        <div class="bot-conversation-container">
            ${renderGeneratingMessage(data)}
            ${renderConversationContent(data)}
            ${renderFeedback(data)}
        </div>
    `;
}

function renderGeneratingMessage(data) {
	if (!data.status || data.status === "terminated") return "";

	return `
        <div class="generating-answer-block mb-30">
            <div class="generating-answer-block-item">
                <div class="icon">
                    <svg class="tick-mark" width="18" height="18">
                        <path d="M15 4.5L6.75 12.75L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="msg">
                    <span>${encodeHtml(
						`Transferring to: "${data?.sources?.[0]?.title}" agent`
					)}</span>
                </div>
            </div>
        </div>
    `;
}

function renderConversationContent(data) {
	if (data.status === "terminated") {
		return `
            <div class="threadName">
                I see you interrupted the answer generation. Please feel free to provide more details or let me know how can I assist you further
            </div>
        `;
	}

	return `
        <div class="conversation-content">
            ${data.thread ? renderThread(data.thread) : ""}
            ${
				data.answer
					? `
                <div class="threadName maxLength">
                    ${data.answer}
                </div>
            `
					: ""
			}
        </div>
    `;
}

function renderThread(thread) {
	if (!thread) return "";

	return `
        <div class="thread-container">
            ${
				thread.messages
					?.map(
						(message) => `
                <div class="thread-message ${message.type}">
                    ${message.content}
                </div>
            `
					)
					.join("") || ""
			}
        </div>
    `;
}

function renderFeedback(data) {
	if (!data.apiSuccess || data.status === "terminated") return "";

	return `
        <div class="feedback-container">
            <!-- Feedback component placeholder -->
        </div>
    `;
}

function renderLoading() {
	return `
        <div class="generating-answer-block">
            <div class="generating-answer-block-item">
                <div class="dot-flashing"></div>
            </div>
        </div>
    `;
}

return { render };
