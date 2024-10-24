import store from "../../redux/store";
import InitiateChatConversationAction from "../InitiateChatConversationAction";

const GptSubmitAction = (event, question) => {
    event?.preventDefault()
    const state = store.getState().global;
    const uploadedFiles = state.GptUploadedFiles;

    let payload = {}
    if(state.activeBoardId) {
        payload.activeBoardId = state.activeBoardId
    }
    payload.question = question?.question

    let formData = question?.content?.formFields?.inputFields?.reduce((acc, field) => {
        let reqdInputElement;
        let reqdValue;
    
        if (field?.value?.type === 'dropdown') {
            reqdInputElement = document.getElementById(`dropdownValue-${field?.key}`);
            
            if (field?.value?.multi) {
                const reqdValues = Array.from(reqdInputElement.selectedOptions).map(option => option.value);
                reqdValue = reqdValues; // Now an array
            } else {
                reqdValue = reqdInputElement.value; // Single value
            }
        }
        else {
            reqdInputElement = document.getElementById(`inputValue-${field?.key}`)
            reqdValue = reqdInputElement.value
        }

        if (field?.required || field?.value?.required) {
            if (reqdValue?.length === 0) {
                return;
            }
        }

        acc[field.key] = {
            type: field?.value?.type,
            required: !!field?.value?.required
        };
    
        if (reqdValue) {
            acc[field.key].value = reqdValue;
        }

        if(field?.value?.canUploadFile && uploadedFiles && (Object.keys(uploadedFiles)?.includes(field.key))){
            let index = Object.keys(uploadedFiles).indexOf(field?.key)
            acc[field.key] = Object.values(uploadedFiles)[index]
        }

        return acc;
    }, {});
    

    let singlePrompt = question?.content?.formFields?.inputFields?.find(field => field.key === "prompt")
    let multiPrompt = question?.content?.formFields?.inputFields?.find(field => field.key === "prompts")
    if (singlePrompt) {
        const promptValue = document.getElementById(`inputValue-${singlePrompt?.key}`)
        formData.prompt = promptValue.value
    } else if (multiPrompt) {
        const promptValue = document.getElementById(`inputValue-${multiPrompt?.key}`)
        formData.prompt = promptValue.value
    }

    payload.formData = formData || {}
    payload.messageId = question?.messageId

    let obj = { createIssue: true, from: "gptAgent", botQuestionId: question?.id}
    if (question?.isTask) {
        obj.multiIntentExecution = true
    }
    InitiateChatConversationAction({payload, ...obj})
}

export default GptSubmitAction;