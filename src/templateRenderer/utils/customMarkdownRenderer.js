import { marked } from "marked";
import DOMPurify from "dompurify";
// import { SHOELACE_ATTRS, SHOELACE_TAGS } from "./helper";

// Set marked config (v4+ compatible)
marked.use({
    gfm: true,
    breaks: true, // Enables line breaks with single newline
});

const customMarkdownRenderer = (text) => {
    if (!text) return "";

	// Convert markdown to HTML
	const cleanedMarkdown = text.replace(/^\s{2,}/gm, "");
	let rawHtml = marked.parse(cleanedMarkdown);
	rawHtml = rawHtml.replaceAll("<a", '<a target="_blank"');

	// Sanitize to prevent XSS (recommended)
	// Configured DOMPurify to allow target attribute on anchor tags
	const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
		ADD_ATTR: ['target']
	});

	return sanitizedHtml;
};

export default customMarkdownRenderer;