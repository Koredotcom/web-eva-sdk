import cancelAdvanceSearch from "../cancelAdvanceSearch";
import store from "../../redux/store";
import GptSubmitAction from "./gptSubmitAction";
import GptFileUpload from "./gptFileUpload";
import { setGptUploadedFiles } from "../../redux/globalSlice";
import { cloneDeep } from "lodash";
import UpdateGPTPromptValue from "./updateGPTPromptValue";
import AddAdditionalGPTResponse from "./addAdditionalGPTResponse";
import DeleteGPTResponse from "./deleteGPTResponse";
import RemoveUploadedGPTFile from "./removeUploadedGPTFile";
import { getCurrentQuestion } from "../../utils/helpers";
import SubmitGPTForm from "./submitGPTForm";

const gptFormFunctionality = (formData, item) => {

    let contextField = formData?.contextFields?.[0]

    const cancelAction = (event) => {
        event.preventDefault()
        cancelAdvanceSearch(item?.reqId)
    }

    const removeUploadedFile = (event, id) => {
        event.preventDefault();
        RemoveUploadedGPTFile(event, id)
    }

    const addResponse = (event) => {
        event.preventDefault();
        const currentQsn = getCurrentQuestion(item);
        AddAdditionalGPTResponse(currentQsn, true)
    }

    const deleteResponse = (event, index) => {
        event.preventDefault();
        const currentQsn = getCurrentQuestion(item);
        DeleteGPTResponse(currentQsn, index, true)
    }

    const submitAnswer = (event, item) => {
        event.preventDefault();
        const currentQsn = getCurrentQuestion(item);
        SubmitGPTForm(event, currentQsn)
    }

    const delIconDiv = document.getElementById('deleteAnswer');
    if(delIconDiv) {
        delIconDiv.addEventListener('click', (event) => cancelAction(event))
    }

    if (contextField?.value?.canUploadFile) {
        const inputField = document.getElementById(`fileUpload-${contextField?.key}`)
        inputField.addEventListener('change', (event) => GptFileUpload(event, `${contextField?.key}`))

        const removeButton = document.getElementById(`removeButton-${contextField?.key}`);
        removeButton.addEventListener('click', (event) => removeUploadedFile(event, `${contextField?.key}`))
    }

    formData?.fieldValues?.forEach((parameters, index) => {
        parameters?.forEach((field, i) => {

            if (field?.value?.canUploadFile) {

                const inputField = document.getElementById(`fileUpload-${field?.key}-${index}`)
                inputField.addEventListener('change', (event) => GptFileUpload(event, `${field?.key}-${index}`))

                const removeButton = document.getElementById(`removeButton-${field?.key}-${index}`);
                removeButton.addEventListener('click', (event) => removeUploadedFile(event, `${field?.key}-${index}`))
            }

            if (field?.key === "prompt") {

                const textareaElement = document.getElementById(`inputValue-${field?.key}-${index}`);
                textareaElement.value = field?.value?.default || '';
            }

            if (field?.value?.nested?.key === "prompt") {

                const textareaElement = document.getElementById(`inputValue-${field?.key}-${index}`);

                const initialPromptValue = field?.value?.nested?.value
                textareaElement.value = initialPromptValue || '';
            }
        })
        if (index > 0) {
            const deleteResponseButton = document.getElementById(`deleteResponse-${index}`)
            if (deleteResponseButton) {
                deleteResponseButton.addEventListener('click', (event) => deleteResponse(event, index))
            }
        }
    });

    const cancelButton = document.getElementById('discardAnswer')
    if(cancelButton) {
        cancelButton.addEventListener('click', (event) => cancelAction(event))
    }

    const submitButton = document.getElementById('submitGptForm')
    if(submitButton) {
        submitButton.addEventListener('click', (event) => submitAnswer(event, item))
    }

    const addAdditionalResponseButton = document.getElementById('addAdditionalResponse')
    if(addAdditionalResponseButton) {
        addAdditionalResponseButton.addEventListener('click', (event) => addResponse(event))
    }
};

export default gptFormFunctionality;