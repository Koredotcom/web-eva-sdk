function attachEventHandlers(container) {
	// Copy button handlers
	container.querySelectorAll(".copy-btn").forEach((btn) => {
		btn.addEventListener("click", handleCopy);
	});

	// Template-specific handlers
	container.querySelectorAll("[data-action]").forEach((element) => {
		element.addEventListener("click", handleAction);
	});
}

function handleCopy(event) {
	const messageId =
		event.currentTarget.closest("[data-message-id]").dataset.messageId;
	// Copy logic
}

function handleAction(event) {
	const action = event.currentTarget.dataset.action;
	// Action handling logic
}

return {
	attachEventHandlers,
};
