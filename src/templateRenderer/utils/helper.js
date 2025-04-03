function validateInput(templateType, data) {
	if (!templateType || typeof templateType !== "string") {
		throw new Error("Template type must be a string");
	}

	if (!data || typeof data !== "object") {
		throw new Error("Template data must be an object");
	}
}

export const encodeHtml = (str) => {
	if (!str) return "";
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
};

// return {
// 	validateInput,
// 	encodeHtml,
// };
