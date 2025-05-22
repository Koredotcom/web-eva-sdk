// import marked from "marked";
import React from "react";
import { encodeHtml } from "../../utils/helpers";

const customMarkdownRenderer = (text) => {
	// Split the input text by newline to handle multiple lines
	let lines = text?.split("\n");

	// Create a container to hold the resulting elements
	let container = document?.createElement("div");

	container.classList.add("box-group-box");

	// Variables to keep track of the current list type
	let ul = null;
	let ol = null;

	// Loop through each line
	if (lines?.length) {
		lines.forEach((line) => {
			let trimmedLine = line?.trim();

			// Check if the line starts with a hyphen (unordered list)
			if (trimmedLine.startsWith("-")) {
				trimmedLine = trimmedLine.replace(
					/\*([^*]+)\*/g,
					"<strong>$1</strong>"
				);
				// Create a new unordered list item element
				let li = document.createElement("li");
				li.textContent = trimmedLine.substring(1).trim();
				li.style.listStyleType = "disc";

				// If there's an active ordered list, append it to the container and reset
				if (ol && ol.childNodes.length > 0) {
					container.appendChild(ol);
					ol = null;
				}

				// If there's no active unordered list, create a new one
				if (!ul) {
					ul = document.createElement("ul");
					ul.style.padding = "0px 0px 0px 40px";
					ul.style.listStyleType = "disc";
				}

				// Append the list item to the unordered list
				ul.appendChild(li);

				// Check if the line starts with a digit followed by a dot (ordered list)
			} else if (/^\d+\./.test(trimmedLine)) {
				trimmedLine = trimmedLine.replace(
					/\*([^*]+)\*/g,
					"<strong>$1</strong>"
				);
				// Create a new ordered list item element
				let li = document.createElement("li");
				li.textContent = trimmedLine.replace(/^\d+\./, "").trim();

				// If there's an active unordered list, append it to the container and reset
				if (ul && ul.childNodes.length > 0) {
					container.appendChild(ul);
					ul = null;
				}

				// If there's no active ordered list, create a new one
				if (!ol) {
					ol = document.createElement("ol");
					ol.style.padding = "0px 0px 0px 40px";
					ol.style.listStyleType = "decimal";
				}

				// Append the list item to the ordered list
				ol.appendChild(li);

				// Handle plain text lines
			} else {
				// Append any active lists to the container
				if (ul && ul.childNodes.length > 0) {
					container.appendChild(ul);
					ul = null;
				}
				if (ol && ol.childNodes.length > 0) {
					container.appendChild(ol);
					ol = null;
				}

				trimmedLine = trimmedLine.replace(
					/\*([^*]+)\*/g,
					"<strong>$1</strong>"
				);

				// trimmedLine = marked(trimmedLine);
				// Append the plain text line to the container
				let textNode = document.createTextNode(trimmedLine);
				container.appendChild(textNode);
				//container.appendChild(document.createElement('br')); // Add a line break for visual separation
			}
		});
	}

	// Append any remaining active lists to the container
	if (ul && ul.childNodes.length > 0) {
		container.appendChild(ul);
	}
	if (ol && ol.childNodes.length > 0) {
		container.appendChild(ol);
	}
	// Return the container element's outerHTML
	// let nodeElement = document.createElement('div')
	// nodeElement.innerHTML = container.innerHTML
	let botText = container.outerHTML;
	return encodeHtml(botText);
};

export default customMarkdownRenderer;
