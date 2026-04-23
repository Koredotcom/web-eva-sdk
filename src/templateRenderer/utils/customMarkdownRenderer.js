import marked from "marked";
import DOMPurify from "dompurify";
import ChatInterface from "../../chat/ChatInterface";

const escapeAttr = (str) =>
	String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const renderer = new marked.Renderer();

renderer.link = function (href, title, text) {
	try {
		const url = new URL(href, window.location.origin);
		const params = url.searchParams;
		if (params.get("action") === "downloadFile" && params.get("fileId") && params.get("resourceId")) {
			const fileId = escapeAttr(params.get("fileId"));
			const msgId = escapeAttr(params.get("resourceId"));
			const safeText = escapeAttr(text);
			return `<button class="file-download-btn" data-file-id="${fileId}" data-msg-id="${msgId}" data-label="${safeText}">📥 ${safeText}</button>`;
		}
	} catch {}
	const safeHref = escapeAttr(href);
	const safeTitle = title ? ` title="${escapeAttr(title)}"` : "";
	return `<a target="_blank" href="${safeHref}"${safeTitle}>${text}</a>`;
};

marked.setOptions({
	gfm: true,
	breaks: true,
	smartLists: true,
	smartypants: false,
	renderer,
});

const customMarkdownRenderer = (text) => {
    if (!text) return "";

	const cleanedMarkdown = text.replace(/^\s{2,}/gm, "");
	const rawHtml = marked(cleanedMarkdown);

	const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
		ADD_ATTR: ["target", "data-file-id", "data-msg-id", "data-label"],
		ADD_TAGS: ["button"],
	});

	return sanitizedHtml;
};

let handlerAttached = false;

const handleDownloadClick = async (e) => {
	const btn = e.target.closest(".file-download-btn");
	if (!btn || btn.disabled) return;

	const fileId = btn.dataset.fileId;
	const msgId = btn.dataset.msgId;
	const label = btn.dataset.label || btn.textContent;
	if (!fileId || !msgId) return;

	btn.disabled = true;
	btn.textContent = "Downloading...";

	try {
		const result = await ChatInterface().fetchSignedMediaURL({ msgId, fileId });
		const downloadUrl = result?.url || result?.signedUrl || result?.mediaUrl;
		if (!downloadUrl) {
			btn.disabled = false;
			btn.textContent = `${label}`;
			return;
		}

		const filename = result?.filename || label || "download";
		try {
			const res = await fetch(downloadUrl);
			const blob = await res.blob();
			const blobUrl = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = blobUrl;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(blobUrl);
		} catch {
			window.open(downloadUrl, "_blank");
		}
	} catch(error) {
		console.error("Error downloading file", error);
		btn.disabled = false;
		btn.textContent = `${label}`;
	}
};

if (!handlerAttached) {
	handlerAttached = true;
	document.addEventListener("click", handleDownloadClick);
}

export default customMarkdownRenderer;