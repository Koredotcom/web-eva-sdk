// import BotConversation from "../chat/botAgent/getBotConversation.js"
import { isEmpty } from "lodash";
import BotConversation from "../../chat/botAgent/getBotConversation";

function escapeHTML(str) {
	if (!str) return "";
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function createConversationHTML(conversation, props) {
	if (
		conversation?.hasOwnProperty("template_html") ||
		conversation?.templateType === "hold_conversation"
	) {
		return `
            <div class="botTemplate-${conversation?.messageId}"></div>
        `;
	}

	if (conversation?.templateType === "search_answer") {
		if (conversation?.status === "completed" && conversation?.answer) {
			return `
                <div>
                    <div>${escapeHTML(conversation?.question)}</div>
                    <br>
                    <div>
                        <input 
                            type="text" 
                            value="${escapeHTML(conversation?.answer)}" 
                            readonly
                        >
                    </div>
                </div>
            `;
		}

		if (props?.status !== "completed") {
			return `
                <div>
                    <div>${escapeHTML(conversation?.question)}</div>
                    <input
                        type="text"
                        class="bot-input"
                        placeholder="Enter bot response"
                        data-message-id="${conversation?.messageId}"
                    >
                    <button 
                        class="send-button" 
                        data-message-id="${conversation?.messageId}"
                        ${conversation?.loading ? "disabled" : ""}
                    >
                        ${conversation?.loading ? "Sending..." : "Send"}
                    </button>
                </div>
            `;
		}
		if (props?.status === "completed" && props.answer) {
			return `
                <div>
                    <div>${escapeHTML(props?.question)}</div>
                    <br>
                    <div>
                       ${escapeHTML(props?.answer)}
                    </div>
                </div>
            `;
		}
		return `<div>Thread ended</div>`;
	}

	return "";
}

function handleSubmit(conversation, input, props) {
	const payload = {
		cId: props?.cId || props?.reqId,
		input: input,
		context: props?.context,
		messageId: conversation?.messageId,
	};
	BotConversation().submitBotResponse(payload);
}

function setupEventListeners(botConversation, props) {
	// Input handlers
	document.querySelectorAll(".bot-input").forEach((input) => {
		input.addEventListener("keydown", (event) => {
			if (event.keyCode === 13 && !event.shiftKey) {
				event.preventDefault();
				const messageId = event.target.dataset.messageId;
				const conversation = Object.values(botConversation).find(
					(conv) => conv.messageId === messageId
				);

				if (conversation) {
					handleSubmit(conversation, event.target.value, props);
					event.target.value = "";
				}
			}
		});
	});

	// Button handlers
	document.querySelectorAll(".send-button").forEach((button) => {
		button.addEventListener("click", (event) => {
			const messageId = event.target.dataset.messageId;
			const input = document.querySelector(
				`.bot-input[data-message-id="${messageId}"]`
			);
			const conversation = Object.values(botConversation).find(
				(conv) => conv.messageId === messageId
			);

			if (conversation && input) {
				handleSubmit(conversation, input.value, props);
				input.value = "";
			}
		});
	});
}

function setupTemplates(botConversation) {
	if (!isEmpty(botConversation)) {
		const templateConversations = Object.values(botConversation)?.filter(
			(conversation) => conversation?.hasOwnProperty("template_html")
		);

		if (templateConversations?.length) {
			templateConversations.forEach((conversation) => {
				const templateDiv = document.querySelector(
					`.botTemplate-${conversation?.messageId}`
				);
				if (templateDiv && conversation?.template_html) {
					templateDiv.appendChild(conversation.template_html);
				}
			});
		}
	}
}

function renderBotConversation(props) {
	const botConversation = props?.botConversation;

	if (!Object.values(botConversation || {})?.length) {
		return "";
	}

	const conversationsHTML = Object.values(botConversation)
		.map((conversation) => createConversationHTML(conversation, props))
		.join("");

	return `
        <div class="bot-conversation-wrapper">
            ${conversationsHTML}
        </div>
    `;
}

// Main function to be exported
export function render(props) {
	const html = renderBotConversation(props);
	let timer;
	timer = setTimeout(() => {
		setupEventListeners(props?.botConversation, props);
		setupTemplates(props?.botConversation);
	}, 1000);
	return html;
}
export default { render };
