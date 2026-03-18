import marked from "marked";
import DOMPurify from "dompurify";
import ChatInterface from "../../chat/ChatInterface";

const renderer = new marked.Renderer();

renderer.link = function (href, title, text) {
	try {
		const url = new URL(href, window.location.origin);
		const params = url.searchParams;
		if (params.get("action") === "downloadFile" && params.get("fileId") && params.get("resourceId")) {
			const fileId = params.get("fileId");
			const msgId = params.get("resourceId");
			const safeText = text.replace(/"/g, "&quot;");
			return `<button class="file-download-btn" data-file-id="${fileId}" data-msg-id="${msgId}" data-label="${safeText}">📥 ${text}</button>`;
		}
	} catch {}
	return `<a target="_blank" href="${href}"${title ? ` title="${title}"` : ""}>${text}</a>`;
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

document.addEventListener("click", async (e) => {
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
		if (!downloadUrl) return;

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
		btn.textContent = `📥 ${label}`;
	}
});

export default customMarkdownRenderer;
