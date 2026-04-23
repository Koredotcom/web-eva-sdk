// import BotConversation from "../chat/botAgent/getBotConversation.js"
import { isEmpty, cloneDeep } from "lodash";
import BotConversation from "../../chat/botAgent/getBotConversation";
import TemplateComponents from "./index";
import { encodeHtml } from "../../utils/helpers";
import customMarkdownRenderer from "../utils/customMarkdownRenderer";
import store from "../../redux/store";
import { updateChatData } from "../../redux/globalSlice";

function escapeHTML(str) {
	if (!str) return "";
	return str
		?.replace(/&/g, "&amp;")
		?.replace(/</g, "&lt;")
		?.replace(/>/g, "&gt;")
		?.replace(/"/g, "&quot;")
		?.replace(/'/g, "&#039;");
}

function renderUserQuestion(question, userIconTemplate, conversation) {
	if (question) {
		return `<div class="message-bubble question" id = "${conversation?.messageId}">
					<div class="message-content">
						<div class="message-text">${encodeHtml(question)}</div>
						${userIconTemplate ? userIconTemplate : ""}
					</div>
				</div>`;
	}
	return "";
}

function renderAssistantQuestion(conversation, assistantIconTemplate) {
	let question = conversation?.question;
	if(conversation?.template_html){
		question = conversation?.template_html;
	}
	return `<div class="bot-flex-wrapper answer-container">
				${assistantIconTemplate}
				<div class='answerCntr'>					
					<div class="assistant-question-container ${conversation?.status === 'completed' ? 'completed-assistant-question-container' : ''}">
						${question ? MessageRenderer(question) : ""}
					</div>
				</div>
			</div>`;
}

function renderConversationAgentIcon(data){
	return `
		<div class='bot-conversation-icon-block'>                                    
                                        <span class='icon-block'><img src=${data?.sources?.[0]?.icon || data?.agentIcon} alt="" /></span>
                                        <span class='bot-agent-name'>${data?.sources?.[0]?.title || data?.agentName}</span>                                        
        </div>
	`;
}

function createConversationHTML(
	conversation,
	props,
	assistantIconTemplate,
	userIconTemplate,
	loadingText
) {

	if (conversation?.status === "in-progress") {
		let content = "";		
		if (conversation?.templateType === "search_answer") {
			content += renderAssistantQuestion(conversation, assistantIconTemplate);			
			if (conversation?.answer) {
				content += `<br/>`;
				content += renderUserQuestion(
					conversation?.answer,
					userIconTemplate,
					conversation
				);
				content += `<br/>`;
			}
			if (conversation?.loading) {
				content += `<div class="message-bubble loading">
					<div class="bot-flex-wrapper">
						<div class="bot-icon-container">${assistantIconTemplate ? assistantIconTemplate : ""}</div>
						<div class="message-container"><div class="loading-text">${encodeHtml(loadingText)}</div></div>
					</div>
					<div class="min-view-container"></div>
			</div>`;
			}
		}	
		if (conversation?.templateType === "bot_template") {
			content += `
			<div class="bot-flex-wrapper">				
				${handleBotTemplates(conversation, props)}
			</div>
			`;
		}
		return content;
	} else {
		if (conversation?.templateType === "search_answer") {
			return `
                <div class="completed">
					${renderAssistantQuestion(conversation, assistantIconTemplate)}
					<br/>
					${renderUserQuestion(conversation?.answer, userIconTemplate, conversation)}
					<br/>
                </div>
            `;
		} 
		if (conversation?.templateType === "bot_template") {
			return `
			<div class="completed">
				<div class="bot-flex-wrapper">					
					${handleBotTemplates(conversation, props)}
				</div>
				${renderUserQuestion(conversation?.answer, userIconTemplate)}	
			</div>
			`;
		}

		// else if (conversation?.templateType === "bot_template") {
		// 	return `
		// 		<div class="bot-flex-wrapper-group">
		// 			${renderAssistantQuestion(conversation, assistantIconTemplate)}
		// 			<br/>
		// 			${renderUserQuestion(conversation?.answer, userIconTemplate)}
		// 			<br/>
		// 		</div>
		// 	`;
		// }
	}	
	return "";
}
/*this function returns the div id needed for the setUpTemplates function to render the template html based on the id */
function handleBotTemplates(conversation, props) {
	/*if the template_type is hold_conversation invoke holdConversationTemplate.render, else return the div id */
	if(conversation?.templateType === "hold_conversation"){
		return holdConversationTemplate.render(conversation);
	}
	return `
		<div class="bot-scroll-container">
			<div class="bot-template-container botTemplate-${conversation?.messageId}" style="${conversation?.status === "completed" ? "pointer-events: none" : ""}"></div>
		</div>
	`;
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

	// Expand/Collapse button handlers - FIXED VERSION
	document.querySelectorAll(".expandAreaBlock").forEach((button) => {
		button.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			
			const messageId = event.target.closest('.expandAreaBlock')?.dataset?.messageId;
			const isCollapsed = event.target.closest('.expandAreaBlock')?.dataset?.collapsed === "true";
			const contentDiv = document.querySelector(`.bot-conversation-content[data-message-id="${messageId}"]`);
			const summaryDiv = document.querySelector(`.bot-conversation-summary[data-message-id="${messageId}"]`);
			const expandBlock = event.target.closest('.expandAreaBlock');

			if (isCollapsed) {
				// Show full conversation
				contentDiv.style.display = "block";
				summaryDiv.style.display = "none";
				expandBlock.dataset.collapsed = "false";
				// Change icon to minimize
				expandBlock.innerHTML = `${MinimizeIcon({ size: 16, color: "#667085" })}`;
			} else {
				// Show summary (props?.answer)
				contentDiv.style.display = "none";
				summaryDiv.style.display = "block";
				expandBlock.dataset.collapsed = "true";
				// Change icon to maximize
				expandBlock.innerHTML = `${MaximizeIcon({ size: 16, color: "#667085" })}`;
			}
		});
	});
}

