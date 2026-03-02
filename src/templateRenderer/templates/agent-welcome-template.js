import AgentWelcomeFunc from "../functionality/agent-welcome-template";
import { agentThreadIcon } from "../icons-library";
import { encodeHtml } from "../utils/helper";
import TemplateComponents from "./index";

export function render(item) {
	const suggestions = item?.templateInfo?.suggestions?.[0];
	const utterances = suggestions?.utterances || [];

	const utteranceHtml = utterances
		.map((utterance, i) => {
			return `
				<div class="chipone" id="awt-${item?.id}-${i}">
					<div class="leftBlock">
						<span class="tickmarkicon">
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="9" viewBox="0 0 12 9" fill="none">
							<path d="M11.3317 0.665039L3.99837 7.99837L0.665039 4.66504" stroke="#12B76A" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</span>
						<span class="newtext" key="${i}">
							<span class="newtext-label">${utterance?.label}</span>
							<span class="newtext-line"></span>
						</span>
					</div>
					${
						item?.utterances?.isNew
							? `
						<div class="rightBlock">
							<div class="rbText">New</div>
						</div>`
							: ""
					}
				</div>
			`;
		})
		.join("");

	const html = `
		<div class="answerCntr">
			<div class="threadName maxLength">${item?.answer || ""}</div>
			<div class="threadName maxLength">
				<div class="Answerschip msutteranceChip">
					<div class="ansdocwrap">
						<div class='chipheadericon'>
							${agentThreadIcon()}
						</div>
						<div class="chipheadertype">${suggestions?.title || ""}</div>
					</div>
					<div class="mulanschip">
						${utteranceHtml}
					</div>
				</div>
			</div>
		</div>
	`;

	setTimeout(() => {
		AgentWelcomeFunc(item);
	}, 1000);

	return html;
}

export default { render };
