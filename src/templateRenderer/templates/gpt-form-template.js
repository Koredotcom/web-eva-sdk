import { cloneDeep, isEmpty } from "lodash";
import { getCurrentQuestion } from "../../utils/helpers";
import UpdateGPTPromptValue from "../../chat/gptTemplate/updateGPTPromptValue";
import Choices from "choices.js";
import MultiResponse from "../../chat/gptTemplate/MultiResponse";
import gptFormFunctionality from "../functionality/gpt-form-template";
import store from "../../redux/store";
import { QuillEditor } from "../../components";

// Helper function to initialize Quill editor for a container
const initializeQuillForContainer = (container, field, item, promptDropdownWords, index) => {
	try {
		const quillEditor = new QuillEditor(container, {
			placeholder: field?.value?.placeholder || "Enter your prompt...",
			modules: {
				toolbar: false  // Completely disable the toolbar
			}
		});

		quillEditor.init();



		// Debounce timer for styling
		let styleTimeout;
		

		// Function to apply styling immediately (for dropdown insertions)
		const applyImmediateStyling = () => {
			try {
				const editor = quillEditor.getQuill();
				const text = editor.getText();
				const variableRegex = /\$\$([^$]+)\$\$/g;
				
				console.log('Applying immediate styling to text:', text);

				// Store current selection
				const currentSelection = editor.getSelection();
				
				// Find and replace variables (remove $$ and style the word)
				const matches = [];
				let regexMatch;
				
				// Reset regex to find all matches
				variableRegex.lastIndex = 0;
				while ((regexMatch = variableRegex.exec(text)) !== null) {
					matches.push({
						index: regexMatch.index,
						length: regexMatch[0].length,
						fullText: regexMatch[0], // $$word$$
						wordOnly: regexMatch[1]  // word
					});
				}
				
				console.log('Found', matches.length, 'variables to process:', matches.map(m => m.wordOnly));
				
				// Process matches in reverse order to maintain correct indices
				for (let i = matches.length - 1; i >= 0; i--) {
					const { index, length, wordOnly } = matches[i];
					
					console.log('Processing variable:', wordOnly, 'at index:', index);
					
					// Check if this text is already styled to avoid re-processing
					const existingFormat = editor.getFormat(index, wordOnly.length);
					const isAlreadyStyled = existingFormat.background === '#e3f2fd' && 
											existingFormat.color === '#1976d2' && 
											existingFormat.bold === true;
					
					console.log('Variable already styled:', isAlreadyStyled);
					
					// Only process if not already styled
					if (!isAlreadyStyled) {
						console.log('Styling variable:', wordOnly);
						
						// Replace $$word$$ with word + unformatted space
						editor.deleteText(index, length, 'silent');
						editor.insertText(index, wordOnly + ' ', 'silent');
						
						// Style only the word part (not the space)
						editor.formatText(index, wordOnly.length, {
							'background': '#e3f2fd',
							'color': '#1976d2',
							'bold': true
						}, 'silent');
						
						// Ensure the space after is unformatted
						editor.formatText(index + wordOnly.length, 1, {
							'background': false,
							'color': false,
							'bold': false
						}, 'silent');
					}
				}

				// Restore selection
				if (currentSelection) {
					editor.setSelection(currentSelection.index, currentSelection.length, 'silent');
				}
			} catch (error) {
				console.error('Error applying immediate styling:', error);
			}
		};

		// Function to apply styling only when user stops typing
		const applyDelayedStyling = () => {
			// Clear any existing timeout
			if (styleTimeout) {
				clearTimeout(styleTimeout);
			}

			// Set a new timeout to apply styling after user stops typing
			styleTimeout = setTimeout(() => {
				applyImmediateStyling();
			}, 500); 
		};

		// Create dropdown for word selection
		const createWordDropdown = (x, y, editorContainer, insertCallback) => {
			console.log('createWordDropdown called with:', x, y, 'for container:', editorContainer, "promptDropdownWords:", promptDropdownWords); // Debug log
			
			// Remove any existing dropdown
			const existingDropdown = document.querySelector('.variable-dropdown');
			if (existingDropdown) {
				existingDropdown.remove();
				console.log('Removed existing dropdown'); // Debug log
			}

			// Make sure editor container has relative positioning
			const containerStyle = window.getComputedStyle(editorContainer);
			if (containerStyle.position === 'static') {
				editorContainer.style.position = 'relative';
			}

			// Sample words for the dropdown - you can customize this list
			const availableWords = [
				'username', 'email', 'firstname', 'lastname', 'company', 
				'address', 'phone', 'ordernumber', 'date', 'amount',
				'status', 'category', 'description', 'title', 'id'
			];

			// Create dropdown container
			const dropdown = document.createElement('div');
			dropdown.className = 'variable-dropdown';
			dropdown.style.cssText = `
				position: absolute;
				left: ${x}px;
				top: ${y}px;
				background: white;
				border: 1px solid #ccc;
				border-radius: 6px;
				box-shadow: 0 8px 16px rgba(0,0,0,0.15);
				z-index: 9999;
				max-height: 180px;
				overflow-y: auto;
				min-width: 160px;
				font-size: 13px;
			`;

			// Add a small header to the dropdown
			const header = document.createElement('div');
			header.textContent = 'Select Variable';
			header.style.cssText = `
				padding: 8px 12px;
				background-color: #f8f9fa;
				border-bottom: 1px solid #e9ecef;
				font-weight: 600;
				font-size: 12px;
				color: #495057;
				text-align: center;
			`;
			dropdown.appendChild(header);

			// Create dropdown items
			promptDropdownWords.forEach(word => {
				const item = document.createElement('div');
				item.textContent = word;
				item.className = 'dropdown-item';
				item.style.cssText = `
					padding: 8px 12px;
					cursor: pointer;
					border-bottom: 1px solid #eee;
					transition: background-color 0.2s;
					font-size: 13px;
				`;

				// Hover effect
				item.addEventListener('mouseenter', () => {
					item.style.backgroundColor = '#f0f0f0';
				});

				item.addEventListener('mouseleave', () => {
					item.style.backgroundColor = 'white';
				});

				// Click to select
				item.addEventListener('click', () => {
					insertCallback(word);
					dropdown.remove();
				});

				dropdown.appendChild(item);
			});

			// Add to editor container as overlay
			editorContainer.appendChild(dropdown);
			console.log('Dropdown added to editor container'); // Debug log

			// Close dropdown when clicking outside
			const closeDropdown = (e) => {
				if (!dropdown.contains(e.target)) {
					dropdown.remove();
					document.removeEventListener('click', closeDropdown);
				}
			};

			// Add close listener after a small delay to prevent immediate closing
			setTimeout(() => {
				document.addEventListener('click', closeDropdown);
			}, 100);

			return dropdown;
		};

		// Handle click in editor to show dropdown - direct click event approach
		const handleEditorClick = (event) => {
			console.log('Editor clicked!', event); // Debug log
			
			// Get editor and cursor position
			const editor = quillEditor.getQuill();
			
			// Small delay to ensure selection is updated
			setTimeout(() => {
				const selection = editor.getSelection();
				if (selection) {
					// Check if click is on a styled variable - if so, don't open dropdown
					if (selection.index > 0) {
						// Check the format at the current position
						const currentFormat = editor.getFormat(selection.index, 1);
						const previousFormat = editor.getFormat(selection.index - 1, 1);
						
						// Check if current position or previous position has variable styling
						const isOnStyledVariable = (currentFormat.background === '#e3f2fd' && 
													currentFormat.color === '#1976d2' && 
													currentFormat.bold === true) ||
												   (previousFormat.background === '#e3f2fd' && 
													previousFormat.color === '#1976d2' && 
													previousFormat.bold === true);
						
						if (isOnStyledVariable) {
							console.log('Click on styled variable detected, not opening dropdown');
							return; // Don't open dropdown on styled variables
						}
					}
					
					// Get the editor container for relative positioning
					const editorContainer = container; // The main container passed to this function
					const editorRect = editorContainer.getBoundingClientRect();
					const bounds = editor.getBounds(selection.index);
					
					// Calculate position relative to editor container
					const x = bounds.left + 10; // Small offset from cursor
					const y = bounds.top + bounds.height + 5; // Below the cursor line
					
					console.log('Creating dropdown at:', x, y, 'relative to editor'); // Debug log
					
					// Create dropdown with insert callback
					createWordDropdown(x, y, editorContainer, (selectedWord) => {
						// Insert the selected word wrapped in $$ (space will be added during styling)
						const wrappedWord = `$$${selectedWord}$$`;
						editor.insertText(selection.index, wrappedWord, 'user');
						
						// Position cursor after the inserted text
						editor.setSelection(selection.index + wrappedWord.length);
						
						// Apply styling immediately for the dropdown insertion
						setTimeout(() => {
							applyImmediateStyling();
						}, 10);
					});
				}
			}, 50);
		};

		// Function to clear formatting for new text after variables
		const clearFormattingForNewText = () => {
			const editor = quillEditor.getQuill();
			const selection = editor.getSelection();
			
			if (selection && selection.length === 0) {
				// Check if we're at the end of a formatted section
				const format = editor.getFormat(selection.index - 1, 1);
				if (format.background || format.color || format.bold) {
					// Clear formatting for the current position
					editor.format('background', false, 'silent');
					editor.format('color', false, 'silent');
					editor.format('bold', false, 'silent');
				}
			}
		};

		// Function to handle backspace for styled variables
		const handleBackspaceForVariables = (event) => {
			try {
				// Only handle Backspace key
				if (event.key !== 'Backspace') {
					return; // Let default behavior handle it
				}
				
				const editor = quillEditor.getQuill();
				if (!editor) {
					return; // Editor not ready
				}
				
				const selection = editor.getSelection();
				
				// Only handle when there's a cursor position (not a selection)
				if (!selection || selection.length > 0) {
					return; // Let default behavior handle it
				}
				
				const cursorIndex = selection.index;
				
				// Check if we're at the beginning of the document
				if (cursorIndex === 0) {
					return; // Let default behavior handle it
				}
				
				// Get the text and find all styled variables
				const text = editor.getText();
				const allFormats = editor.getContents()?.ops;
				
				if (!allFormats || !Array.isArray(allFormats)) {
					return; // No valid format data
				}
				
				// Find styled variable ranges
				const styledRanges = [];
				let currentIndex = 0;
				
				for (let op of allFormats) {
					if (op.insert && typeof op.insert === 'string') {
						const insertText = op.insert;
						const hasVariableStyle = op.attributes && 
							op.attributes.background === '#e3f2fd' && 
							op.attributes.color === '#1976d2' && 
							op.attributes.bold === true;
						
						if (hasVariableStyle) {
							// This is a styled variable
							styledRanges.push({
								start: currentIndex,
								end: currentIndex + insertText.length,
								text: insertText
							});
						}
						
						currentIndex += insertText.length;
					}
				}
				
				// Check if cursor is positioned to delete a styled variable
				for (let range of styledRanges) {
					// Check if cursor is right after this styled variable (including space)
					if (cursorIndex === range.end + 1) {
						// Delete the entire styled variable + space
						const deleteLength = range.end - range.start + 1; // +1 for the space
						editor.deleteText(range.start, deleteLength, 'user');
						editor.setSelection(range.start, 0, 'user');
						
						console.log('Deleted entire styled variable with space:', range.text);
						
						// Prevent default backspace behavior
						event.preventDefault();
						event.stopPropagation();
						return;
					}
					
					// Check if cursor is within or at the end of a styled variable
					if (cursorIndex > range.start && cursorIndex <= range.end) {
						// Delete the entire styled variable
						const deleteLength = range.end - range.start;
						editor.deleteText(range.start, deleteLength, 'user');
						editor.setSelection(range.start, 0, 'user');
						
						console.log('Deleted entire styled variable:', range.text);
						
						// Prevent default backspace behavior
						event.preventDefault();
						event.stopPropagation();
						return;
					}
				}
				
				// If we get here, let default behavior handle it
				return;
			} catch (error) {
				console.error('Error in handleBackspaceForVariables:', error);
				// On error, let default behavior handle it
				return;
			}
		};

		// Function to handle text input on styled variables
		const handleTextInput = (event) => {
			try {
				// Only handle printable characters (not special keys)
				if (event.key.length !== 1) {
					return; // Let default behavior handle it
				}
				
				const editor = quillEditor.getQuill();
				if (!editor) {
					return; // Editor not ready
				}
				
				const selection = editor.getSelection();
				
				// Only handle when there's a cursor position (not a selection)
				if (!selection || selection.length > 0) {
					return; // Let default behavior handle it
				}
				
				const cursorIndex = selection.index;
				
				// Check if we're typing within a styled variable
				const currentFormat = editor.getFormat(cursorIndex, 1);
				const previousFormat = cursorIndex > 0 ? editor.getFormat(cursorIndex - 1, 1) : {};
				
				const isWithinStyledVariable = (currentFormat.background === '#e3f2fd' && 
												currentFormat.color === '#1976d2' && 
												currentFormat.bold === true) ||
											   (previousFormat.background === '#e3f2fd' && 
												previousFormat.color === '#1976d2' && 
												previousFormat.bold === true);
				
				if (isWithinStyledVariable) {
					console.log('Text input within styled variable detected, preventing editing');
					
					// Simply prevent any text input within styled variables
					// Styled variables should be immutable (only deletable with backspace)
					event.preventDefault();
					event.stopPropagation();
					return;
				}
				
				// If we get here, let default behavior handle it
				return;
			} catch (error) {
				console.error('Error in handleTextInput:', error);
				// On error, let default behavior handle it
				return;
			}
		};

		// Add click event listener to editor
		const editorRoot = quillEditor.getQuill().root;
		editorRoot.addEventListener('click', handleEditorClick);

		// Add keydown event listener to handle backspace for styled variables
		editorRoot.addEventListener('keydown', handleBackspaceForVariables);

		// Add keydown event listener to handle text input on styled variables
		editorRoot.addEventListener('keydown', handleTextInput);

		// Function to convert styled variables back to $$word$$ format
		const convertStyledToVariables = () => {
			try {
				const editor = quillEditor.getQuill();
				const text = editor.getText();
				const allFormats = editor.getContents()?.ops;
				
				if (!allFormats || !Array.isArray(allFormats)) {
					return text; // Return plain text if no format data
				}
				
				let result = '';
				let currentIndex = 0;
				
				for (let op of allFormats) {
					if (op.insert && typeof op.insert === 'string') {
						const insertText = op.insert;
						const hasVariableStyle = op.attributes && 
							op.attributes.background === '#e3f2fd' && 
							op.attributes.color === '#1976d2' && 
							op.attributes.bold === true;
						
						if (hasVariableStyle) {
							// Convert styled variable back to $$word$$ format
							result += `$$${insertText}$$`;
						} else {
							// Keep regular text as is
							result += insertText;
						}
					}
				}
				
				return result;
			} catch (error) {
				console.error('Error converting styled to variables:', error);
				return quillEditor.getText(); // Fallback to plain text
			}
		};

		//the below event listener is to listen to the changes made in editor
		quillEditor.on('textChange', (delta, oldDelta, source) => {
			const convertedContent = convertStyledToVariables();
			console.log(`Content changed in field: ${field?.key}`, {
				fieldKey: field?.key,
				itemId: item?.messageId,
				index: index,
				newContent: quillEditor.getText(),
				convertedContent: convertedContent,
				htmlContent: quillEditor.getContent('html'),
				source: source // 'user' or 'api'
			});
			
			// Apply delayed styling when user types
			if (source === 'user') {
				applyDelayedStyling();
				// Clear formatting for new text after a short delay
				setTimeout(() => {
					clearFormattingForNewText();
				}, 10);
			}
		});
		
		// Set default value if available
		const defaultValue = field?.value?.default || field?.default || '';
		
		if (defaultValue) {
			setTimeout(() => {
				try {
					quillEditor.setText(defaultValue);
					// Apply styling to initial content after a delay
					setTimeout(() => {
						applyImmediateStyling();
					}, 500);
				} catch (error) {
					console.error('Error setting default value:', error);
				}
			}, 200);
		}

		// Handle read-only state
		if (field?.value?.readOnly) {
			quillEditor.enable(false);
		}

		// Store the editor instance
		container.quillEditor = quillEditor;
		container.setAttribute('data-quill-init', 'completed');
		
		return quillEditor;
	} catch (error) {
		console.error('Error initializing Quill editor:', error);
		container.setAttribute('data-quill-init', 'failed');
		return null;
	}
};

