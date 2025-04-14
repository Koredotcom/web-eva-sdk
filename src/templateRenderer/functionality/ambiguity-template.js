import { cancelAdvanceSearch, InitiateChatConversationAction } from "../../chat";
import store from "../../redux/store";

const AmbiguityTemplateFunc = (data) => {

    let state = store.getState().global
    let userId = state?.profile?.data?.id

    const submitHandler = () => {
        const params = {type: data?.type, reqId: data?.reqId}

        const dropdown = document.getElementById(`resolve-ambiguity-select-${data?.id}`)
        const selections = data?.templateInfo?.ambiguous?.[0]?.value?.choices[dropdown?.selectedIndex]

        const payload = {
            messageId: data?.messageId,
            question: data?.question,
            resolvedAmbiguity: true,
            resolved: [{from: [selections]}] 
        }

        InitiateChatConversationAction({payload, params, ambiguity: true})
    }

    const cancelHandler = () => {
        cancelAdvanceSearch(data?.reqId)
    }

    const container = document.getElementById(`resolve-ambiguity-container-${data?.id}`)

    if(container){
        const submitBtn = document.getElementById(`resolve-ambiguity-confirm-btn-${data?.id}`)
        const cancelBtn = document.getElementById(`resolve-ambiguity-cancel-btn-${data?.id}`)

        submitBtn.addEventListener('click', submitHandler)
        cancelBtn.addEventListener('click', cancelHandler)
    }


}
 
export default AmbiguityTemplateFunc;