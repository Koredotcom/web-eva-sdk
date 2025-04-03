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
export function render(data) {
	try {
		// Handle loading state
		if (data.loading) {
			return TemplateComponents.wrapTemplate(
				TemplateComponents.renderLoading(data),
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
			content += TemplateComponents.renderQuestionBubble(data);
		}

		// Render template content based on type
		content += renderTemplateContent(data);

		// if(data.sources.length > 0){
		// 	content += renderAnsFromChip(data);
		// }

		// Add feedback if supported
		if (supportsFeedback(data.templateType)) {
			content += feedbackTemplate.render(data);
		}

		return TemplateComponents.wrapTemplate(content, {
			type: data.templateType,
			id: data.id,
			className: data.className,
		});
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

export function renderTemplateContent(data) {
	switch (data.templateType) {
		case "resolve_ambiguity":
			return ambiguityTemplate.render(data);

		case "intent_ambiguity":
			return intentAmbiguityTemplate.render(data);

		case "action_send_email":
			return actionSendEmail.render(data);

		case "integrations_action_form":
			return integrationActionTemplate.render(data);

		case "interruption_template":
			return interruptionTemplate.render(data);

		case "gpt_form_template":
			return gptFormTemplate.render(data);

		case "action_send_slack_message":
			return actionSendSlackMessage.render(data);

		case "connection_provider":
		case "admin_config_action":
		case "error_message":
			return connectionProvider.render({
				...data,
				llm: data.templateType !== "connection_provider",
				error: data.templateType === "error_message",
			});

		case "agent_welcome_template":
			return agentWelcomeTemplate.render(data);

		case "search_answer":
		case "search_results":
			return searchAnswer.render(data);

		case "multi_intent_execution":
			return multiIntentExecution.render(data);

		case "multi_responses":
			return multiResponses.render(data);

		case "hold_conversation":
			return holdConversation.render(data);

		case "bot_template":
			return renderBotConversation(data);

		default:
			// Handle thread view or conversation
			if (data.thread || data.viewType === "threadView") {
				return renderBotConversation(data);
			}
			console.warn(`Unknown template type: ${data.templateType}`);
			return TemplateComponents.renderAnswerBubble(data);
	}
}

// export const renderAnsFromChip = (data) => {
// 	//On Hold
// 	return 
// }

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
