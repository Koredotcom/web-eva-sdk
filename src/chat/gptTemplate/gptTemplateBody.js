
const constructGptForm = (item) => {

    const formFields = item?.content?.formFields?.inputFields;
    
    const gptAgentDiv = document.createElement('div')
    gptAgentDiv.className = 'gptAgentWrapper'

    const threadNameDiv = document.createElement('div');
    threadNameDiv.className = 'threadName';
    threadNameDiv.textContent = item?.answer;
    gptAgentDiv.appendChild(threadNameDiv);

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
    delIconDiv.id = 'deleteAnswer'
    delIconDiv.className = 'delIcon';
    delIconDiv.textContent = 'Delete';
    leftNameDiv.appendChild(imgBlockDiv);
    leftNameDiv.appendChild(ltTitleDiv);
    leftNameDiv.appendChild(delIconDiv);
    tvHeaderDiv.appendChild(leftNameDiv);
    translateFormViewDiv.appendChild(tvHeaderDiv);

    const tvBodyDiv = document.createElement('div');
    tvBodyDiv.className = 'tvBody';

    formFields?.forEach(field => {
        const tvInputGroupDiv = document.createElement('div');
        tvInputGroupDiv.className = `tvInputGroup ${field?.value?.type} ${field?.value?.canUploadFile ? 'uploadGrp' : ''}`;

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
                formFieldLongTextElement.appendChild(inputField)

                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.id = `removeButton-${field?.key}`
                removeButton.style.display = 'none'; 
                formFieldLongTextElement.appendChild(removeButton);

                grpInputDiv.appendChild(formFieldLongTextElement)
            } 

            const textareaElement = document.createElement('textarea');
            textareaElement.id = `inputValue-${field?.key}`
            textareaElement.placeholder = field?.value?.placeholder || 'Enter Text...';
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
                formFieldLongTextElement.appendChild(inputField)

                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.id = `removeButton-${field?.key}`
                removeButton.style.display = 'none';
                formFieldLongTextElement.appendChild(removeButton);

                grpInputDiv.appendChild(formFieldLongTextElement)
            } 

            const textareaElement = document.createElement('textarea');
            textareaElement.id = `inputValue-${field?.key}`
            textareaElement.placeholder = field?.value?.placeholder || 'Enter Text...';
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
            textareaElement.placeholder = field?.value?.placeholder || 'Enter text...';
            textareaElement.textContent = field?.value?.default || ''
            grpInputDiv.appendChild(textareaElement)
        }

        if (field?.value?.type === 'number') {
            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpInputDiv.appendChild(nameTitleDiv);

            const numberElement = document.createElement('input');
            numberElement.type = 'number'
            numberElement.id = `inputValue-${field?.key}`
            numberElement.placeholder = field?.value?.placeholder || 'Enter Number...';
            numberElement.value = field?.value?.default || ''
            grpInputDiv.appendChild(numberElement)
        }

        if (field?.value?.type === 'file') {
            const nameTitleDiv = document.createElement('div');
            nameTitleDiv.className = 'nameTitle';
            nameTitleDiv.textContent = `${field?.label} ${(field?.required || field?.value?.required) ? '*' : ''}`;
            grpInputDiv.appendChild(nameTitleDiv);

            const textareaElement = document.createElement('textarea');
            textareaElement.id = `inputValue-${field?.key}`
            textareaElement.placeholder = field?.value?.placeholder || 'Enter Content...';
            textareaElement.textContent = field?.value?.default || ''
            grpInputDiv.appendChild(textareaElement)
        }


        tvInputGroupDiv.appendChild(grpInputDiv);
        tvBodyDiv.appendChild(tvInputGroupDiv);
    });

    const buttonWrapper = document.createElement('div')
    buttonWrapper.className = 'buttonsGrp';

    const cancelButton = document.createElement('button')
    cancelButton.type = "button";
    cancelButton.textContent = 'Cancel';
    cancelButton.id = 'discardAnswer'
    buttonWrapper.appendChild(cancelButton)

    const submitButton = document.createElement('button')
    submitButton.type = "button";
    submitButton.id = 'summarize'
    submitButton.textContent = item?.content?.formFields?.submitAction?.title;
    buttonWrapper.appendChild(submitButton)

    tvBodyDiv.appendChild(buttonWrapper)

    translateFormViewDiv.appendChild(tvBodyDiv);

    gptAgentDiv.appendChild(translateFormViewDiv)

    return gptAgentDiv

};

export default constructGptForm
