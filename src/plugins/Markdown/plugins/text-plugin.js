// Register JSON highlighting
// hljs.registerLanguage('json', window.hljsJson);
// hljs.highlightAll();

import marked from "marked";

// function isJson(text) {
//     try {
//         JSON.parse(text);
//         return true;
//     } catch {
//         return false;
//     }
// }

function formatContent(content) {
    return content
      ?.replace(/\\n/g, '\n') // Replace literal \n with actual newlines
      ?.replace(/\\([\\"])/g, '$1'); // Replace escaped backslashes and quotes
}

marked.setOptions({
    gfm: true,
    breaks: true, // Enables line breaks with single newline
    smartLists: true, // Fixes weird list formatting
    smartypants: false, // Disables curly quotes, etc.
});

export const textPlugin = {
    name: 'text',
    priority: 1,
    canHandle: () => true,
    render: content => {
        const formattedContent = formatContent(content);

        // Use Marked to parse Markdown into HTML
        const html = marked(formattedContent);

        return html;
    },
};
