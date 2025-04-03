import { encodeHtml } from "../utils/helper";

function render(data) {
	return `
        <div class="search-answer-container">
            ${renderSearchInfo(data)}
            ${renderAnswer(data)}
            ${renderSources(data)}
        </div>
    `;
}

function renderSearchInfo(data) {
	if (!data.suggestion) return "";

	return `
        <div class="generating-answer-block">
            <div class="generating-answer-block-item">
                <div class="icon">
                    <svg class="tick-mark" width="18" height="18">
                        <path d="M15 4.5L6.75 12.75L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="msg">Searching for: <span>${encodeHtml(
					data.suggestion
				)}</span></div>
            </div>
        </div>
    `;
}

function renderAnswer(data) {
	if (!data.answer) return "";

	return `
        <div id="answer-${data.id}" class="threadName maxLength">
            ${data.answer}
        </div>
    `;
}

function renderSources(data) {
	if (!data.sources?.length) return "";

	return `
        <div class="sources-container">
            <div class="sources-list">
                ${data.sources
					.map(
						(source) => `
                    <div class="source-item">
                        <a href="${encodeHtml(
							source.url
						)}" target="_blank" rel="noopener noreferrer">
                            ${encodeHtml(source.title)}
                        </a>
                    </div>
                `
					)
					.join("")}
            </div>
        </div>
    `;
}

export { render };
