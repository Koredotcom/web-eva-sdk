// import BotConversation from "../chat/botAgent/getBotConversation.js"
import { isEmpty } from "lodash";
import BotConversation from "../../chat/botAgent/getBotConversation";
import TemplateComponents from "./index";
import { encodeHtml } from "../../utils/helpers";
import customMarkdownRenderer from "../utils/customMarkdownRenderer";
import { MessageRenderer } from "../../plugins/Markdown/message-renderer";

function escapeHTML(str) {
	if (!str) return "";
	return str
		?.replace(/&/g, "&amp;")
		?.replace(/</g, "&lt;")
		?.replace(/>/g, "&gt;")
		?.replace(/"/g, "&quot;")
		?.replace(/'/g, "&#039;");
}

function renderUserQuestion(question, userIconTemplate) {
	if (question) {
		return `<div class="message-bubble question">
					<div class="message-content">
						<div class="message-text">${encodeHtml(question)}</div>
						${userIconTemplate ? userIconTemplate : ""}
					</div>
				</div>`;
	}
	return "";
}

function renderAssistantQuestion(question, assistantIconTemplate) {
	if (question) {
		return `<div class="bot-flex-wrapper ss">
					${assistantIconTemplate}
					${MessageRenderer(question)}
				</div>`;
	}
}

function createConversationHTML(
	conversation,
	props,
	assistantIconTemplate,
	userIconTemplate,
	loadingText
) {
	if (
		conversation?.hasOwnProperty("template_html") ||
		conversation?.templateType === "hold_conversation"
	) {
		return customMarkdownRenderer(`
            <div class="botTemplate-${conversation?.messageId}"></div>
        `);
	}

	if (conversation?.status === "in-progress") {
		let content;

		if (conversation?.templateType === "search_answer") {
			content = renderAssistantQuestion(
				conversation?.question,
				assistantIconTemplate
			);
			if (conversation?.answer) {
				content += `<br/>`;
				content += renderUserQuestion(
					conversation?.answer,
					userIconTemplate
				);
				content += `<br/>`;
			}
		}
		if (conversation?.loading) {
			content += `<div class="message-bubble loading" >
					${assistantIconTemplate ? assistantIconTemplate : ""}
				<div class="loading-text">${encodeHtml(loadingText)}</div>   
			</div>`;
		}
		return content;
	} else {
		if (conversation?.templateType === "search_answer") {
			return `
                <div class="completed">
					${renderAssistantQuestion(conversation?.question, assistantIconTemplate)}
					<br/>
					${renderUserQuestion(conversation?.answer, userIconTemplate)}
					<br/>
                </div>
            `;
		} else if (conversation?.templateType === "bot_template") {
			return `
				<div class="bot-flex-wrapper-group">
					${renderAssistantQuestion(conversation?.template_html, assistantIconTemplate)}
					<br/>
					${renderUserQuestion(conversation?.answer, userIconTemplate)}
					<br/>
				</div>
			`; // add pointer events none
		}
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

const renderQuickRepliesTemplate = (payload) => {
    const payloadText = payload?.text;
    const templateHTML = `
        <div class="usrsChipsList quickRepliesTemplate">
            <div class="title">${payloadText}</div>
            ${payload?.quick_replies
                ?.map((data) => `<div class="userChip">${data?.title}</div>`)
                .join("")}
        </div>
    `;

    // Convert the string to a DOM element
    const templateFragment = document
        .createRange()
        .createContextualFragment(templateHTML);

    return templateFragment;
};
export function setupTemplates(botConversation) {
	
	if (!isEmpty(botConversation)) {
		const templateConversations = Object.values(botConversation)?.filter(
			(conversation) => conversation?.hasOwnProperty("template_html")
		);

		if (templateConversations?.length) {
			templateConversations.forEach((conversation) => {
				if(conversation?.templateType === "bot_template" && conversation?.content?.payload?.template_type === "quick_replies"){
					if (!conversation.template_html?.querySelector(".quickRepliesTemplate"))
					  conversation.template_html?.appendChild(renderQuickRepliesTemplate(conversation?.content?.payload))
				}
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

function renderBotConversation(
	props,
	assistantIconTemplate,
	userIconTemplate,
	loadingText
) {
	const botConversation = props?.botConversation;

	if (!Object.values(botConversation || {})?.length) {
		return "";
	}

	let conversationsHTML = "";

	if(props?.status === 'completed' && props?.viewType === 'threadView') {
		conversationsHTML = customMarkdownRenderer(`
			<div class="botTemplate-${props?.messageId}">
				${props?.answer}
			</div>
		`);
	}else{
		conversationsHTML = Object.values(botConversation)
		.map((conversation) =>
			createConversationHTML(
				conversation,
				props,
				assistantIconTemplate,
				userIconTemplate,
				loadingText
			)
		)
		.join("");

	}
	return `
        <div class="bot-conversation-wrapper">
            ${conversationsHTML}
        </div>
    `;
}

// Main function to be exported
export function render(
	props,
	assistantIconTemplate,
	userIconTemplate,
	loadingText
) {
	const html = renderBotConversation(
		props,
		assistantIconTemplate,
		userIconTemplate,
		loadingText
	);
	let timer;
	timer = setTimeout(() => {
		setupEventListeners(props?.botConversation, props);
		setupTemplates(props?.botConversation);
	}, 1000);
	return html;
}
export default { render , setupTemplates };
