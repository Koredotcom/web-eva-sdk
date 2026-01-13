import { marked } from "marked";
import { encodeHtml } from "../../utils/helpers"; // optional, if you still need it
import DOMPurify from "dompurify";
import { SHOELACE_ATTRS, SHOELACE_TAGS } from "./helper";



// Set marked config (v4+ compatible)
marked.setOptions({
    gfm: true,
    breaks: true, // Enables line breaks with single newline
});

const customMarkdownRenderer = (text) => {
    if (!text) return "";

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
};

export default customMarkdownRenderer;