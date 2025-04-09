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
