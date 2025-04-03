// const { encodeHtml } = require('../utils/helper');

import { encodeHtml } from "../utils/helper";

function render(data) {
	const { responses = [], status, streamingStatus } = data;

	return `
        <div class="multi-responses-template ${status || ""}">
            <div class="multiResponseWrapper">
                ${responses
					.map((response, index) => renderResponse(response, index))
					.join("")}
            </div>
            ${renderStreamingStatus(streamingStatus)}
        </div>
    `;
}

function renderResponse(response, index) {
	return `
        <div class="responseWrapper ${
			response.status === "completed" ? "completed" : ""
		}">
            <div class="multiResponseHeader">Response ${index + 1}</div>
            <div class="multiResponseAnswer">
                ${response.answer ? encodeHtml(response.answer) : ""}
            </div>
            <div class="lineBreak"></div>
        </div>
    `;
}

function renderStreamingStatus(status) {
	if (status === "aborted") {
		return `<div class="abortedMsg">You interrupted the response generation</div>`;
	}
	return "";
}

export { render };
