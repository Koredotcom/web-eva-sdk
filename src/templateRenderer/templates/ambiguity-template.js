// import { encodeHtml } from "../utils/helper";
// import TemplateComponents from "./index";

export function render(data) {
	const { options, message } = data;

	return `
        <div class="ambiguity-resolver">
            <p class="message">${message}</p>
            <div class="options">
                ${options
					.map(
						(option, index) => `
                    <button class="ambiguity-option" 
                            data-value="${option.value}"
                            data-index="${index}">
                        ${option.label}
                    </button>
                `
					)
					.join("")}
            </div>
            <button class="confirm-btn" data-action="confirm" disabled>
                Confirm Selection
            </button>
        </div>
    `;
}

export default { render };
