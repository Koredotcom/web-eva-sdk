import AmbiguityTemplateFunc from "../functionality/ambiguity-template";

export function render(data) {
	const ambiguous = data?.templateInfo?.ambiguous || [];

	const renderOptions = (el) =>
		(el?.value?.choices || [])
			.map((choice) => {
				const value = choice.value || choice.name;
				const label = choice.label || choice.name;
				return `<option value="${value}">${label}</option>`;
			})
			.join("");

	const renderSelects = ambiguous
		.map((el, index) => {
			const multiple = el?.value?.multi ? "multiple" : "";
			return `
				<div class="drpdwnboxclass">
					<div class="headerdropdowns" title="Tooltip for ${el.label}">${el.label}</div>
					<select id="resolve-ambiguity-select-${data?.id}" ${multiple}>
						${renderOptions(el)}
					</select>
				</div>
			`;
		})
		.join("");

	const html = `
		<div id="resolve-ambiguity-container-${data?.id}" class="resolve-ambiguity-container">
			<div class="threadName">${data?.answer || AmbiguityNameDisplayer()}</div>
			<div class="threadName">
				<div class="maildrpbox" id="ambquityDropdown">
					${renderSelects}
					<div class="amb-action-box" id="resolve-ambiguity-action-box-${data?.id}">
						<button class="amb-cancel-btn" id="resolve-ambiguity-cancel-btn-${data?.id}">Cancel</button>
						<button class="amb-confirm-btn" id="resolve-ambiguity-confirm-btn-${data?.id}">Confirm</button>
					</div>
				</div>
			</div>
		</div>
	`;

	let timer;
	clearTimeout(timer);
	timer = setTimeout(() => {
		AmbiguityTemplateFunc(data);
	}, 1000);

	return html;

	// Helper functions
	function AmbiguityNameDisplayer() {
		const names = ambiguous.map((item) => item?.label);
		if (names.length > 1) {
			return `There are conflicts on few inputs. Please confirm`;
		} else {
			return `We found more than one result for "${names[0]}". Please confirm.`;
		}
	}
}

export default { render };
