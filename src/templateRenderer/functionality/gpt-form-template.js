import cancelAdvanceSearch from "../../chat/cancelAdvanceSearch";
import SubmitGPTForm from "../../chat/gptTemplate/submitGPTForm";
import { getCurrentQuestion } from "../../utils/helpers";
import RemoveUploadedGPTFile from "../../chat/gptTemplate/removeUploadedGPTFile";
import DeleteGPTResponse from "../../chat/gptTemplate/deleteGPTResponse";
import AddAdditionalGPTResponse from "../../chat/gptTemplate/addAdditionalGPTResponse";
import GptFileUpload from "../../chat/gptTemplate/gptFileUpload";
import { cloneDeep } from "lodash";
import store from "../../redux/store";
import toast from "../../utils/toast";

const gptFormFunctionality = (formData, item) => {
	let contextField = formData?.contextFields?.[0];
	let uploadedFiles = item?.filesUploaded;

	let uploadedFilesState = cloneDeep(store.getState().global.GptUploadedFiles);
	let contextFieldFileKey = `${contextField?.key}-${item?.messageId}`;
	let contextFieldFileDetails = uploadedFilesState?.[contextFieldFileKey];

	const cancelAction = (event) => {
		event.preventDefault();
		cancelAdvanceSearch(item?.reqId);
	};

	const removeUploadedFile = (event, id, questionId, fileMediaName) => {
		event.preventDefault();
		RemoveUploadedGPTFile(event, id, questionId, fileMediaName);
	};

	const addResponse = (event) => {
		event.preventDefault();
		const currentQsn = getCurrentQuestion(item);
		AddAdditionalGPTResponse(currentQsn, true);
	};

	const deleteResponse = (event, index) => {
		event.preventDefault();
		const currentQsn = getCurrentQuestion(item);
		DeleteGPTResponse(currentQsn, index, true);
	};

	const submitAnswer = (event, item) => {
		event.preventDefault();
		const currentQsn = getCurrentQuestion(item);
		SubmitGPTForm(event, currentQsn);
	};

	const delIconDiv = document.getElementById(`deleteAnswer-${item?.messageId}`);
	if (delIconDiv) {
		delIconDiv.addEventListener("click", (event) => {
			if (!delIconDiv.eventListenerAdded) {
				delIconDiv.eventListenerAdded = true;
				cancelAction(event);
			}
		});
	}

	if(contextFieldFileDetails && contextFieldFileDetails?.length > 0){

		contextFieldFileDetails?.forEach((file, index) => {
			const removeButton = document.getElementById(
				`removeButton-${contextField?.key}-${item?.messageId}-${index}`
			);
			if(removeButton && !removeButton.eventListenerAdded){
				removeButton.eventListenerAdded = true;
				removeButton.addEventListener("click", (event) => {
					removeUploadedFile(event, `${contextField?.key}-${item?.messageId}`, item?.reqId, file?.mediaName);
				});
			}

		});
	}

	if (contextField?.value?.canUploadFile) {
		const inputField = document.getElementById(
			`fileUpload-${contextField?.key}-${item?.messageId}`
		);

		const browseField = document.getElementById(
			`browseLink-${contextField?.key}-${item?.messageId}`
		);
		if(browseField && !browseField.eventListenerAdded){
			browseField.eventListenerAdded = true;
			browseField.addEventListener("click", (event) => {
				event.preventDefault();				
				document.getElementById(`fileUpload-${contextField?.key}-${item?.messageId}`)?.click();
			});
		}
		if(inputField && !inputField.eventListenerAdded){
			inputField.eventListenerAdded = true;
			inputField.addEventListener("change", (event) => {
				GptFileUpload(event, `${contextField?.key}-${item?.messageId}`, item?.reqId);
			});
		}

		// Add click listener for disabled context field upload inputs to show toast
		if (contextField?.value?.canUploadFile && !contextField?.value?.allowMultipleFiles) {
			const contextInputField = document.getElementById(
				`fileUpload-${contextField?.key}-${item?.messageId}`
			);
			
			if (contextInputField && !contextInputField.disabledClickListenerAdded) {
				contextInputField.disabledClickListenerAdded = true;
				
				// Check if the context field has uploaded files to determine if input should be disabled
				setTimeout(() => {
					const contextFileKey = `${contextField?.key}-${item?.messageId}`;
					const contextFileDetails = uploadedFilesState?.[contextFileKey];
					const hasContextFiles = contextFileDetails && contextFileDetails?.length > 0;
					
					if (hasContextFiles) {
						contextInputField.disabled = true;
					}
					
					// Listen on parent label to catch both label and input clicks
					const parentLabel = contextInputField.closest('label');
					if (parentLabel && !parentLabel.disabledClickListenerAdded) {
						parentLabel.disabledClickListenerAdded = true;
						parentLabel.addEventListener("click", (event) => {
							if (contextInputField.disabled) {
								event.preventDefault();
								event.stopPropagation();
								
								// Show warning toast
								toast.warning("Upload limit reached. Remove the current file to upload a new one.", {
									title: "Context Upload Disabled",
									duration: 4000,
									closable: true
								});
							}
						});
					}
				}, 100); 
			}
		}

	}

	formData?.fieldValues?.forEach((parameters, index) => {
		parameters?.forEach((field, i) => {
			//Checking if the field has uploaded files
			let parameterFileKey = `${field?.key}-${item?.messageId}-${field?.uniqueFieldId}`;
			let fileDetails = uploadedFilesState?.[parameterFileKey];
			let hasUploadedFiles = fileDetails && fileDetails?.length > 0;

			if (field?.value?.canUploadFile) {
				const inputField = document.getElementById(
					`fileUpload-${field?.key}-${item?.messageId}-${field?.uniqueFieldId}`
				);
				if(inputField && !inputField.eventListenerAdded){
					inputField.eventListenerAdded = true;
					inputField.addEventListener("change", (event) => {
						GptFileUpload(event, `${field?.key}-${item?.messageId}-${field?.uniqueFieldId}`, item?.reqId);
					});
				}

				if(hasUploadedFiles){
					fileDetails?.forEach((file, fileIndex) => {
						const removeButton = document.getElementById(
							`removeButton-${field?.key}-${item?.messageId}-${field?.uniqueFieldId}-${fileIndex}`
						);
						if(removeButton && !removeButton.eventListenerAdded){
							removeButton.eventListenerAdded = true;
							removeButton.addEventListener("click", (event) => {
								removeUploadedFile(event, `${field?.key}-${item?.messageId}-${field?.uniqueFieldId}`, item?.reqId, file?.mediaName);
							});
						}
					});
				}
			}

			// Add click listener for disabled upload inputs to show toast
			if (field?.value?.canUploadFile && !field?.value?.allowMultipleFiles) {
				const inputField = document.getElementById(
					`fileUpload-${field?.key}-${item?.messageId}-${field?.uniqueFieldId}`
				);
				
				if (inputField && !inputField.disabledClickListenerAdded) {
					inputField.disabledClickListenerAdded = true;
					
					// Listen on parent label to catch both label and input clicks
					const parentLabel = inputField.closest('label');
					if (parentLabel && !parentLabel.disabledClickListenerAdded) {
						parentLabel.disabledClickListenerAdded = true;
						parentLabel.addEventListener("click", (event) => {
							if (inputField.disabled) {
								event.preventDefault();
								event.stopPropagation();
								
								// Show warning toast
								toast.warning("Upload limit reached. Remove the current file to upload a new one.", {
									title: "Upload Disabled",
									duration: 4000,
									closable: true
								});
							}
						});
					}
				}
			}

			if (field?.key === "prompt") {
				const quillContainer = document.getElementById(
					`inputValue-${field?.key}-${item?.messageId}-${index}`
				);
				
				// Wait for Quill editor to be initialized
				setTimeout(() => {
					if (quillContainer && quillContainer.quillEditor) {
						const defaultValue = field?.value?.default || "";
						if (defaultValue) {
							quillContainer.quillEditor.setContent(defaultValue, 'text');
						}
					}
				}, 200);
			}

			if (field?.value?.nested?.key === "prompt") {
				const quillContainer = document.getElementById(
					`inputValue-${field?.key}-${item?.messageId}-${index}`
				);

				// Wait for Quill editor to be initialized
				setTimeout(() => {
					if (quillContainer && quillContainer.quillEditor) {
						const initialPromptValue = field?.value?.nested?.value || "";
						if (initialPromptValue) {
							quillContainer.quillEditor.setContent(initialPromptValue, 'text');
						}
					}
				}, 200);
			}
		});
		if (index > 0) {
			const deleteResponseButton = document.getElementById(
				`deleteResponse-${item?.messageId}-${index}`
			);
			if (deleteResponseButton) {
				deleteResponseButton.addEventListener("click", (event) => {
					if (!deleteResponseButton.eventListenerAdded) {
						deleteResponseButton.eventListenerAdded = true;
						deleteResponse(event, index);
					}
				});
			}
		}
	});

	const cancelButton = document.getElementById(
		`discardAnswer-${item?.messageId}`
	);
	if (cancelButton) {
		cancelButton.addEventListener("click", (event) => {
			if (!cancelButton.eventListenerAdded) {
				cancelButton.eventListenerAdded = true;
				cancelAction(event);
			}
		});
	}

	const submitButton = document.getElementById(
		`submitGptForm-${item?.messageId}`
	);
	if (submitButton && !submitButton?.eventListenerAdded) {
		submitButton.eventListenerAdded = true;
		submitButton.addEventListener("click", (event) => {
			submitAnswer(event, item);
		});
	}

	const addAdditionalResponseButton = document.getElementById(
		`addAdditionalResponse-${item?.messageId}`
	);
	if (addAdditionalResponseButton) {
		addAdditionalResponseButton.addEventListener("click", (event) => {
			if (!addAdditionalResponseButton.eventListenerAdded) {
				addAdditionalResponseButton.eventListenerAdded = true;
				addResponse(event);
			}
		});
	}
};

export default gptFormFunctionality;