// initializeQuillWhenReady function removed - no longer needed

export function render(item) {
	// const { formData } = item;

	const formData = item?.gpt_forms;	
	let contextField = null;
	let fieldValues = [];
	if (!isEmpty(formData?.contextFields)) {
		contextField = formData?.contextFields?.[0];
	}

	let uploadedFileState = cloneDeep(store.getState().global.GptUploadedFiles);

	if (!isEmpty(formData?.fieldValues)) {
		fieldValues = formData?.fieldValues;
	}

	const gptAgentDiv = document.createElement("div");
	gptAgentDiv.className = "gptAgentWrapper";

	const threadNameDiv = document.createElement("div");
	threadNameDiv.className = "threadName";
	threadNameDiv.textContent = item?.answer;
	gptAgentDiv.appendChild(threadNameDiv);

	const translateFormViewDiv = document.createElement("div");
	translateFormViewDiv.className = "translateForm-view";

	const tvHeaderDiv = document.createElement("div");
	tvHeaderDiv.className = "tvHeader";

	const leftNameDiv = document.createElement("div");
	leftNameDiv.className = "leftName";

	const imgBlockDiv = document.createElement("div");
	imgBlockDiv.className = "imgBlock";
	const imgElement = document.createElement("img");
	imgElement.src = item?.content?.formFields?.icon;
	imgElement.alt = "";
	imgElement.style.width = "50px";
	imgElement.style.height = "50px";
	imgBlockDiv.appendChild(imgElement);

	const ltTitleDiv = document.createElement("div");
	ltTitleDiv.className = "ltTitle";
	ltTitleDiv.textContent = item?.content?.formFields?.title;

	const delIconDiv = document.createElement("button");
	delIconDiv.id = `deleteAnswer-${item?.messageId}`;
	delIconDiv.className = "delIcon";
	delIconDiv.textContent = "Delete";
	leftNameDiv.appendChild(imgBlockDiv);
	leftNameDiv.appendChild(ltTitleDiv);
	leftNameDiv.appendChild(delIconDiv);
	tvHeaderDiv.appendChild(leftNameDiv);
	translateFormViewDiv.appendChild(tvHeaderDiv);

	const tvBodyDiv = document.createElement("div");
	tvBodyDiv.className = "tvBody";

	if (contextField) {
		const contextFieldWrapper = document.createElement("div");
		contextFieldWrapper.className = "contextFieldWrapper";

		const headerDiv = document.createElement("div");
		headerDiv.className = "contextFieldHeader";
		headerDiv.textContent = "Context";
		contextFieldWrapper.appendChild(headerDiv);

		const tvInputGroupDiv = document.createElement("div");
		tvInputGroupDiv.className = `tvInputGroup ${
			contextField?.value?.type
		} ${contextField?.value?.canUploadFile ? "uploadGrp" : ""}`;

		const grpInputDiv = document.createElement("div");
		grpInputDiv.className = "grpInput";

		let contextFieldFileKey = `${contextField?.key}-${item?.messageId}`;
		let fileDetails = uploadedFileState?.[contextFieldFileKey];

		if(item?.loadingFiles?.includes(contextFieldFileKey)){
			const loadingFileDiv = document.createElement("div");
			loadingFileDiv.className = "loadingFileDetails";
			loadingFileDiv.id = `loadingFile-${contextField?.key}-${item?.messageId}`;
			loadingFileDiv.textContent = "Loading...";
			grpInputDiv.appendChild(loadingFileDiv);
		}

		else if(fileDetails && fileDetails?.length > 0){
			fileDetails?.forEach((file, index) => {
				const uploadedFileDiv = document.createElement("div");
				uploadedFileDiv.className = "uploadedFileDetails";
				uploadedFileDiv.id = `uploadedFile-${contextField?.key}-${item?.messageId}-${index}`;
				uploadedFileDiv.textContent = file?.title;

				const removeButton = document.createElement("button");
				removeButton.textContent = "Remove";
				removeButton.id = `removeButton-${contextField?.key}-${item?.messageId}-${index}`;
				uploadedFileDiv.appendChild(removeButton);

				grpInputDiv.appendChild(uploadedFileDiv);
			});
		}

		else if (
			contextField?.value?.type === "longText" ||
			contextField?.value?.type === "simpleText" ||
			contextField?.value?.type === "richText"
		) {
			const grpWrapDiv = document.createElement("div");
			grpWrapDiv.className = "grpwrap";

			const grpNameDiv = document.createElement("div");
			grpNameDiv.className = "grpName";

			const nameTitleDiv = document.createElement("div");
			nameTitleDiv.className = "nameTitle";
			nameTitleDiv.textContent = `${contextField?.label} ${
				contextField?.required || contextField?.value?.required
					? "*"
					: ""
			}`;
			grpNameDiv.appendChild(nameTitleDiv);
			grpWrapDiv.appendChild(grpNameDiv);
			grpInputDiv.appendChild(grpWrapDiv);

			if (contextField?.value?.canUploadFile) {
				const formFieldLongTextElement = document.createElement("div");
				formFieldLongTextElement.className = "formField LongText";
				const fileUploadLabel = document.createElement("label");
				fileUploadLabel.textContent = "Upload";
				fileUploadLabel.className = "fileUploadLabel";
				formFieldLongTextElement.appendChild(fileUploadLabel);

				const inputField = document.createElement("input");
				inputField.type = "file";
				inputField.id = `fileUpload-${contextField?.key}-${item?.messageId}`;
				fileUploadLabel.appendChild(inputField);

				

				grpInputDiv.appendChild(formFieldLongTextElement);
			}

			const textareaElement = document.createElement("textarea");
			textareaElement.id = `inputValue-${contextField?.key}-${item?.messageId}`;
			textareaElement.placeholder =
				contextField?.value?.placeholder || "Enter Text...";
			textareaElement.textContent = contextField?.value?.default || "";
			grpInputDiv.appendChild(textareaElement);
		}

		else if (contextField?.value?.type === "file") {
			const inputField = document.createElement("input");
			inputField.type = "file";
			inputField.id = `fileUpload-${contextField?.key}-${item?.messageId}`;
			grpInputDiv.appendChild(inputField);

			const removeButton = document.createElement("button");
			removeButton.textContent = "Remove";
			removeButton.id = `removeButton-${contextField?.key}-${item?.messageId}`;
			removeButton.style.display = "none";
			grpInputDiv.appendChild(removeButton);
		}

		tvInputGroupDiv.appendChild(grpInputDiv);
		contextFieldWrapper.appendChild(tvInputGroupDiv);
		tvBodyDiv.appendChild(contextFieldWrapper);
	}

	formData?.fieldValues?.forEach((parameters, index) => {
		const responsesFieldWrapper = document.createElement("div");
		responsesFieldWrapper.className = "responsesFieldWrapper";

		const singleResponseWrapper = document.createElement("div");
		singleResponseWrapper.className = `response-${index}`;

		const responseHeader = document.createElement("div");
		responseHeader.className = "responseHeader";
		responseHeader.textContent =
			formData?.fieldValues?.length > 1
				? `Response ${index + 1}`
				: "Response";
		singleResponseWrapper.appendChild(responseHeader);

		if (index > 0) {
			const deleteResponse = document.createElement("button");
			deleteResponse.textContent = "Delete";
			deleteResponse.id = `deleteResponse-${item?.messageId}-${index}`;
			singleResponseWrapper.appendChild(deleteResponse);
		}
		parameters?.forEach((field, i) => {

			let parameterFileKey = `${field?.key}-${item?.messageId}-${index}`;
			let fileDetails = uploadedFileState?.[parameterFileKey];
			let hasUploadedFiles = fileDetails && fileDetails?.length > 0;
			let isLoading = item?.loadingFiles?.includes(parameterFileKey);
		
			const tvInputGroupDiv = document.createElement("div");
			tvInputGroupDiv.className = `tvInputGroup ${field?.value?.type} ${
				field?.value?.canUploadFile ? "uploadGrp" : ""
			}`;
		
			const grpInputDiv = document.createElement("div");
			grpInputDiv.className = "grpInput";
		
			if (hasUploadedFiles || isLoading) {
				const grpWrapDiv = document.createElement("div");
				grpWrapDiv.className = "grpwrap";

				const grpNameDiv = document.createElement("div");
				grpNameDiv.className = "grpName";

				const nameTitleDiv = document.createElement("div");
				nameTitleDiv.className = "nameTitle";
				nameTitleDiv.textContent = `${field?.label} ${field?.required || field?.value?.required ? "*" : ""
					}`;
				grpNameDiv.appendChild(nameTitleDiv);
				grpWrapDiv.appendChild(grpNameDiv);
				grpInputDiv.appendChild(grpWrapDiv);

				if (isLoading) {
					const loadingFileDiv = document.createElement("div");
					loadingFileDiv.className = "loadingFileDetails";
					loadingFileDiv.id = `loadingFile-${field?.key}-${item?.messageId}-${index}`;
					loadingFileDiv.textContent = "Loading...";
					grpInputDiv.appendChild(loadingFileDiv);
				} else {
					fileDetails?.forEach((file, fileIndex) => {
						const uploadedFileDiv = document.createElement("div");
						uploadedFileDiv.className = "uploadedFileDetails";
						uploadedFileDiv.id = `uploadedFile-${field?.key}-${item?.messageId}-${index}`;
						uploadedFileDiv.textContent = file?.title;

						const removeButton = document.createElement("button");
						removeButton.textContent = "Remove";
						removeButton.id = `removeButton-${field?.key}-${item?.messageId}-${index}`;
						uploadedFileDiv.appendChild(removeButton);

						grpInputDiv.appendChild(uploadedFileDiv);
					});
				}
				
				tvInputGroupDiv.appendChild(grpInputDiv);
				singleResponseWrapper.appendChild(tvInputGroupDiv);
				return; // prevent further input rendering
			}			

			if (field?.value?.type === "richText" && field?.key === "content") {
				const grpWrapDiv = document.createElement("div");
				grpWrapDiv.className = "grpwrap";

				const grpNameDiv = document.createElement("div");
				grpNameDiv.className = "grpName";

				const nameTitleDiv = document.createElement("div");
				nameTitleDiv.className = "nameTitle";
				nameTitleDiv.textContent = `${field?.label} ${
					field?.required || field?.value?.required ? "*" : ""
				}`;
				grpNameDiv.appendChild(nameTitleDiv);
				grpWrapDiv.appendChild(grpNameDiv);
				grpInputDiv.appendChild(grpWrapDiv);

				if (field?.value?.canUploadFile) {
					const formFieldLongTextElement =
					document.createElement("div");
					formFieldLongTextElement.className = "formField LongText";
					const fileUploadLabel = document.createElement("label");
					fileUploadLabel.textContent = "Upload";
					fileUploadLabel.className = "fileUploadLabel";
					formFieldLongTextElement.appendChild(fileUploadLabel);

					const inputField = document.createElement("input");
					inputField.type = "file";
					inputField.id = `fileUpload-${field?.key}-${item?.messageId}-${index}`;
					fileUploadLabel.appendChild(inputField);

					const removeButton = document.createElement("button");
					removeButton.textContent = "Remove";
					removeButton.id = `removeButton-${field?.key}-${item?.messageId}-${index}`;
					removeButton.style.display = "none";
					formFieldLongTextElement.appendChild(removeButton);

					grpInputDiv.appendChild(formFieldLongTextElement);
				}

				const textareaElement = document.createElement("textarea");
				textareaElement.id = `inputValue-${field?.key}-${item?.messageId}-${index}`;
				textareaElement.placeholder =
					field?.value?.placeholder || "Enter Text...";
				textareaElement.textContent = field?.value?.default || "";
				grpInputDiv.appendChild(textareaElement);
			}

			if (
				field?.value?.type === "longText" &&
				field?.key !== "prompts" &&
				field?.key !== "prompt"
			) {
				const grpWrapDiv = document.createElement("div");
				grpWrapDiv.className = "grpwrap";

				const grpNameDiv = document.createElement("div");
				grpNameDiv.className = "grpName";

				const nameTitleDiv = document.createElement("div");
				nameTitleDiv.className = "nameTitle";
				nameTitleDiv.textContent = `${field?.label} ${
					field?.required || field?.value?.required ? "*" : ""
				}`;
				grpNameDiv.appendChild(nameTitleDiv);
				grpWrapDiv.appendChild(grpNameDiv);
				grpInputDiv.appendChild(grpWrapDiv);

				const textareaElement = document.createElement("textarea");
				textareaElement.id = `inputValue-${field?.key}-${item?.messageId}-${index}`;
				textareaElement.placeholder =
					field?.value?.placeholder || "Enter Text...";
				textareaElement.textContent = field?.value?.default || "";
				grpInputDiv.appendChild(textareaElement);
			}

			if (field?.value?.type === "dropdown" && !field?.value?.multi) {
				const grpWrapDiv = document.createElement("div");
				grpWrapDiv.className = "grpwrap";

				const grpNameDiv = document.createElement("div");
				grpNameDiv.className = "grpName";

				const nameTitleDiv = document.createElement("div");
				nameTitleDiv.className = "nameTitle";
				nameTitleDiv.textContent = `${field?.label} ${
					field?.required || field?.value?.required ? "*" : ""
				}`;
				grpNameDiv.appendChild(nameTitleDiv);
				grpWrapDiv.appendChild(grpNameDiv);

				const selectElement = document.createElement("select");
				selectElement.id = `dropdownValue-${field?.key}-${item?.messageId}-${index}`;

				// Initialize Choices.js when the dropdown is available
				let obj = {
					selector: `#dropdownValue-${field?.key}-${item?.messageId}-${index}`,
					isMulti: false,
					field,
					index,
					item,
					callback: initializeChoicesForElement,
				};

				observeDOMChanges(obj);

				grpWrapDiv.appendChild(selectElement);
				grpInputDiv.appendChild(grpWrapDiv);
			}

			if (field?.value?.type === "dropdown" && field?.value?.multi) {
				const grpWrapDiv = document.createElement("div");
				grpWrapDiv.className = "grpwrap";

				const grpNameDiv = document.createElement("div");
				grpNameDiv.className = "grpName";

				const nameTitleDiv = document.createElement("div");
				nameTitleDiv.className = "nameTitle";
				nameTitleDiv.textContent = `${field?.label} ${
					field?.required || field?.value?.required ? "*" : ""
				}`;
				grpNameDiv.appendChild(nameTitleDiv);
				grpWrapDiv.appendChild(grpNameDiv);

				const dropdownElement = document.createElement("select");
				dropdownElement.id = `dropdownValue-${field?.key}-${item?.messageId}-${index}`;
				dropdownElement.setAttribute("multiple", true);

				// Initialize Choices.js when the dropdown is available

				let obj = {
					selector: `#dropdownValue-${field?.key}-${item?.messageId}-${index}`,
					isMulti: true,
					field,
					index,
					callback: initializeChoicesForElement,
				};

				observeDOMChanges(obj);

				grpWrapDiv.appendChild(dropdownElement);
				grpInputDiv.appendChild(grpWrapDiv);
			}

			if (field?.key === "prompt") {
				const grpWrapDiv = document.createElement("div");
				grpWrapDiv.className = "grpwrap";

				const grpNameDiv = document.createElement("div");
				grpNameDiv.className = "grpName";

				const nameTitleDiv = document.createElement("div");
				nameTitleDiv.className = "nameTitle";
				nameTitleDiv.textContent = `${field?.label || "Prompt"}${
					field?.required || field?.value?.required ? " *" : ""
				}`;
				grpNameDiv.appendChild(nameTitleDiv);
				grpWrapDiv.appendChild(grpNameDiv);

				const quillContainer = document.createElement("div");
				quillContainer.className = "eva-quill-editor promptId";
				quillContainer.id = `inputValue-${field?.key}-${item?.messageId}-${index}`;
				
				grpWrapDiv.appendChild(quillContainer);
				grpInputDiv.appendChild(grpWrapDiv);

				// Store initialization status
				quillContainer.setAttribute('data-quill-init', 'pending');
				
				//create dropdown variables for the prompt editor
				let flatFields = Object.values(formData)?.map(field => Array.isArray(field) ? field?.flat() ?? field : [])?.flat();
				let promptDropdownWords = field?.variables?.map(variable => flatFields?.find(field => field?.key === variable)?.label);

				// Use a simple timeout approach since DOM isn't attached yet
				// This will run after the HTML is rendered to the page
				setTimeout(() => {
					const container = document.getElementById(`inputValue-${field?.key}-${item?.messageId}-${index}`);
					if (container) {
						initializeQuillForContainer(container, field, item, promptDropdownWords, index);
					}
				}, 1500); 

				// Remove backup initialization to prevent double toolbar
			}

			if (field?.value?.nested?.key === "prompt") {
				const grpWrapDiv = document.createElement("div");
				grpWrapDiv.className = "grpwrap";

				const grpNameDiv = document.createElement("div");
				grpNameDiv.className = "grpName";

				const nameTitleDiv = document.createElement("div");
				nameTitleDiv.className = "nameTitle";
				nameTitleDiv.textContent = `${field?.label} ${
					field?.required || field?.value?.required ? "*" : ""
				}`;
				grpNameDiv.appendChild(nameTitleDiv);
				grpWrapDiv.appendChild(grpNameDiv);

				const quillContainer = document.createElement("div");
				quillContainer.className = "eva-quill-editor promptId";
				quillContainer.id = `inputValue-${field?.key}-${item?.messageId}-${index}`;

				grpWrapDiv.appendChild(quillContainer);
				grpInputDiv.appendChild(grpWrapDiv);

				// Initialize nested prompt with timeout approach 
				setTimeout(() => {
					const container = document.getElementById(`inputValue-${field?.key}-${item?.messageId}-${index}`);
					if (container) {
						try {
							const quillEditor = new QuillEditor(container, {
								placeholder: field?.value?.placeholder || "Enter your prompt...",
								modules: {
									toolbar: false  // Completely disable the toolbar
								}
							});

							quillEditor.init();

							// Set initial content
							const initialPromptValue = formData?.fieldValues?.find(
								(field) => field?.key === "prompts"
							)?.value?.nested?.value?.values?.[0]?.value;
							const initialContent = field?.value?.default || initialPromptValue || "";
							
							if (initialContent) {
								setTimeout(() => {
									quillEditor.setText(initialContent);
								}, 200);
							}

							// Handle read-only state
							if (field?.value?.nested?.readOnly) {
								quillEditor.enable(false);
							}

							// Store the editor instance
							container.quillEditor = quillEditor;
							container.setAttribute('data-quill-init', 'completed');
						} catch (error) {
							console.error('Error initializing nested Quill editor:', error);
						}
					}
				}, 1500);
			}

			if (field?.value?.type === "simpleText") {
				const nameTitleDiv = document.createElement("div");
				nameTitleDiv.className = "nameTitle";
				nameTitleDiv.textContent = `${field?.label} ${
					field?.required || field?.value?.required ? "*" : ""
				}`;
				grpInputDiv.appendChild(nameTitleDiv);

				const textareaElement = document.createElement("textarea");
				textareaElement.id = `inputValue-${field?.key}-${item?.messageId}-${index}`;
				textareaElement.placeholder =
					field?.value?.placeholder || "Enter text...";
				textareaElement.textContent = field?.value?.default || "";
				grpInputDiv.appendChild(textareaElement);
			}

			if (field?.value?.type === "number") {
				const nameTitleDiv = document.createElement("div");
				nameTitleDiv.className = "nameTitle";
				nameTitleDiv.textContent = `${field?.label} ${
					field?.required || field?.value?.required ? "*" : ""
				}`;
				grpInputDiv.appendChild(nameTitleDiv);

				const numberElement = document.createElement("input");
				numberElement.type = "number";
				numberElement.id = `inputValue-${field?.key}-${item?.messageId}-${index}`;
				numberElement.placeholder =
					field?.value?.placeholder || "Enter Number...";
				numberElement.value = field?.value?.default || "";
				grpInputDiv.appendChild(numberElement);
			}

			if (field?.value?.type === "file") {
				const nameTitleDiv = document.createElement("div");
				nameTitleDiv.className = "nameTitle";
				nameTitleDiv.textContent = `${field?.label} ${
					field?.required || field?.value?.required ? "*" : ""
				}`;
				grpInputDiv.appendChild(nameTitleDiv);

				const textareaElement = document.createElement("textarea");
				textareaElement.id = `inputValue-${field?.key}-${item?.messageId}-${index}`;
				textareaElement.placeholder =
					field?.value?.placeholder || "Enter Content...";
				textareaElement.textContent = field?.value?.default || "";
				grpInputDiv.appendChild(textareaElement);
			}

			if (field?.value?.canUploadFile) {
				const formFieldLongTextElement = document.createElement("div");
				formFieldLongTextElement.className = "formField LongText";
				const fileUploadLabel = document.createElement("label");
				fileUploadLabel.textContent = "Upload";
				fileUploadLabel.className = "fileUploadLabel";
				formFieldLongTextElement.appendChild(fileUploadLabel);

				const inputField = document.createElement("input");
				inputField.type = "file";
				inputField.id = `fileUpload-${field?.key}-${item?.messageId}-${index}`;
				fileUploadLabel.appendChild(inputField);

				const removeButton = document.createElement("button");
				removeButton.textContent = "Remove";
				removeButton.id = `removeButton-${field?.key}-${item?.messageId}-${index}`;
				removeButton.style.display = "none";
				formFieldLongTextElement.appendChild(removeButton);

				grpInputDiv.appendChild(formFieldLongTextElement);
			}

			tvInputGroupDiv.appendChild(grpInputDiv);
			singleResponseWrapper.appendChild(tvInputGroupDiv);
		});
		responsesFieldWrapper.appendChild(singleResponseWrapper);
		tvBodyDiv.appendChild(responsesFieldWrapper);
	});

	const buttonWrapper = document.createElement("div");
	buttonWrapper.className = "buttonsGrp";

	const cancelButton = document.createElement("button");
	cancelButton.type = "button";
	cancelButton.textContent = "Cancel";
	cancelButton.id = `discardAnswer-${item?.messageId}`;
	buttonWrapper.appendChild(cancelButton);

	const submitButton = document.createElement("button");
	submitButton.type = "button";
	submitButton.id = `submitGptForm-${item?.messageId}`;
	submitButton.textContent = item?.content?.formFields?.submitAction?.title;
	buttonWrapper.appendChild(submitButton);

	if (item?.content?.allowMultiResponse) {
		const addResponseButton = document.createElement("button");
		addResponseButton.type = "button";
		addResponseButton.id = `addAdditionalResponse-${item?.messageId}`;
		addResponseButton.textContent = "+ Add Response";
		buttonWrapper.appendChild(addResponseButton);
	}

	translateFormViewDiv.appendChild(tvBodyDiv);

	gptAgentDiv.appendChild(translateFormViewDiv);

	tvBodyDiv.appendChild(buttonWrapper);

	setTimeout(() => {
		gptFormFunctionality(formData, item);
	}, 1000);

	return gptAgentDiv.outerHTML;
}

