import marked from "marked";

// ✅ JSON check helper
function isJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

// ✅ Pretty JSON viewer
function renderJsonViewer(data) {
  return `<pre style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify(
    data,
    null,
    2
  )}</pre>`;
}

function formatContent(content) {
  if (!content) return "";

  let formatted = content.replace(/\\n/g, "\n");
  formatted = formatted.replace(/\\([\\"])/g, "$1");
  // Only fix list items that are stuck on the same line when they appear at line starts.
  // This avoids breaking markdown tables that may contain "-" cells inside rows.
  formatted = formatted.replace(/(^|\n)(\d+\.\s+[^\n]*?)(?=(\n)?\d+\.\s+)/g, "$1$2\n");
  formatted = formatted.replace(/(^|\n)(-\s+[^\n]*?)(?=(\n)?-\s+)/g, "$1$2\n");

  return formatted;
}

const renderer = new marked.Renderer();

// --- Code blocks (with JSON handling) ---
renderer.code = function (code, language) {
  if (language === "json" || isJson(code)) {
    try {
      return renderJsonViewer(JSON.parse(code));
    } catch {
      return `<pre><code>${code}</code></pre>`;
    }
  }
  return `<pre><code>${code}</code></pre>`;
};

// --- Inline code ---
renderer.codespan = function (code) {
  return `<code>${code}</code>`;
};

// --- UL / OL ---
renderer.list = function (body, ordered) {
  if (ordered) {
    return `<ol style="padding:0px 0px 0px 20px; list-style:decimal;">${body}</ol>`;
  }
  return `<ul style="padding:0px 0px 0px 20px; list-style:disc;">${body}</ul>`;
};

// --- LI ---
renderer.listitem = function (text) {
  return `<li style="list-style:inherit; margin-bottom:0.5rem;">${text}</li>`;
};

// --- Links ---
renderer.link = function (href, title, text) {
  // Marked passes the link label as `text`. We treat it as a "markdown link" (apply special-link)
  // only when the visible label is meaningfully different from the href, e.g. [Google](https://google.com).
  //
  // NOTE: href is often normalized by Marked (e.g., adding https://), so a plain URL label like
  // "example.com" should NOT be considered a markdown link even though text !== href.
  const decodeEntities = (value) =>
    String(value ?? "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  const stripTags = (value) => String(value ?? "").replace(/<[^>]*>/g, "");

  const normalizeUrlLike = (value) => {
    const v = String(value ?? "").trim();
    // Remove scheme + trailing slash for comparison against displayed URL text
    return v.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  };

  const isProbablyUrlText = (value) => {
    const v = String(value ?? "").trim();
    // Accept: example.com, www.example.com/path, https://example.com?a=b, mailto:user@x.com, etc.
    return (
      /^(https?:\/\/|mailto:|tel:)/i.test(v) ||
      /^[\w.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(v) ||
      /^www\.[\w.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(v)
    );
  };

  const textPlain = decodeEntities(stripTags(text)).trim();
  const hrefPlain = String(href ?? "").trim();

  const hrefComparable = normalizeUrlLike(hrefPlain);
  const textComparable = normalizeUrlLike(textPlain);

  const isTextEssentiallyHref =
    textPlain === hrefPlain ||
    textComparable === hrefComparable ||
    (hrefPlain.toLowerCase().startsWith("mailto:") && textPlain === hrefPlain.slice(7)) ||
    (hrefPlain.toLowerCase().startsWith("tel:") && textPlain === hrefPlain.slice(4)) ||
    // Marked may normalize scheme; treat "example.com" label as same as "https://example.com"
    (isProbablyUrlText(textPlain) && textComparable === hrefComparable);

  const isMarkdownLink = !isTextEssentiallyHref;
  const classAttr = ` class="${isMarkdownLink ? "special-link" : "normal-link"}"`;

  // Avoid embedding href directly into onclick (quote escaping/XSS risk).
  return `<a href="${href}" target="_blank" rel="noopener noreferrer"${classAttr} onclick="event.preventDefault(); window.open(this.href,'_blank');">${text}</a>`;
};

// --- Images ---
renderer.image = function (href, title, text) {
  const titleAttr = title ? ` title="${title}"` : '';
  const altAttr = text ? ` alt="${text}"` : '';
  return `<img src="${href}"${titleAttr}${altAttr} style="max-width: 100%; max-height: 400px; height: auto; object-fit: contain; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />`;
};

// --- Tables ---
renderer.table = function (header, body) {
  return `<div class="table-wrapper"><table class="markdown-table">${header}${body}</table></div>`;
};

// ✅ Use setOptions (v2 API)
marked.setOptions({
  gfm: true,
  breaks: true,
  smartLists: true,
  smartypants: false,
  renderer,
});

export const textPlugin = {
  name: "text",
  priority: 1,
  canHandle: () => true,
  render: (content) => {
    const formattedContent = formatContent(content);
    return marked(formattedContent); // ✅ v2 API
  },
  renderText: (content) => {
    if (!content) return "";
    const formatted = formatContent(content);

    const tempElement = document.createElement("div");
    tempElement.innerHTML = formatted;
    return tempElement.textContent || tempElement.innerText || "";
  },
};
