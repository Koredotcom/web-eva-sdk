
import axios from "axios";
import cancelAdvanceSearch from "../cancelAdvanceSearch";
import InitiateChatConversationAction from "../InitiateChatConversationAction";
import FileUploader from "../../utils/fileUploader";
import store from "../../redux/store";
import { generateComponentId, getFileExtension, getUID } from "../../utils/helpers";
import GptSubmitAction from "./gptSubmitAction";
import GptFileUpload from "./gptFileUpload";
import { setGptUploadedFiles } from "../../redux/globalSlice";

const gptFormFunctionality = (item) => {

    const formFields = item?.content?.formFields?.inputFields;

    const cancelAction = (event) => {
        event.preventDefault()
        cancelAdvanceSearch(item?.reqId)
    }

    const removeUploadedFile = (event, id) => {
        event.preventDefault();
        const reqdInputField = document.getElementById(`fileUpload-${id}`)
        reqdInputField.value = ''
        store.dispatch(setGptUploadedFiles(null))

        const reqdTextArea = document.getElementById(`inputValue-${id}`)
        reqdTextArea.style.display = 'block';

        const reqdButton = document.getElementById(`removeButton-${id}`)
        reqdButton.style.display = 'none'
    }

    const delIconDiv = document.getElementById('deleteAnswer');
    if(delIconDiv) {
        delIconDiv.addEventListener('click', (event) => cancelAction(event))
    }

    formFields?.forEach(field => {
        if (field?.value?.type === "richText" && field?.key === "content") {
            if (field?.value?.canUploadFile) {

                const inputField = document.getElementById(`fileUpload-${field?.key}`)
                inputField.addEventListener('change', (event) => GptFileUpload(event, field?.key))

                const removeButton = document.getElementById(`removeButton-${field?.key}`);
                removeButton.addEventListener('click', (event) => removeUploadedFile(event, field?.key))
            }
        }

        if (field?.value?.type === "longText" && field?.key !== "prompts" && field?.key !== "prompt") {

            if (field?.value?.canUploadFile) {

                const inputField = document.getElementById(`fileUpload-${field?.key}`)
                inputField.addEventListener('change', (event) => GptFileUpload(event, field?.key))

                const removeButton = document.getElementById(`removeButton-${field?.key}`);
                removeButton.addEventListener('click', () => removeUploadedFile(field?.key))
            }
        }

        if (field?.key === "prompt") {

            const textareaElement = document.getElementById(`inputValue-${field?.key}`);
            textareaElement.value = field?.value?.default || '';
        }

        if (field?.value?.nested?.key === "prompt") {

            const textareaElement = document.getElementById(`inputValue-${field?.key}`);

            const initialPromptValue = formFields?.find(field => field?.key === "prompts")?.value?.nested?.value?.values?.[0]?.value
            textareaElement.value = field?.value?.default || initialPromptValue || '';
        }
    });

    const cancelButton = document.getElementById('discardAnswer')
    if(cancelButton) {
        cancelButton.addEventListener('click', (event) => cancelAction(event))
    }

    const submitButton = document.getElementById('submitGptForm')
    if(submitButton) {
        submitButton.addEventListener('click', (event) => GptSubmitAction(event, item))
    }
};

export default gptFormFunctionality;