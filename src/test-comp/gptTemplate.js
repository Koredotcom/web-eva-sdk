
import axios from "axios";
import cancelAdvanceSearch from "../chat/cancelAdvanceSearch";
import InitiateChatConversationAction from "../chat/InitiateChatConversationAction";
import fileUploader from "./fileUploader";
import { generateComponentId, getFileExtension, getUID } from "../components/helpers";

const constructGptForm = (item) => {

    let formAlreadyExists = document.getElementById(item?.reqId)
    if(formAlreadyExists){
        return;
    }

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
        let payload = {}
        payload.question = item?.question

        let formData = item?.content?.formFields?.inputFields?.reduce((acc, field) => {

            let reqdInputElement;
            let reqdValue;
            if(field?.value?.type === 'dropdown'){
                if(field?.value?.multi){
                    const reqdInputElement = document.getElementById(`dropdownValue-${field?.key}`);
                    const reqdValues = Array.from(reqdInputElement.selectedOptions).map(option => option.value);
                    reqdValue = reqdValues
                }else{   
                reqdInputElement = document.getElementById(`dropdownValue-${field?.key}`)
                reqdValue = reqdInputElement.value;
                }
            }
            else if(field?.value?.canUploadFile && fileId){
                reqdValue = fileId;
            }
            else{
                reqdInputElement = document.getElementById(`inputValue-${field?.key}`)
                reqdValue = reqdInputElement.value 
            }

            if(field?.required || field?.value?.required){
                if(reqdValue.length === 0){
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
        if(singlePrompt){
            const promptValue = document.getElementById(`inputValue-${singlePrompt?.key}`)
            formData.prompt = promptValue.value
        }else if(multiPrompt){
            const promptValue = document.getElementById(`inputValue-${multiPrompt?.key}`)
            formData.prompt = promptValue.value
        }

        payload.formData = formData || {}
        payload.messageId = item?.messageId

        let obj = { payload: payload, createIssue: true, from: "gptAgent", botQuestionId: item?.id }
        if (item?.isTask) {
            obj.multiIntentExecution = true
        }

        InitiateChatConversationAction({payload : payload})
        let currentForm = document.getElementById(item?.reqId)
        currentForm.remove()
        // console.log(payload)
    }

    const cancelAction = (event) => {
        event.preventDefault()
        cancelAdvanceSearch(item?.reqId)
    }

    const uploadFile = (event, id) => {
        if(event.target.files.length > 0){
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
            source : source
        }

        const u = fileUploader(uploadConfig);

        obj.fileName = u?.file?.name
        obj.title = u?.file?.name
        obj.source = "attachment"
        obj.extName = getFileExtension(u?.file?.name)

        u.initiateFileUpload((file) => {
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
            })
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

    const form = document.createElement('form');
    form.id = item?.reqId

    const threadNameDiv = document.createElement('div');
    threadNameDiv.className = 'threadName';
    threadNameDiv.textContent = item?.answer;
    form.appendChild(threadNameDiv);

    const translateFormViewDiv = document.createElement('div');
    translateFormViewDiv.className = 'translateForm-view';

    const tvHeaderDiv = document.createElement('div');
    tvHeaderDiv.className = 'tvHeader';

    const leftNameDiv = document.createElement('div');
    leftNameDiv.className = 'leftName';

    const imgBlockDiv = document.createElement('div');
    imgBlockDiv.className = 'imgBlock';
    const imgElement = document.createElement('img');
    imgElement.src = item?.content?.formFields?.icon;
    imgElement.alt = '';
    imgBlockDiv.appendChild(imgElement);

    const ltTitleDiv = document.createElement('div');
    ltTitleDiv.className = 'ltTitle';
    ltTitleDiv.textContent = item?.content?.formFields?.title;

    const delIconDiv = document.createElement('button');
    delIconDiv.className = 'delIcon';
    delIconDiv.textContent = 'Delete';
    delIconDiv.addEventListener('click', (event) => cancelAction(event))

    leftNameDiv.appendChild(imgBlockDiv);
    leftNameDiv.appendChild(ltTitleDiv);
    leftNameDiv.appendChild(delIconDiv);
    tvHeaderDiv.appendChild(leftNameDiv);
    translateFormViewDiv.appendChild(tvHeaderDiv);

    const tvBodyDiv = document.createElement('div');
    tvBodyDiv.className = 'tvBody';

    formFields?.forEach(field => {
        const tvInputGroupDiv = document.createElement('div');
        tvInputGroupDiv.className = 'tvInputGroup';

        const grpInputDiv = document.createElement('div');
        grpInputDiv.className = 'grpInput';

        if (field?.value?.type === "richText" && field?.key === "content") {
            const grpWrapDiv = document.createElement('div');
            grpWrapDiv.className = 'grpwrap';

            const grpNameDiv = document.createElement('div');
            grpNameDiv.className = 'grpName';

            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpNameDiv.appendChild(nameTitleDiv);
            grpWrapDiv.appendChild(grpNameDiv);
            grpInputDiv.appendChild(grpWrapDiv);

            if (field?.value?.canUploadFile) {
                const formFieldLongTextElement = document.createElement('div')
                formFieldLongTextElement.className = 'formField LongText'
                const fileUploadLabel = document.createElement('label')
                fileUploadLabel.textContent = 'Upload';
                formFieldLongTextElement.appendChild(fileUploadLabel)

                const inputField = document.createElement('input')
                inputField.type = 'file';
                inputField.id = `fileUpload-${field?.key}`
                inputField.addEventListener('change', (event) => uploadFile(event, field?.key))
                formFieldLongTextElement.appendChild(inputField)

                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.id = `removeButton-${field?.key}`
                removeButton.style.display = 'none'; // Hidden initially
                removeButton.addEventListener('click', (event) => removeUploadedFile(event, field?.key))
                formFieldLongTextElement.appendChild(removeButton);

                grpInputDiv.appendChild(formFieldLongTextElement)
            } 

            const textareaElement = document.createElement('textarea');
            textareaElement.id = `inputValue-${field?.key}`
            textareaElement.placeholder = field?.value?.placeholder;
            textareaElement.textContent = field?.value?.default || ''
            grpInputDiv.appendChild(textareaElement)
        }

        if (field?.value?.type === "longText" && field?.key !== "prompts" && field?.key !== "prompt") {
            const grpWrapDiv = document.createElement('div');
            grpWrapDiv.className = 'grpwrap';

            const grpNameDiv = document.createElement('div');
            grpNameDiv.className = 'grpName';

            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpNameDiv.appendChild(nameTitleDiv);
            grpWrapDiv.appendChild(grpNameDiv);
            grpInputDiv.appendChild(grpWrapDiv);

            if (field?.value?.canUploadFile) {
                const formFieldLongTextElement = document.createElement('div')
                formFieldLongTextElement.className = 'formField LongText'
                const fileUploadLabel = document.createElement('label')
                fileUploadLabel.textContent = 'Upload';
                formFieldLongTextElement.appendChild(fileUploadLabel)

                const inputField = document.createElement('input')
                inputField.type = 'file';
                inputField.id = `fileUpload-${field?.key}`
                inputField.addEventListener('change', (event) => uploadFile(event, field?.key))
                formFieldLongTextElement.appendChild(inputField)

                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.id = `removeButton-${field?.key}`
                removeButton.style.display = 'none';
                removeButton.addEventListener('click', () => removeUploadedFile(field?.key))
                formFieldLongTextElement.appendChild(removeButton);

                grpInputDiv.appendChild(formFieldLongTextElement)
            } 

            const textareaElement = document.createElement('textarea');
            textareaElement.id = `inputValue-${field?.key}`
            textareaElement.placeholder = field?.value?.placeholder;
            textareaElement.textContent = field?.value?.default || ''
            grpInputDiv.appendChild(textareaElement)
        }

        if (field?.value?.type === "dropdown" && !field?.value?.multi) {
            const grpWrapDiv = document.createElement('div');
            grpWrapDiv.className = 'grpwrap';

            const grpNameDiv = document.createElement('div');
            grpNameDiv.className = 'grpName';

            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpNameDiv.appendChild(nameTitleDiv);
            grpWrapDiv.appendChild(grpNameDiv);

            const selectElement = document.createElement('select');
            selectElement.id = `dropdownValue-${field?.key}`;
            selectElement.name = field?.label;

            if (field?.key === 'prompts') {
                // selectElement.className = 'promptValuesDropdown'
                selectElement.addEventListener('change', updateTextarea);
            }

            field?.value?.choices?.forEach(choice => {
                const optionElement = document.createElement('option');
                optionElement.value = choice?.id;
                optionElement.textContent = choice?.label;
                selectElement.appendChild(optionElement);
            });

            grpWrapDiv.appendChild(selectElement);
            grpInputDiv.appendChild(grpWrapDiv);
        }

        if (field?.value?.type === "dropdown" && field?.value?.multi) {
            const grpWrapDiv = document.createElement('div');
            grpWrapDiv.className = 'grpwrap';

            const grpNameDiv = document.createElement('div');
            grpNameDiv.className = 'grpName';

            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpNameDiv.appendChild(nameTitleDiv);
            grpWrapDiv.appendChild(grpNameDiv);

            const selectElement = document.createElement('select');
            selectElement.id = `dropdownValue-${field?.key}`;
            selectElement.name = field?.label;
            selectElement.size = "1"
            selectElement.multiple = true

            field?.value?.choices?.forEach(choice => {
                const optionElement = document.createElement('option');
                optionElement.value = choice?.id;
                optionElement.textContent = choice?.label;
                selectElement.appendChild(optionElement);
            });

            grpWrapDiv.appendChild(selectElement);
            grpInputDiv.appendChild(grpWrapDiv);
        }

        if (field?.key === "prompt") {
            const grpWrapDiv = document.createElement('div');
            grpWrapDiv.className = 'grpwrap';

            const grpNameDiv = document.createElement('div');
            grpNameDiv.className = 'grpName';

            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpNameDiv.appendChild(nameTitleDiv);
            grpWrapDiv.appendChild(grpNameDiv);

            const textareaElement = document.createElement('textarea');
            textareaElement.className = 'promptId';
            textareaElement.id = `inputValue-${field?.key}`;
            textareaElement.rows = 10;
            textareaElement.cols = 30;
            textareaElement.value = field?.value?.default || '';
            if (field?.value?.readOnly) {
                textareaElement.disabled = true;
            }

            grpWrapDiv.appendChild(textareaElement);
            grpInputDiv.appendChild(grpWrapDiv);
        }

        if (field?.value?.nested?.key === "prompt") {
            const grpWrapDiv = document.createElement('div');
            grpWrapDiv.className = 'grpwrap';

            const grpNameDiv = document.createElement('div');
            grpNameDiv.className = 'grpName';

            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpNameDiv.appendChild(nameTitleDiv);
            grpWrapDiv.appendChild(grpNameDiv);

            const textareaElement = document.createElement('textarea');
            textareaElement.className = 'promptId';
            textareaElement.id = `inputValue-${field?.key}`;
            textareaElement.rows = 10;
            textareaElement.cols = 30;

            const initialPromptValue = formFields?.find(field => field?.key === "prompts")?.value?.nested?.value?.values?.[0]?.value
            textareaElement.value = field?.value?.default || initialPromptValue || '';
            if (field?.value?.nested?.readOnly) {
                textareaElement.disabled = true;
            }

            grpWrapDiv.appendChild(textareaElement);
            grpInputDiv.appendChild(grpWrapDiv);
        }

        if (field?.value?.type === 'simpleText') {
            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpInputDiv.appendChild(nameTitleDiv);

            const textareaElement = document.createElement('textarea');
            textareaElement.id = `inputValue-${field?.key}`
            textareaElement.placeholder = field?.value?.placeholder;
            textareaElement.textContent = field?.value?.default || ''
            grpInputDiv.appendChild(textareaElement)
        }

        if (field?.value?.type === 'number') {
            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpInputDiv.appendChild(nameTitleDiv);

            const textareaElement = document.createElement('textarea');
            textareaElement.id = `inputValue-${field?.key}`
            textareaElement.placeholder = field?.value?.placeholder;
            textareaElement.textContent = field?.value?.default || ''
            grpInputDiv.appendChild(textareaElement)
        }

        if (field?.value?.type === 'file') {
            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpInputDiv.appendChild(nameTitleDiv);

            const textareaElement = document.createElement('textarea');
            textareaElement.id = `inputValue-${field?.key}`
            textareaElement.placeholder = field?.value?.placeholder;
            textareaElement.textContent = field?.value?.default || ''
            grpInputDiv.appendChild(textareaElement)
        }


        tvInputGroupDiv.appendChild(grpInputDiv);
        tvBodyDiv.appendChild(tvInputGroupDiv);
    });

    const cancelButton = document.createElement('button')
    cancelButton.type = "button";
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', (event) => cancelAction(event))
    tvBodyDiv.appendChild(cancelButton);

    const submitButton = document.createElement('button')
    submitButton.type = "button";
    submitButton.textContent = item?.content?.formFields?.submitAction?.title;
    submitButton.addEventListener('click', (event) => submitAction(event))
    tvBodyDiv.appendChild(submitButton);


    translateFormViewDiv.appendChild(tvBodyDiv);
    form.appendChild(translateFormViewDiv);
    // return form.innerHTML
    document.body.append(form)

};

export default constructGptForm
