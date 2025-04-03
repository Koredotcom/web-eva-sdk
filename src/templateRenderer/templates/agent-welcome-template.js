import AgentWelcomeFunc from "../functionality/agent-welcome-template";
import { encodeHtml } from "../utils/helper";
import TemplateComponents from "./index";

export function render(item) {
	// const { agentName, description, item } = data;

	const entirediv = document.createElement("div");

	const div1 = document.createElement("div");
	div1.className = "threadName maxLength";
	div1.textContent = item?.answer;
	const div2 = document.createElement("div");
	div2.className = "threadName maxLength";

	const answersChip = document.createElement("div");
	answersChip.className = "Answerschip msutteranceChip";
	const ansDocWrap = document.createElement("div");
	ansDocWrap.className = "ansdocwrap";

	const chipHeaderType = document.createElement("div");
	chipHeaderType.className = "chipheadertype";
	chipHeaderType.textContent = item?.templateInfo?.suggestions?.[0]?.title;

	ansDocWrap.appendChild(chipHeaderType);
	answersChip.appendChild(ansDocWrap);

	const mulAnsChip = document.createElement("div");
	mulAnsChip.className = "mulanschip";

	item?.templateInfo?.suggestions?.[0]?.utterances?.forEach(
		(utterance, i) => {
			const chipOne = document.createElement("div");
			chipOne.className = "chipone";
			chipOne.id = `awt-${item?.id}-${i}`;
			// chipOne.onclick = () => InvokeGptAgentTemplate({ item, utterance });

			const leftBlock = document.createElement("div");
			leftBlock.className = "leftBlock";

			const span = document.createElement("span");
			span.className = "newtext";
			span.textContent = utterance?.label;
			span.setAttribute("key", i);

			leftBlock.appendChild(span);
			chipOne.appendChild(leftBlock);

			if (item?.utterances?.isNew) {
				const rightBlock = document.createElement("div");
				rightBlock.className = "rightBlock";

				const rbText = document.createElement("div");
				rbText.className = "rbText";
				rbText.textContent = "New";

				rightBlock.appendChild(rbText);
				chipOne.appendChild(rightBlock);
			}

			mulAnsChip.appendChild(chipOne);
		}
	);

	answersChip.appendChild(mulAnsChip);
	div2.appendChild(answersChip);

	entirediv.appendChild(div1);
	entirediv.appendChild(div2);

	setTimeout(() => {
		AgentWelcomeFunc(item);
	}, 1000);

	return entirediv.innerHTML;
}

export default { render };
