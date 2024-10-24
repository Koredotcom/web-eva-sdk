import Choices from "choices.js";

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

            // Initialize Choices.js when the dropdown is available
            observeDOMChanges(`#dropdownValue-${field?.key}`, false, field, initializeChoicesForElement);

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

            const dropdownElement = document.createElement('select')
            dropdownElement.id = `dropdownValue-${field?.key}`
            dropdownElement.setAttribute('multiple', true);


             // Initialize Choices.js when the dropdown is available
             observeDOMChanges(`#dropdownValue-${field?.key}`, true, field, initializeChoicesForElement);

            grpWrapDiv.appendChild(dropdownElement);
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
    submitButton.id = 'submitGptForm'
    submitButton.textContent = item?.content?.formFields?.submitAction?.title;
    buttonWrapper.appendChild(submitButton)

    tvBodyDiv.appendChild(buttonWrapper)

    translateFormViewDiv.appendChild(tvBodyDiv);

    gptAgentDiv.appendChild(translateFormViewDiv)

    return gptAgentDiv

};

export default constructGptForm


const initializeChoicesForElement = (el, isMulti, field) => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        if (el) {
            let obj = {}
            if(isMulti) {
                obj = {
                    silent: false,
                    placeholder: true,
                    addChoices: false,
                    placeholderValue: 'Select Multiple Options',
                    searchEnabled: false, 
                    removeItemButton: true,
                    maxItemCount : -1,
                    duplicateItemsAllowed: false, 
                    removeItems: true, 
                    itemSelectText: '', 
                    noChoicesText: '', 
                }
            } else {
                obj = {
                    silent: false,
                    placeholder: true,
                    addChoices: false,
                    placeholderValue: 'Select an option',
                    searchEnabled: false,
                    containerOuter: `choices-${field?.key}`
                }
            }
            const choices = new Choices(el, obj);

            let dropDownChoices = field?.value?.choices;
            if (field?.key === 'prompts' && !isMulti) {
                el.addEventListener('change', updateTextarea);
                dropDownChoices = field?.value?.choices.map((choice, index) => ({
                    ...choice,
                    selected: index === 0 
                }));
            }

            choices.setChoices(dropDownChoices, 'id', 'label', true);
        }
    }
}

const observeDOMChanges = (selector, isMulti, field, callback) => {
    const observer = new MutationObserver((mutationsList, observer) => {
        const element = document.querySelector(selector);
        if (element) {
            observer.disconnect();  // Stop observing once the element is found
            callback(element, isMulti, field);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
};
