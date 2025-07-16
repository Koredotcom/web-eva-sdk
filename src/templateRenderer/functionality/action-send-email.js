import { cloneDeep, debounce } from "lodash";
import { delayedSearchCallback } from "../../utils/helpers";
import store from "../../redux/store";
import { updateChatData } from "../../redux/globalSlice";
import { sendEmail, smartComposeEmail } from "../../redux/actions/global.action";
import { setupTomSelect } from '../../plugins/tom-autocomplete';


const sendEmailFunctionality = (data) => {

    const getState = () => {
        let state = store?.getState()?.global
        const currentData = state?.questions?.[data?.reqId];
        return { state, currentData };
    };

    // Create a promise-aware debounce function
    const debouncedSearch = debounce(async (text, type, resolve, reject) => {
        try {
            if(text?.length === 0) {
                resolve([]);
                return;
            }
            
            let { state, currentData } = getState();

            let values = preserveEmailContent();
            let obj = {
                value: text,
                connectionSource : currentData?.provider,
                connectionId : currentData?.templateInfo?.defaultConnections,
                fieldTo : type 
            }

            let response = await delayedSearchCallback(obj);

            let _questions = cloneDeep(state?.questions)
            let content = cloneDeep(currentData?.content);
            content.subject = values?.subject;  
            content.body = values?.body;
            _questions[currentData?.reqId] = {
                ..._questions[currentData?.reqId],
                content,
                [`${type}Choices`] : {
                    res : response,
                    input : text
                }
            }

            store.dispatch(updateChatData(_questions))
            
            // Return the response for Tom Select
            resolve(response || []);
        } catch (error) {
            reject(error);
        }
    }, 500);

    const getSearchedUsers = (text, type) => {
        return new Promise((resolve, reject) => {
            debouncedSearch(text, type, resolve, reject);
        });
    };

    const insertEmail = (email, type) => {
        let { state, currentData } = getState();
        let _content = cloneDeep(currentData?.content);
        let existingEmails = cloneDeep(_content?.[type]);
        if(existingEmails) {
                existingEmails.push(email);
            } else {
                existingEmails = [email];
        }

        _content[type] = existingEmails;

        let _questions = cloneDeep(state?.questions);
        let values = preserveEmailContent();
        _content.subject = values?.subject;
        _content.body = values?.body;

        if (_questions[currentData?.reqId]) {
            delete _questions[currentData?.reqId][`${type}Choices`];
            _questions[currentData?.reqId].content = _content;
        }

        store.dispatch(updateChatData(_questions));
        if(type === 'to') {
            setTimeout(()=>validateSendButton(), 100)
        }
    }

    const removePerson = (email, type) => {
        let { state, currentData } = getState();
        let _content = cloneDeep(currentData?.content);
        let existingEmails = cloneDeep(_content?.[type]);
        existingEmails = existingEmails.filter(item => item?.id !== email?.id);
        _content[type] = existingEmails;

        let _questions = cloneDeep(state?.questions);
        let values = preserveEmailContent();
        _content.subject = values?.subject;
        _content.body = values?.body;
        if (_questions[currentData?.reqId]) {
            _questions[currentData?.reqId].content = _content;
        }
        store.dispatch(updateChatData(_questions));

        if(type === 'to') {
            setTimeout(()=>validateSendButton(), 100)
        }
    }

    const preserveEmailContent = () => {
        let { state, currentData } = getState();
        let emailSubject = document.getElementById(`email-subject-${currentData?.reqId}`);
        let _emailBody = document.getElementById(`email-body-${currentData?.reqId}`);

        let values = {
            subject: '',
            body: ''
        }
        if(emailSubject) {
            values.subject = emailSubject.value;
        }
        if(_emailBody) {
            values.body = _emailBody.innerHTML;
        }
        if(currentData?.content?.to) {
            values.to = currentData?.content?.to;
        }
        if(currentData?.content?.cc) {
            values.cc = currentData?.content?.cc;
        }
        if(currentData?.content?.bcc) {
            values.bcc = currentData?.content?.bcc;
        }
        if(currentData?.content?.includeSource) {
            values.includeSource = currentData?.content?.includeSource;
        }
        if(currentData?.content?.attachmentPreview) {
            values.attachments = currentData?.content?.attachmentPreview;
        }

        return values;
    }

    const send = async () => {
        let { state, currentData } = getState();
        const to = currentData?.content?.to?.map(item => {
            return {
                label: item?.label,
                id:  item?.id
            }
        })?.flat();
        const cc = currentData?.content?.cc?.map(item => {
            return {
                label: item?.label,
                id: item?.id
            }
        })?.flat();
        const bcc = currentData?.content?.bcc?.map(item => {
            return {
                label: item?.label,
                id: item?.id
            }
        })?.flat();


        let emailSubject = document.getElementById(`email-subject-${currentData?.reqId}`);
        let emailBody = document.getElementById(`email-body-${currentData?.reqId}`);

        const includeSource =  currentData?.includeSource;
        const subject = emailSubject?.value || '';
        const body = emailBody?.innerHTML || '';
        const connectionId = document.getElementById(`email-connection-${currentData?.reqId}`)?.value || '';
        const attachments =  currentData?.attachmentPreview;
        const attachmentsIds = [], attachmentComponents= []
        attachments?.map(attach => {
            attachmentsIds.push(attach?.fileUrl?.fileId)
            attachmentComponents.push(attach?.fileUrl)
        })

        if(to?.length === 0) {
            return;
        }

        let params = {
            userId: state?.profile?.data?.id,
            provider: currentData?.provider
        }

        const payload = {
            connectionId: connectionId,
            params: {
                subject,
                content: body,
                to,
                cc,
                bcc,
                attachments: attachmentsIds,
                components: attachmentComponents
            },
            contextParams: {
                includeSource,                
                messageId:  currentData?.messageId,
                dataId: currentData?.parentMessageId || currentData?.menuId
            }
        }

        let response = await store.dispatch(sendEmail({params, payload}));
        let _questions = cloneDeep(state?.questions);
        _questions[currentData?.reqId] = response?.payload;
        store.dispatch(updateChatData(_questions));
    }

    let toSection = document.getElementById(`email-to-${data?.reqId}`);
    let ccSection = document.getElementById(`email-cc-${data?.reqId}`);
    let bccSection = document.getElementById(`email-bcc-${data?.reqId}`);

    if(toSection && !toSection?.eventListenerAdded) {
        let { state, currentData } = getState();
        setupTomSelect({
            selectorId: `email-to-${data?.reqId}`,
            type: 'to',
            initialItems: currentData?.content?.to || [],
            fetchSuggestions: getSearchedUsers,
            onAdd: insertEmail,
            onRemove: removePerson
          });

        toSection.eventListenerAdded = true;
    }

    if(ccSection && !ccSection?.eventListenerAdded) {
        let { state, currentData } = getState();
        setupTomSelect({
            selectorId: `email-cc-${data?.reqId}`,
            type: 'cc',
            initialItems: currentData?.content?.cc || [],
            fetchSuggestions: getSearchedUsers,
            onAdd: insertEmail,
            onRemove: removePerson
        });
        ccSection.eventListenerAdded = true;
    }

    if(bccSection && !bccSection?.eventListenerAdded) {
        let { state, currentData } = getState();
        setupTomSelect({
            selectorId: `email-bcc-${data?.reqId}`,
            type: 'bcc',
            initialItems: currentData?.content?.bcc || [],
            fetchSuggestions: getSearchedUsers,
            onAdd: insertEmail,
            onRemove: removePerson
          });
        bccSection.eventListenerAdded = true;
    }

    function validateSendButton() {
        const toSelect = document.getElementById(`email-to-${data?.reqId}`);
        const subject = document.getElementById(`email-subject-${data?.reqId}`)?.value?.trim();
        const bodyDiv = document.getElementById(`email-body-${data?.reqId}`);
        const sendBtn = document.getElementById(`email-send-${data?.reqId}`);
      
        const toFilled = toSelect?.selectedOptions?.length > 0;
        const bodyText = bodyDiv?.innerText?.replace(/\s+/g, '').trim();
      
        const valid = toFilled && subject && bodyText;
      
        if (sendBtn) {
          sendBtn.disabled = !valid;
        }
      }
      

    document.getElementById(`email-subject-${data?.reqId}`)?.addEventListener('input', validateSendButton);
    document.getElementById(`email-body-${data?.reqId}`)?.addEventListener('input', validateSendButton);

    let sendButton = document.getElementById(`email-send-${data?.reqId}`);
    if(sendButton && !sendButton?.eventListenerAdded) {
        sendButton.addEventListener('click', () => {
            send();
        });
        sendButton.eventListenerAdded = true;
    }

    let emailBody = document.getElementById(`email-body-${data?.reqId}`);
    if(emailBody) {
        emailBody.contentEditable = true;
    }
    
    
}


export default sendEmailFunctionality;