const renderQuickRepliesTemplate = (payload) => {
    const payloadText = payload?.text;
    const templateHTML = `
        <div class="usrsChipsList quickRepliesTemplate">
            <div class="title">${payloadText ? payloadText : ''}</div>
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
					if (!templateDiv.contains(conversation.template_html)) {
						templateDiv.appendChild(conversation.template_html);
					}
				}
			});
		}
	}
}

function setupToggleListener(props) {
	const toggleBtn = document.getElementById(`bot-toggle-${props?.messageId}`);
	if (toggleBtn && !toggleBtn.eventListenerAdded) {
		toggleBtn.addEventListener("click", () => {
			const questions = cloneDeep(store.getState().global?.questions);
			const key = props?.isTask ? props?.stepId : (props?.reqId || props?._id);
			if (key && questions[key]) {
				questions[key].isExpanded = !questions[key].isExpanded;
				store.dispatch(updateChatData(questions));
			}
		});
		toggleBtn.eventListenerAdded = true;
	}
}

function renderBotConversation(
	props,
	assistantIconTemplate,
	userIconTemplate,
	loadingText
) {
	const botConversation = props?.botConversation;

	if (!Object.values(botConversation || {})?.length && props?.status === 'in-progress') {
		return "";
	}

	let conversationsHTML = "";
	const hasThreads = Object.values(botConversation || {})?.length > 0;

	if(props?.status === 'completed' && props?.viewType === 'threadView' && !props?.isExpanded) {
		conversationsHTML = customMarkdownRenderer(`
			<div class="botTemplate-${props?.messageId}">
				${props?.answer}
			</div>
		`);
		if (hasThreads) {
			conversationsHTML += `<button class="bot-toggle-btn" id="bot-toggle-${props?.messageId}">Expand</button>`;
		}
	}else{
		conversationsHTML = Object.values(botConversation || {})
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

		if (props?.status === 'completed' && props?.viewType === 'threadView' && props?.isExpanded) {
			conversationsHTML += `<button class="bot-toggle-btn" id="bot-toggle-${props?.messageId}">Collapse</button>`;
		}
	}
	return `
		${renderConversationAgentIcon(props)}		
        <div class="bot-conversation-wrapper ${props?.status === 'completed' ? 'completed' : ''}" data-message-id="${props?.messageId} id="bot-conversation-wrapper">
		${conversationWithThoughts ? renderThoughts(conversationWithThoughts, props) : ""}
			<div class="bot-conversation-content-wrapper ${props?.status === 'completed' ? ' bot-conversation-completed' : ''}">
				<div class="expand-bot-conversation ${props?.status === 'completed' ? ' conversation-completed' : ''}">
				<div class="top-header">
					<div class="bot-conversation-icon-block">
						<span class="icon-block">
							<img src="${props?.sources?.[0]?.icon || props?.agentIcon}" alt="">
						</span>
						<span class="bot-agent-name">${props?.sources?.[0]?.title || props?.agentName}</span>
					</div>
					<div class="expandAreaBlock" data-message-id="${props?.messageId}" data-collapsed="false">
						${MinimizeIcon({ size: 16, color: "#667085" })}
					</div>
				</div>
				</div>
				<div class="bot-conversation-content" data-message-id="${props?.messageId}">
					${conversationsHTML}
				</div>
				<div class="bot-conversation-summary" data-message-id="${props?.messageId}" style="display: none;">
					${props?.answer ? MessageRenderer(props?.answer) : ''}
				</div>
			</div>		
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
	// Function to setup all thought toggles
	const setupAllThoughtToggles = () => {
		const conversations = Object.values(props?.botConversation || {});
		
		conversations.forEach(conversation => {
			if (conversation?.thoughts?.length > 0) {				
				setupThoughtsToggle(conversation?.messageId, conversation?.thoughts?.[conversation?.thoughts?.length - 1]?.thoughtTime);
			}
		});
	};

	// Try immediately first
	setupAllThoughtToggles();
	
	// Also try after DOM is more likely to be ready
	let timer;
	timer = setTimeout(() => {
		setupEventListeners(props?.botConversation, props);
		setupTemplates(props?.botConversation);
		setupToggleListener(props);
	}, 1000);
	
	// Also use MutationObserver to catch dynamically added elements
	if (typeof window !== 'undefined' && window.MutationObserver) {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType === 1) { // Element node
						// Check if added node is a thought wrapper or contains one
						if (node.classList?.contains('thought-wrapper') || node.querySelector?.('.thought-wrapper')) {
							setupAllThoughtToggles();
						}
					}
				});
			});
		});
		
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
		
		// Clean up observer after 10 seconds to avoid memory leaks
		setTimeout(() => observer.disconnect(), 10000);
	}
	return html;
}
export default { render , setupTemplates};
