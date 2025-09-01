// import BotConversation from "../chat/botAgent/getBotConversation.js"
import { isEmpty } from "lodash";
import BotConversation from "../../chat/botAgent/getBotConversation";
import TemplateComponents from "./index";
import { encodeHtml } from "../../utils/helpers";
import customMarkdownRenderer from "../utils/customMarkdownRenderer";
import { MessageRenderer } from "../../plugins/Markdown/message-renderer";
import { cheveronRightIcon } from "../icons-library";

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

function renderAssistantQuestion(conversation, assistantIconTemplate) {
	let question = conversation?.question;
	if(conversation?.template_html){
		question = conversation?.template_html;
	}
	return `<div class="bot-flex-wrapper">
				${assistantIconTemplate}
				<div class='answerCntr'>
					${conversation?.thoughts?.length > 0 && renderThoughts(conversation)}
					${question ? MessageRenderer(question) : ""}
				</div>
			</div>`;
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
			content = renderAssistantQuestion(conversation, assistantIconTemplate);			
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
			content += `<div class="message-bubble loading">
					<div class="bot-flex-wrapper">
						<div class="bot-icon-container">${assistantIconTemplate ? assistantIconTemplate : ""}</div>
						<div class="message-container"><div class="loading-text">${encodeHtml(loadingText)}</div></div>
					</div>
			</div>`;
		}
		return content;
	} else {
		if (conversation?.templateType === "search_answer") {
			return `
                <div class="completed">
					${renderAssistantQuestion(conversation, assistantIconTemplate)}
					<br/>
					${renderUserQuestion(conversation?.answer, userIconTemplate)}
					<br/>
                </div>
            `;
		} else if (conversation?.templateType === "bot_template") {
			return `
				<div class="bot-flex-wrapper-group">
					${renderAssistantQuestion(conversation, assistantIconTemplate)}
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

const renderThoughts = (conversation) => {
	const uniqueId = `thought-wrapper-${conversation?.messageId}`;
	const isCollapsed = conversation?.question?.length > 0;
	return `
		<div class='thought-wrapper ${isCollapsed ? 'collapsed' : 'expanded'}' id='${uniqueId}' data-toggle-thoughts>
			<span class='thoughts-header' id='thoughts-header-${conversation?.messageId}'>Thoughts ${isCollapsed ? `for ${conversation?.thoughts?.[conversation?.thoughts?.length - 1]?.thoughtTime} secs` : ''}</span>
			<span class='spanIcon'>${cheveronRightIcon({ size: 8, color: "#70707B" })}</span>
			<div class="expand-thoughts-container">
				${expandThoughts(conversation)}
			</div>
		</div>
	`;	
}

const expandThoughts = (conversation) => {
	let html = `
        <div class='query-response-flow-items'>
            ${conversation?.thoughts?.map((thought, index) => {
		return `
		<div class='thoughtsContent' key=${index} style="animation-delay: ${ index * 0.2 } s">
			<div class='thoughts-content-wrapper'> 
				<div class='border-line'></div>
				<div class='thought-text'>${thought?.content}</div>
				${!conversation?.hasOwnProperty('question') ? (index === conversation?.thoughts?.length - 1 ? `<div class='thought-loader-wrapper'>
					<div class='thought-loader'>Loading...</div>
				</div>`:''):''}
			</div>                                        
		</div>                    
                `;
	}).join('')}
        </div>
    `;
	return html;
}

const setupThoughtsToggle = (messageId, thoughtTime,  retryCount = 0 ) => {	
	const maxRetries = 10;
	const retryDelay = 500;	
	const thoughtWrapper = document.getElementById(`thought-wrapper-${messageId}`);
	
	if (!thoughtWrapper) {
		if (retryCount < maxRetries) {
			setTimeout(() => setupThoughtsToggle(messageId, thoughtTime, retryCount + 1), retryDelay);
			return;
		}
		return;
	}

	const toggleThoughts = (event, thoughtTime) => {
		event.preventDefault();
		event.stopPropagation();		
		const isCurrentlyCollapsed = thoughtWrapper.classList.contains('collapsed');
		const iconSpan = thoughtWrapper.querySelector('.spanIcon');
		const thoughtsHeader = document.getElementById(`thoughts-header-${messageId}`);
		if (isCurrentlyCollapsed) {
			try{
				thoughtWrapper.classList.remove('collapsed');
				thoughtWrapper.classList.add('expanded');			
				
				
				// Ensure icon rotation for expanded state (chevron down)
				if (iconSpan) {
					iconSpan.style.transform = 'rotate(90deg)';
					iconSpan.style.transition = 'transform 0.3s ease';
				}
				thoughtsHeader.textContent = `Thoughts`;
			}
			catch(error){
				console.log('error', error);
			}

		} else {
			thoughtWrapper.classList.remove('expanded');
			thoughtWrapper.classList.add('collapsed');
			/* update the thoughts header text */
			
			thoughtsHeader.textContent = `Thoughtsfor ${thoughtTime} secs`;
			
			// Ensure icon rotation for collapsed state (chevron right)
			if (iconSpan) {
				iconSpan.style.transform = 'rotate(0deg)';
				iconSpan.style.transition = 'transform 0.3s ease';
			}
		}
	};

	// Remove any existing listener first to prevent multiple listeners
	if (thoughtWrapper._toggleHandler) {
		thoughtWrapper.removeEventListener('click', thoughtWrapper._toggleHandler);
	}
	
	// Create and store the handler function
	thoughtWrapper._toggleHandler = (event) => toggleThoughts(event, thoughtTime);
	
	// Add click event listener with thoughtTime passed correctly
	thoughtWrapper.addEventListener('click', thoughtWrapper._toggleHandler);
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
		
		// Try again in case some elements were added later
		setupAllThoughtToggles();
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
export default { render , setupTemplates, setupThoughtsToggle };
