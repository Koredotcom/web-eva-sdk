import { cancelAdvanceSearch, InitiateChatConversationAction } from "../../chat";

const InterruptionTemplateFunc = (data) => {

    const continueAction = (actionId = null) => {
        let selectedChoices = {};
        let textareaValue = "";

        const interruptionFields = data?.templateInfo?.interruptionFields;
        interruptionFields?.forEach(option => {
            if (option?.value?.type === "checkbox" || option?.value?.type === "nestedCheckbox") {

            } else if (option?.value?.type === "dropdown" && option?.dynamic === true) {

            } else if (option?.value?.type === "text" || option?.value?.type === "number") {

            } else if (option?.value?.type === "groupedCheckbox") {
                let selectedIndex;
                option?.value?.groups?.forEach((group, index) => {
                    const checkboxGroup = document.querySelector(`input[name="radio-${option.key}"]:checked`);
                    selectedIndex = checkboxGroup.getAttribute("key");
                    console.log(checkboxGroup, selectedIndex);
                    selectedChoices[option.key] = [group.choices[selectedIndex]]
                })
               ;
            } else if (option?.value?.type === "date") {

            } else if (option?.value?.type === "heading") {

            } else if (option?.value?.type === "textarea") {
                textareaValue = document.querySelector(`.textarea-${option?.value?.type}`).value;

            } else if (option?.value?.type === "buttons") {
                if(actionId === option?.value?.buttons[0]?.id){
                    selectedChoices[option?.key] = option?.value?.buttons[0]?.label;
                }
            }
        })
        let payload = {
            messageId: data?.messageId,
            question: data?.question,
            resolved: transformData(selectedChoices),
            boardId: data?.boardId,
            resolvedInterruption: true,
        }
        if (actionId) {
            payload.resolved = {
                actionId: actionId,
                comment: textareaValue,
                ...transformData(selectedChoices)
            }
        }

        const params = { qId: data?.id, type: data?.type, reqId: data?.reqId }
        console.log(payload, params)
    }

    const transformData = (originalData) => {
        console.log(originalData)
        const transformedData = {};
        for (const key in originalData) {
            if (Object.hasOwnProperty.call(originalData, key)) {
                const items = originalData[key];
                if(!!items) {
                    if (key === 'source' || key === 'project') {
                        transformedData[key] = items.map(item => {
                            const newItem = { id: item.id };
                            if (item.nestedChoices) {
                                newItem[item.customType] = item?.nestedChoices.map(choice => choice.id);
                            }
                            return newItem;
                        });
                    } else {
                        if(key === 'meeting_time_range'){
                            transformedData[key] =  items?.map(item => ({id: item?.id, label: item?.label}));
                        } else{
                            if(items[0]?.isFieldMulti){
                                transformedData[key] = items?.map(item => item?.id || item?.label);
                            } else {
                                transformedData[key] = items[0].id || items[0]?.label;
                            }
                        } 
                    }
                }
            }
        }
        return transformedData ?? {};
    }

    const cancelAction = () => {
        cancelAdvanceSearch(data?.reqId)
    }



    const container = document.getElementById(`interruption-template-${data?.id}`);

    if (container) {
        const interruptionFields = data?.templateInfo?.interruptionFields;


        interruptionFields?.forEach(field => {
            const buttons = field?.value?.buttons;
            buttons?.forEach((button, index) => {
                const buttonElement = document.querySelector(`.buttons-${index}`);
                buttonElement?.addEventListener("click", () => {
                    continueAction(button);
                });
            });
        });

        if (!interruptionFields?.some(f => f?.value?.type === "buttons")) {
            const cancelBtn = document.querySelector(`.cancel-btn-${data?.id}`);
            const continueBtn = document.querySelector(`.continue-btn-${data?.id}`);

            if(!cancelBtn.eventListenerAdded){
                cancelBtn?.addEventListener("click", () => {
                    cancelAction();
                    cancelBtn.eventListenerAdded = true;
                });
            }

            if(!continueBtn.eventListenerAdded){
                continueBtn?.addEventListener("click", () => {
                    continueAction();
                    continueBtn.eventListenerAdded = true;
                });
            }
        }

    }
}

export default InterruptionTemplateFunc;
