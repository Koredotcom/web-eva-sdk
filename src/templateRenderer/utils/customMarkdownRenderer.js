import marked from "marked";
import DOMPurify from "dompurify";

// Set marked config
marked.setOptions({
	gfm: true,
	breaks: true, // Enables line breaks with single newline
	smartLists: true, // Fixes weird list formatting
	smartypants: false, // Disables curly quotes, etc.
});

const customMarkdownRenderer = (text) => {
	if (!text) return "";

	// Convert markdown to HTML
	const cleanedMarkdown = text.replace(/^\s{2,}/gm, "");
	let rawHtml = marked(cleanedMarkdown);
	rawHtml = rawHtml.replaceAll("<a", '<a target="_blank"');

	// Sanitize to prevent XSS (recommended)
	// Configured DOMPurify to allow target attribute on anchor tags
	const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
		ADD_ATTR: ['target']
	});

	return sanitizedHtml;
};

export default customMarkdownRenderer;