const initializeChoicesForElement = (el, isMulti, field, item, i) => {
	if (typeof window !== "undefined" && typeof document !== "undefined") {
		if (el) {
			let obj = {};
			if (isMulti) {
				obj = {
					silent: false,
					placeholder: true,
					addChoices: false,
					placeholderValue: "Select Multiple Options",
					searchEnabled: false,
					removeItemButton: true,
					maxItemCount: -1,
					duplicateItemsAllowed: false,
					removeItems: true,
					itemSelectText: "",
					noChoicesText: "",
				};
			} else {
				obj = {
					silent: false,
					placeholder: true,
					addChoices: false,
					placeholderValue: "Select an option",
					searchEnabled: false,
					containerOuter: `choices-${field?.key}`,
				};
			}
			const choices = new Choices(el, obj);

			let dropDownChoices = field?.value?.choices;
			if (field?.key === "prompts" && !isMulti) {
				el.addEventListener("change", (event) =>
					updateChoice(event, item, i)
				);

				dropDownChoices = field?.value?.choices.map(
					(choice, index) => ({
						...choice,
						selected:
							choice?.id === field?.value?.nested?.id ||
							index === 0,
					})
				);
			}

			choices.setChoices(dropDownChoices, "id", "label", true);
		}
	}
};

const updateChoice = (event, item, index) => {
	const currentQsn = getCurrentQuestion(item);
	event.preventDefault();
	const updatedPromptValue = event?.detail?.value;
	UpdateGPTPromptValue(currentQsn, index, updatedPromptValue, true);
};

const observeDOMChanges = (obj) => {
	let { selector, isMulti, field, index, item, callback } = obj;
	const observer = new MutationObserver((mutationsList, observer) => {
		const element = document.querySelector(selector);
		if (element) {
			observer.disconnect(); // Stop observing once the element is found
			callback(element, isMulti, field, item, index);
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });
};

export default { render };
