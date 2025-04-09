import BotConversation from "../chat/botAgent/getBotConversation.js";
import { isEmpty } from "lodash";
import store from "../redux/store";

class BotAgentTestComponent {
	constructor(props) {
		this.props = props;
		this.state = store.getState().global;
		this.input = "";
		this.botConversation = props?.question?.botConversation;
	}

	initialize() {
		this.setupTemplateConversations();
		return this.render();
	}

	setupTemplateConversations() {
		if (!isEmpty(this.botConversation)) {
			const templateConversations = Object.values(
				this.botConversation
			)?.filter((conversation) =>
				conversation?.hasOwnProperty("template_html")
			);

			if (templateConversations?.length) {
				templateConversations.forEach((c) => {
					const templateDiv = document.querySelectorAll(
						`.botTemplate-${c?.messageId}`
					);
					if (templateDiv?.[0]) {
						templateDiv[0].appendChild(c?.template_html);
					}
				});
			}
		}
	}

	changeInput(event) {
		this.input = event?.target?.value;
	}

	sendAnswer(conversation) {
		const payload = {
			cId: this.props?.question?.cId || this.props?.question?.reqId,
			input: this.input,
			context: this.props?.question?.context,
			messageId: conversation?.messageId,
		};
		BotConversation().submitBotResponse(payload);
	}

	handleKeyDown(event, conversation) {
		if (event.keyCode === 13 && !event.shiftKey) {
			event.preventDefault();
			this.sendAnswer(conversation);
			this.input = "";
			// Update the input field value
			event.target.value = "";
		}
	}

	createSearchAnswerElement(conversation) {
		const div = document.createElement("div");

		if (conversation?.status === "completed") {
			div.innerHTML = `
                <div>
                    ${conversation?.question}
                    <br>
                    <div>
                        <input type="text" value="${conversation?.answer}" readonly>
                    </div>
                </div>
            `;
		} else {
			const inputEl = document.createElement("input");
			inputEl.type = "text";
			inputEl.placeholder = "Enter bot response";
			inputEl.addEventListener("input", (e) => this.changeInput(e));
			inputEl.addEventListener("keydown", (e) =>
				this.handleKeyDown(e, conversation)
			);

			const button = document.createElement("button");
			button.textContent = conversation?.loading ? "Sending..." : "Send";
			button.addEventListener("click", () =>
				this.sendAnswer(conversation)
			);

			div.innerHTML = `<div>${conversation?.question}</div>`;
			div.appendChild(inputEl);
			div.appendChild(button);
		}

		return div;
	}

	render() {
		if (!Object.values(this.botConversation || {})?.length) {
			return null;
		}

		const container = document.createElement("div");

		Object.values(this.botConversation).forEach((conversation) => {
			if (
				conversation?.hasOwnProperty("template_html") ||
				conversation?.templateType === "hold_conversation"
			) {
				const templateDiv = document.createElement("div");
				templateDiv.className = `botTemplate-${conversation?.messageId}`;
				container.appendChild(templateDiv);
			} else if (conversation?.templateType === "search_answer") {
				container.appendChild(
					this.createSearchAnswerElement(conversation)
				);
			}
		});

		return container;
	}
}

export default function createBotAgentTestComponent(props) {
	const component = new BotAgentTestComponent(props);
	return component.initialize();
}
