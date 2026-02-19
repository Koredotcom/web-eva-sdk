import { JSONEditor } from "@json-editor/json-editor";
import { InitiateChatConversationAction } from "../../chat";

function transformContentToSchema(content) {
	if (!content || !content.schema) return null;

	const processSchema = (schema) => {
		if (!schema || typeof schema !== "object" || Array.isArray(schema))
			return schema;

		if (schema.type === "array" && schema.items) {
			return {
				...schema,
				minItems: schema.minItems !== undefined ? schema.minItems : 0,
				items: processSchema(schema.items),
			};
		}

		if (schema.properties) {
			const processedProperties = {};
			Object.keys(schema.properties).forEach((key) => {
				processedProperties[key] = processSchema(schema.properties[key]);
			});
			return { ...schema, properties: processedProperties };
		}

		return schema;
	};

	return processSchema({
		title: content.title || "Dynamic Form",
		type: content.schema.type || "object",
		required: content.schema.required || [],
		properties: content.schema.properties || {},
	});
}

function generateInitialData(schema) {
	if (!schema || typeof schema !== "object") return undefined;
	if (schema.type === "object" && schema.properties) {
		const obj = {};
		Object.keys(schema.properties).forEach((key) => {
			obj[key] = generateInitialData(schema.properties[key]);
		});
		return obj;
	}
	if (schema.type === "array") {
		const min = schema.minItems ?? 0;
		const itemSchema = schema.items;
		return Array.from({ length: min }, () => generateInitialData(itemSchema));
	}
	if (schema.default !== undefined) return schema.default;
	if (schema.type === "string") return "";
	if (schema.type === "number" || schema.type === "integer") return 0;
	if (schema.type === "boolean") return false;
	if (schema.type === "null") return null;
	return undefined;
}

function generateInitialDataFromContent(content) {
	if (!content) return {};
	if (content.resolvedEntities) return content.resolvedEntities;
	const schema = transformContentToSchema(content);
	return schema ? generateInitialData(schema) || {} : {};
}

function initMcpJsonEditor(item) {
	const id = item?.id ?? item?.messageId;
	if (!id) return;
	const container = document.getElementById(`mcp-json-editor-${id}`);
	if (!container || !item?.content) return;

	// Prevent duplicate form: destroy existing editor if this container was already initialized
	if (container._mcpEditor) {
		try {
			container._mcpEditor.destroy();
		} catch (e) {
			// ignore
		}
		container._mcpEditor = null;
		container.innerHTML = "";
	}

	const schema = transformContentToSchema(item.content);
	const initialData = generateInitialDataFromContent(item.content);
	if (!schema) return;

	try {
		const editorOptions = {
			schema,
			startval: initialData,
			theme: "bootstrap4",
			iconlib: "bootstrap4",
			no_additional_properties: false,
			disable_edit_json: true,
			disable_collapse: false,
			disable_properties: true,
			disable_array_add: false,
			disable_array_delete: false,
			disable_array_reorder: true,
			show_errors: "interaction",
			compact: false,
			remove_empty_properties: false,
			use_default_values: true,
			template: "default",
			object_layout: "normal",
			show_opt_in: false,
			required_by_default: false,
			keep_oneof_values: true,
			ajax: false,
			format: "html",
			display_required_only: false,
			button_text: {
				add: "+ Add Item",
				add_property: "+ Add Property",
				delete: "Delete",
				remove: "Delete",
			},
		};

		const editor = new JSONEditor(container, editorOptions);

		editor.on("ready", () => {
			container._mcpEditor = editor;
			const submitBtn = document.getElementById(`submitMcpForm-${id}`);
			if (!submitBtn) return;
			// Remove previous listener so we don't double-fire when editor was re-initialized
			if (submitBtn._mcpSubmitHandler) {
				submitBtn.removeEventListener("click", submitBtn._mcpSubmitHandler);
			}
			const handleSubmit = () => {
				if (!container._mcpEditor) return;
				setTimeout(() => {
					try {
						if (!container._mcpEditor) return;
						const data = container._mcpEditor.getValue();
						console.log("MCP form data (submit):", data);
                        let payload = {formData: data, messageId: id, question: item?.question}
                        if(item?.isTask){
                            payload.isTask = true
                            payload.parentMsgId = item?.parentMsgId
                        }
						InitiateChatConversationAction({payload, createIssue: true, from: "mcpAgent"});
					} catch (err) {
						console.error("MCP form submit error:", err);
					}
				}, 0);
			};
			submitBtn._mcpSubmitHandler = handleSubmit;
			submitBtn.addEventListener("click", handleSubmit);
		});

		editor.on("change", () => {
			try {
				const data = editor.getValue();
				console.log("MCP form data (change):", data);
				if (typeof item.onFormChange === "function") {
					item.onFormChange(data);
				}
			} catch (err) {
				console.error("MCP form change error:", err);
			}
		});
	} catch (err) {
		console.error("Error initializing MCP JSON Editor:", err);
	}
}

export function render(item) {
	const content = item?.content ?? {};
	const schema = transformContentToSchema(content);
	const initialData = generateInitialDataFromContent(content);

	const wrapper = document.createElement("div");
	wrapper.className = "mcpAgentWrapper";

	const titleEl = document.createElement("div");
	titleEl.className = "mcpForm-title";
	titleEl.textContent = content?.title || schema?.title || "Form";
	wrapper.appendChild(titleEl);

	const editorContainer = document.createElement("div");
	const id = item?.id ?? item?.messageId ?? "mcp-" + Date.now();
	editorContainer.id = `mcp-json-editor-${id}`;
	editorContainer.className = "mcp-json-editor-container editor-content-wrapper";
	wrapper.appendChild(editorContainer);

	const buttonWrapper = document.createElement("div");
	buttonWrapper.className = "buttonsGrp mcp-form-buttons";

	const cancelButton = document.createElement("button");
	cancelButton.type = "button";
	cancelButton.className = "mcp-form-cancel";
	cancelButton.textContent = "Cancel";
	cancelButton.id = `discardMcpForm-${id}`;
	buttonWrapper.appendChild(cancelButton);

	const submitButton = document.createElement("button");
	submitButton.type = "button";
	submitButton.className = "mcp-form-submit";
	submitButton.textContent = item?.content?.formFields?.submitAction?.title ?? "Submit";
	submitButton.id = `submitMcpForm-${id}`;
	buttonWrapper.appendChild(submitButton);

	wrapper.appendChild(buttonWrapper);

	const html = wrapper.outerHTML;

	setTimeout(() => {
		initMcpJsonEditor(item);
	}, 100);

	return html;
}

export default { render, transformContentToSchema, generateInitialDataFromContent };
