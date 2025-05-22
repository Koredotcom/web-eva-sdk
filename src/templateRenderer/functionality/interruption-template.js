import {
	cancelAdvanceSearch,
	InitiateChatConversationAction,
} from "../../chat";

const InterruptionTemplateFunc = (data) => {
	const continueAction = (actionId = null) => {
		let selectedChoices = {};
		let textareaValue = "";

		const interruptionFields = data?.templateInfo?.interruptionFields;
		let selectedIndex;
		interruptionFields?.forEach((option) => {
			if (
				option?.value?.type === "checkbox" ||
				option?.value?.type === "nestedCheckbox"
			) {
				const selectedValues = [];
				option?.value?.choices?.forEach((choice) => {
					const mainCheckbox = document.getElementById(
						`binary-${choice.id}`
					);
					if (mainCheckbox?.checked) {
						let obj = {
							id: choice?.id,
							label: choice?.label,
							isFieldMulti: option?.value?.multi,
						};
						selectedValues.push(obj);
					}

					let subchoices = [];
					let getSubChoices = !!selectedValues?.find(
						(item) => item.id === choice?.id
					);
					let getIndex = selectedValues?.findIndex(
						(item) => item.id === choice?.id
					);

					if (
						choice?.nested?.value?.type === "checkbox" &&
						getSubChoices
					) {
						selectedValues[getIndex].customType =
							choice?.nested?.key;
						choice?.nested?.value?.choices?.forEach((subChoice) => {
							const subCheckbox = document.getElementById(
								`binary-${choice.id}-${subChoice.id}`
							);
							if (subCheckbox?.checked) {
								let obj = {
									id: subChoice?.id,
									label: subChoice?.label,
								};
								subchoices.push(obj);
							}
							selectedValues.find(
								(item) => item.id === choice?.id
							).nestedChoices = subchoices;
						});
					}

					if (
						choice?.nested?.value?.type === "dropdown" &&
						getSubChoices
					) {
						selectedValues[getIndex].customType =
							choice?.nested?.key;
						choice?.nested?.value?.choices?.forEach((subChoice) => {
							const subCheckbox = document.getElementById(
								`binary-${choice.id}-${subChoice.id}`
							);
							if (subCheckbox?.checked) {
								let obj = {
									id: subChoice?.id,
									label: subChoice?.label,
								};
								subchoices.push(obj);
							}
							selectedValues.find(
								(item) => item.id === choice?.id
							).nestedChoices = subchoices;
						});
					}
				});

				selectedChoices[option?.key] = selectedValues;
			} else if (
				option?.value?.type === "dropdown" &&
				option?.dynamic === true
			) {
				//Not in use currently
			} else if (
				option?.value?.type === "text" ||
				option?.value?.type === "number"
			) {
				let inputValue = document.getElementById(
					`inputValue-${option?.key}`
				)?.value;
				if (inputValue) {
					let obj = {
						label: inputValue,
						isFieldMulti: option?.value?.multi || false,
					};
					selectedChoices[option?.key] = [obj];
				}
			} else if (option?.value?.type === "groupedCheckbox") {
				option?.value?.groups?.forEach((group, index) => {
					const checkboxGroup = document.querySelector(
						`input[name="radio-${option.key}"]:checked`
					);
					selectedIndex = Number(checkboxGroup.getAttribute("value"));
					selectedChoices[option.key] = [
						group.choices[selectedIndex],
					];
				});
			} else if (option?.value?.type === "date") {
				let dateValue = document.getElementById(
					`date-${option?.key}`
				)?.value;
				if (dateValue) {
					let obj = {
						label: dateValue,
						isFieldMulti: option?.value?.multi || false,
					};
					selectedChoices[option?.key] = [obj];
				}
			} else if (option?.value?.type === "textarea") {
				textareaValue =
					document.getElementById(`textarea-${option?.key}`)?.value ||
					document.getElementById(`textarea-${option?.key}`)
						?.innerText;
			} else if (option?.value?.type === "buttons") {
				if (actionId === option?.value?.buttons[0]?.id) {
					selectedChoices[option?.key] =
						option?.value?.buttons[0]?.label;
				}
			}
		});
		let payload = {
			messageId: data?.messageId,
			question: data?.question,
			resolved: transformData(selectedChoices),
			boardId: data?.boardId,
			resolvedInterruption: true,
		};
		if (actionId) {
			payload.resolved = {
				actionId: actionId,
				comment: textareaValue,
				...transformData(selectedChoices),
			};
		}

		const params = {
			qId: data?.id,
			type: data?.type,
			reqId: data?.reqId,
			messageId: data?.messageId,
		};
		InitiateChatConversationAction({ payload, params });
	};

	const transformData = (originalData) => {
		console.log(originalData);
		const transformedData = {};
		for (const key in originalData) {
			if (Object.hasOwnProperty.call(originalData, key)) {
				const items = originalData[key];
				if (!!items) {
					if (key === "source" || key === "project") {
						transformedData[key] = items.map((item) => {
							const newItem = { id: item.id };
							if (item.nestedChoices) {
								newItem[item.customType] =
									item?.nestedChoices.map(
										(choice) => choice.id
									);
							}
							return newItem;
						});
					} else {
						if (key === "meeting_time_range") {
							transformedData[key] = items?.map((item) => ({
								id: item?.id,
								label: item?.label,
							}));
						} else {
							if (items[0]?.isFieldMulti) {
								transformedData[key] = items?.map(
									(item) => item?.id || item?.label
								);
							} else {
								transformedData[key] =
									items[0].id || items[0]?.label;
							}
						}
					}
				}
			}
		}
		return transformedData ?? {};
	};

	const cancelAction = () => {
		cancelAdvanceSearch(data?.reqId);
	};

	const container = document.getElementById(
		`interruption-template-${data?.id}`
	);

	if (container) {
		const interruptionFields = data?.templateInfo?.interruptionFields;

		interruptionFields?.forEach((field) => {
			const buttons = field?.value?.buttons;
			buttons?.forEach((button, index) => {
				const buttonElement = document.querySelector(
					`.buttons-${index}`
				);
				buttonElement?.addEventListener("click", () => {
					continueAction(button?.id);
				});
			});
		});

		if (!interruptionFields?.some((f) => f?.value?.type === "buttons")) {
			const cancelBtn = document.getElementById(`cancel-btn-${data?.reqId}`);
			const continueBtn = document.getElementById(`continue-btn-${data?.reqId}`);

			if (!cancelBtn?.eventListenerAdded) {
				cancelBtn?.addEventListener("click", () => {
					cancelAction();
					cancelBtn.eventListenerAdded = true;
				});
			}

			if (!continueBtn?.eventListenerAdded) {
				continueBtn?.addEventListener("click", () => {
					continueAction();
					continueBtn.eventListenerAdded = true;
				});
			}
		}
	}
};

export default InterruptionTemplateFunc;
