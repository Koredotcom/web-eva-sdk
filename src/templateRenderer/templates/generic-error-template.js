import { encodeHtml } from "../utils/helper";

function render(data) {
	const { error = {} } = data;

	return `
        <div class="generic-error-template">
            <div class="error-content">
                <div class="error-icon">
                    ${renderErrorIcon()}
                </div>
                <div class="error-details">
                    <div class="error-message">
                        ${encodeHtml(error.message || "Something went wrong")}
                    </div>
                    ${
						error.code
							? `
                        <div class="error-code">
                            Error code: ${encodeHtml(error.code)}
                        </div>
                    `
							: ""
					}
                </div>
            </div>
        </div>
    `;
}

function renderErrorIcon() {
	return `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#F04438" stroke-width="2"/>
            <path d="M12 8V12" stroke="#F04438" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="#F04438"/>
        </svg>
    `;
}

export { render };
