import { cloneDeep, debounce } from "lodash";
import { delayedSearchCallback } from "../../utils/helpers";
import store from "../../redux/store";
import { updateChatData } from "../../redux/globalSlice";
import { smartComposeEmail } from "../../redux/actions/global.action";

const sendEmailFunctionality = (data) => {

    let state = store?.getState()?.global

    const getSearchedUsers = debounce(async (text, type) => {
        let obj = {
            value: text,
            connectionSource : data?.provider,
            connectionId : data?.templateInfo?.defaultConnections,
            fieldTo : type 
        }

        let response = await delayedSearchCallback(obj);

        let _questions = cloneDeep(state?.questions)
        _questions[data?.reqId] = {
            ..._questions[data?.reqId],
            [`${type}Choices`] : response
        }

        store.dispatch(updateChatData(_questions))
    }, 500);


    const composeSmartEmail = async (prompt, type) => {
        let params = {
            userId: state?.profile?.data?.id,
        }

        let payload;
        if(type === 'generate') {
            payload = {
                userInput : prompt,
                type: type
            }
        } else {
            payload = {
                text: prompt,
                type: 'generate'
            }
        }

        let response = await store.dispatch(smartComposeEmail({params, payload}));
        let textBody = document.getElementById(`email-body-${data?.reqId}`);
        if(textBody) {
            textBody.innerHTML = response?.payload?.textSuggestions?.[0]?.body;
        }
    }

    let toSection = document.getElementById(`email-to-${data?.reqId}`);
    let ccSection = document.getElementById(`email-cc-${data?.reqId}`);
    let bccSection = document.getElementById(`email-bcc-${data?.reqId}`);

    if(toSection && !toSection?.eventListenerAdded) {
        toSection.addEventListener('input', (e) => {
            getSearchedUsers(e.target.value, 'to');
        });
        toSection.eventListenerAdded = true;
    }

    if(ccSection && !ccSection?.eventListenerAdded) {
        ccSection.addEventListener('input', (e) => {
            getSearchedUsers(e.target.value, 'cc');
        });
        ccSection.eventListenerAdded = true;
    }

    if(bccSection && !bccSection?.eventListenerAdded) {
        bccSection.addEventListener('input', (e) => {
            getSearchedUsers(e.target.value, 'bcc');
        });
        bccSection.eventListenerAdded = true;
    }

    let smartComposeButton = document.getElementById(`email-smart-compose-${data?.reqId}`);
    let smartComposeInput = document.getElementById(`email-smart-prompt-${data?.reqId}`);

    if(smartComposeButton && !smartComposeButton?.eventListenerAdded) {
        smartComposeButton.addEventListener('click', () => {
            smartComposeInput.style.display = 'block';
        });
        smartComposeButton.eventListenerAdded = true;
    }

    if(smartComposeInput && !smartComposeInput?.eventListenerAdded) {
        smartComposeInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') {
                composeSmartEmail(e.target.value, 'generate');
            }
        });
        smartComposeInput.eventListenerAdded = true;
    }
    
    
}


export default sendEmailFunctionality;
