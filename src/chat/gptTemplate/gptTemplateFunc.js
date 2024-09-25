
import axios from "axios";
import cancelAdvanceSearch from "../cancelAdvanceSearch";
import InitiateChatConversationAction from "../InitiateChatConversationAction";
import { generateComponentId, getFileExtension, getUID } from "../../components/helpers";
import FileUploader from "../../utils/fileUploader";
import store from "../../redux/store";


const gptFormFunctionality = (item) => {

    let fileId = null;

    const formFields = item?.content?.formFields?.inputFields;

    const updateTextarea = (event) => {
        const selectElement = event.target;
        const promptIdValue = selectElement.value;

        const promptFieldValues = formFields?.find(field => field?.key === "prompts")
        let promptContainerValue = promptFieldValues?.value?.nested?.value?.values?.find(val => val.id === promptIdValue)?.value
        const textareaElement = document.getElementById(`inputValue-prompts`);
        textareaElement.value = promptContainerValue;
    };

    const submitAction = (event) => {
        event.preventDefault()
        const state = store.getState().global;

        let payload = {}
        if(state.activeBoardId) {
            payload.activeBoardId = state.activeBoardId
        }
        payload.question = item?.question

        let formData = item?.content?.formFields?.inputFields?.reduce((acc, field) => {

            let reqdInputElement;
            let reqdValue;
            if (field?.value?.type === 'dropdown') {
                if (field?.value?.multi) {
                    const reqdInputElement = document.getElementById(`dropdownValue-${field?.key}`);
                    const reqdValues = Array.from(reqdInputElement.selectedOptions).map(option => option.value);
                    reqdValue = reqdValues
                } else {
                    reqdInputElement = document.getElementById(`dropdownValue-${field?.key}`)
                    reqdValue = reqdInputElement.value;
                }
            }
            else if (field?.value?.canUploadFile && fileId) {
                reqdValue = fileId;
            }
            else {
                reqdInputElement = document.getElementById(`inputValue-${field?.key}`)
                reqdValue = reqdInputElement.value
            }

            if (field?.required || field?.value?.required) {
                if (reqdValue.length === 0) {
                    return;
                }
            }

            acc[field.key] = {
                type: field?.value?.type,
                required: !!field?.value?.required ? true : false
            };

            if (reqdValue) {
                acc[field.key].value = reqdValue;
            }

            return acc;
        }, {});

        let singlePrompt = item?.content?.formFields?.inputFields?.find(field => field.key === "prompt")
        let multiPrompt = item?.content?.formFields?.inputFields?.find(field => field.key === "prompts")
        if (singlePrompt) {
            const promptValue = document.getElementById(`inputValue-${singlePrompt?.key}`)
            formData.prompt = promptValue.value
        } else if (multiPrompt) {
            const promptValue = document.getElementById(`inputValue-${multiPrompt?.key}`)
            formData.prompt = promptValue.value
        }

        payload.formData = formData || {}
        payload.messageId = item?.messageId

        let obj = { createIssue: true, from: "gptAgent", botQuestionId: item?.id}
        if (item?.isTask) {
            obj.multiIntentExecution = true
        }

        InitiateChatConversationAction({payload, ...obj})
    }

    const cancelAction = (event) => {
        event.preventDefault()
        cancelAdvanceSearch(item?.reqId)
    }

    const uploadFile = (event, id) => {
        if (event.target.files.length > 0) {
            uploadFileInitial(event.target.files[0], id)
        }
    }


    const uploadFileInitial = (file, id) => {
        console.log(window.sdkConfig)
        let userId = window.sdkConfig.userId;
        let userAccessToken = window.sdkConfig.accessToken;
        const source = axios.CancelToken.source();
        let obj = {
            mediaName: getUID(6),
            loading: true,
        };

        const uploadConfig = {
            file,
            userInfoId: userId,
            fileContext: 'knowledge',
            userAccessToken: userAccessToken,
            mediaName: obj.mediaName,
            source: source
        }

        const u = new FileUploader(uploadConfig);

        obj.fileName = u?.file?.name
        obj.title = u?.file?.name
        obj.source = "attachment"
        obj.extName = getFileExtension(u?.file?.name)

        u.start(
            (res) => { }, (file) => {
                let componentId = generateComponentId();
                console.log(file)
                let f = {
                    ...file,
                    loading: false,
                    componentId,
                    extName: getFileExtension(file?.fileName),
                    source: "attachment",
                    title: file?.fileName,
                    docId: file?.fileUrl?.fileId
                }

                fileId = file?.fileUrl?.fileId


                const reqdTextArea = document.getElementById(`inputValue-${id}`)
                reqdTextArea.style.display = 'none';

                const reqdButton = document.getElementById(`removeButton-${id}`)
                reqdButton.style.display = 'block'
            },
            (msg) => console.log(msg))
    }


    const removeUploadedFile = (event, id) => {
        event.preventDefault();
        const reqdInputField = document.getElementById(`fileUpload-${id}`)
        reqdInputField.value = ''
        fileId = null;

        const reqdTextArea = document.getElementById(`inputValue-${id}`)
        reqdTextArea.style.display = 'block';

        const reqdButton = document.getElementById(`removeButton-${id}`)
        reqdButton.style.display = 'none'
    }


    const delIconDiv = document.getElementById('deleteAnswer');
    delIconDiv.addEventListener('click', (event) => cancelAction(event))

    formFields?.forEach(field => {
        if (field?.value?.type === "richText" && field?.key === "content") {
            if (field?.value?.canUploadFile) {

                const inputField = document.getElementById(`fileUpload-${field?.key}`)
                inputField.addEventListener('change', (event) => uploadFile(event, field?.key))

                const removeButton = document.getElementById(`removeButton-${field?.key}`);
                removeButton.addEventListener('click', (event) => removeUploadedFile(event, field?.key))
            }
        }

        if (field?.value?.type === "longText" && field?.key !== "prompts" && field?.key !== "prompt") {

            if (field?.value?.canUploadFile) {

                const inputField = document.getElementById(`fileUpload-${field?.key}`)
                inputField.addEventListener('change', (event) => uploadFile(event, field?.key))

                const removeButton = document.getElementById(`removeButton-${field?.key}`);
                removeButton.addEventListener('click', () => removeUploadedFile(field?.key))
            }
        }

        if (field?.value?.type === "dropdown" && !field?.value?.multi) {

            const selectElement = document.getElementById(`dropdownValue-${field?.key}`);

            if (field?.key === 'prompts') {
                selectElement.addEventListener('change', updateTextarea);
            }
        }

        if (field?.value?.type === "dropdown" && field?.value?.multi) {

            const selectElement = document.getElementById(`dropdownValue-${field?.key}`);
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
    cancelButton.addEventListener('click', (event) => cancelAction(event))

    const submitButton = document.getElementById('summarize')
    submitButton.addEventListener('click', (event) => submitAction(event))


};

export default gptFormFunctionality;
