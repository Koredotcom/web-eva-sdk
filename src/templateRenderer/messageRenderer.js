import * as TemplateComponents from "./templates";
import * as ambiguityTemplate from "./templates/ambiguity-template";
import * as intentAmbiguityTemplate from "./templates/intent-ambiguity-template";
import * as gptFormTemplate from "./templates/gpt-form-template";
import * as actionSendEmail from "./templates/action-send-email";
import * as actionSendSlackMessage from "./templates/action-send-slack-message";
import * as connectionProvider from "./templates/connection-provider";
import * as agentWelcomeTemplate from "./templates/agent-welcome-template";
import * as interruptionTemplate from "./templates/interruption-template";
import * as searchAnswer from "./templates/search-answer";
import * as integrationActionTemplate from "./templates/integrations-action-template";
import * as multiIntentExecution from "./templates/multi-intent-execution-template";
import * as multiResponses from "./templates/multi-responses-template";
import * as holdConversation from "./templates/hold-conversation-template";
import * as errorMessage from "./templates/error-message-template";
import * as genericErrorTemplate from "./templates/generic-error-template";
import * as feedbackTemplate from "./templates/feedback-template";
import { encodeHtml } from "./utils/helper";
import { convertTemplateToHtml } from "../utils/helpers";
import botConversation from "./templates/bot-conversation";
// import customMarkdownRenderer from "./utils/customMarkdownRenderer";
export function render(
	data,
	{ assistantIconTemplate, userIconTemplate, loadingText }
) {
	try {
		// Handle loading state
		if (data?.loading) {
			return TemplateComponents.wrapTemplate(
				TemplateComponents.renderLoading(
					data,
					assistantIconTemplate,
					loadingText,
					userIconTemplate
				),
				{ type: "loading", id: data.id }
			);
		}

		// Handle error state
		if (data.error) {
			return TemplateComponents.wrapTemplate(errorMessage.render(data), {
				type: "error",
				id: data.id,
			});
		}

		let content = "";

		// Add question bubble if needed
		if (data.question && shouldShowQuestion(data.templateType)) {
			content += TemplateComponents.renderQuestionBubble(
				data,
				userIconTemplate
			);
		}

		// Render template content based on type
		content += (
			renderTemplateContent(data, assistantIconTemplate)
		);

		let ele = TemplateComponents.wrapTemplate(content, {
			type: data.templateType,
			id: data.id,
			className: data.className,
		});
		return ele;
	} catch (error) {
		console.error("Error rendering message:", error);
		return genericErrorTemplate.render({
			error: {
				message: "Failed to render message",
				code: "RENDER_ERROR",
			},
		});
	}
}

export function renderTemplateContent(data, assistantIconTemplate) {
	let htmlTemplate = "";
	if (data.viewType === "threadView") {
		htmlTemplate = botConversation.render(data);
	} else {
		switch (data.templateType) {
			case "resolve_ambiguity":
				htmlTemplate = ambiguityTemplate.render(data);
				break;

			case "intent_ambiguity":
				htmlTemplate = intentAmbiguityTemplate.render(data);
				break;

			case "action_send_email":
				htmlTemplate = actionSendEmail.render(data);
				break;

			case "integrations_action_form":
				htmlTemplate = integrationActionTemplate.render(data);
				break;

			case "interruption_template":
				htmlTemplate = interruptionTemplate.render(data);
				break;

			case "gpt_form_template":
				htmlTemplate = gptFormTemplate.render(data);
				break;

			case "action_send_slack_message":
				htmlTemplate = actionSendSlackMessage.render(data);
				break;

			case "connection_provider":
			case "admin_config_action":
			case "error_message":
				htmlTemplate = connectionProvider.render({
					...data,
					llm: data.templateType !== "connection_provider",
					error: data.templateType === "error_message",
				});
				break;

			case "agent_welcome_template":
				htmlTemplate = agentWelcomeTemplate.render(data);
				break;
			// case "bot_template":
			// 	console.log("bottttt", data.template_html);
			// 	htmlTemplate = renderBotConversation(data);
			// 	break;

			case "search_answer":
			case "search_results":
				htmlTemplate = searchAnswer.render(data);
				break;

			case "multi_intent_execution":
				htmlTemplate = multiIntentExecution.render(data);
				break;

			case "multi_responses":
				htmlTemplate = multiResponses.render(data);
				break;

			case "hold_conversation":
				htmlTemplate = holdConversation.render(data);
				break;

			default:
				// Handle thread view or conversation
				if (data.thread || data.viewType === "threadView") {
					htmlTemplate = renderBotConversation(data);
				}
				console.warn(`Unknown template type: ${data.templateType}`);
				htmlTemplate = TemplateComponents.renderAnswerBubble(data);
		}
	}
	// Add feedback if supported
	// if (supportsFeedback(data.templateType)) {
	// 	htmlTemplate += feedbackTemplate.render(data);
	// }
	return `<div class="message-bubble answer"> ${
		assistantIconTemplate ? assistantIconTemplate : ""
	} <div class="answerCntr">${htmlTemplate}</div>
	</div>`;
}

export function renderBotConversation(data) {
	let content = "";

	// Show transfer message for thread conversations
	if (
		data.thread &&
		data.sources?.[0]?.title &&
		data.status !== "terminated"
	) {
		content += `
            <div class='generating-answer-block mb-30'>
                <div class='generating-answer-block-item'>
                    <div class='icon'>
                        ${TemplateComponents.renderIcon("TickMark", {
							size: 18,
						})}
                    </div>
                    <div class='msg'>
                        <span>${encodeHtml(
							`Transferring to: "${data.sources[0].title}" agent`
						)}</span>
                    </div>
                </div>
            </div>
        `;
	}

	if (data.status === "terminated") {
		return `
            <div class="threadName">
                I see you interrupted the answer generation. Please feel free to provide more details or let me know how can I assist you further
            </div>
        `;
	}

	return content;
	// + TemplateComponents.renderBotConversation(data);
}

export function shouldShowQuestion(templateType) {
	const noQuestionTemplates = [
		"hold_conversation",
		"error_message",
		"agent_welcome",
		"generic_error",
	];
	return !noQuestionTemplates.includes(templateType);
}

export function supportsFeedback(templateType) {
	const feedbackTemplates = ["search_answer", "multi_responses", "gpt_form"];
	return feedbackTemplates.includes(templateType);
}

// Create a default export object for backward compatibility
const MessageRenderer = {
	render,
	renderTemplateContent,
	renderBotConversation,
	shouldShowQuestion,
	supportsFeedback,
};

export default MessageRenderer;
