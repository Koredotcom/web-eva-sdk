import marked from "marked";
// import DOMPurify from "dompurify";
import { encodeHtml } from "../../utils/helpers"; // optional, if you still need it

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
	rawHtml = rawHtml.replace("<a", '<a target="_blank"');

	// Sanitize to prevent XSS (recommended)
	//   const sanitizedHtml = DOMPurify.sanitize(rawHtml);

	// Optionally encode HTML if needed by your system
	return encodeHtml ? encodeHtml(rawHtml) : rawHtml;
};

export default customMarkdownRenderer;
