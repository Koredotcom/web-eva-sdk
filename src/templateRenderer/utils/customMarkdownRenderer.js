import marked from "marked";
import DOMPurify from "dompurify";
import { SHOELACE_ATTRS, SHOELACE_TAGS } from "./helper";



// Set marked config
marked.setOptions({
    gfm: true,
    breaks: true, // Enables line breaks with single newline
    smartLists: true, // Fixes weird list formatting
    smartypants: false, // Disables curly quotes, etc.
});

const customMarkdownRenderer = (text) => {
    if (!text) return "";

<<<<<<< HEAD
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
=======
    // Convert markdown to HTML
    const cleanedMarkdown = text.replace(/^\s{2,}/gm, "");
    let rawHtml = marked(cleanedMarkdown);
    rawHtml = rawHtml.replace("<a", '<a target="_blank"');

    // Sanitize to prevent XSS (recommended)
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: SHOELACE_TAGS,
        ADD_ATTR: SHOELACE_ATTRS,
    });

    return encodeHtml ? encodeHtml(sanitizedHtml) : sanitizedHtml;
>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
};

export default customMarkdownRenderer;