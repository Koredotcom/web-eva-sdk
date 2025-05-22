import { InitiateChatConversationAction } from "../../chat"

const IntentAmbiguityFunc = (data) => {
    const sendIntent = (e, index, intent) => {
        const params = { qId: data?.id, type: data?.type, reqId: data?.reqId}
        const payload = {} 
        payload.boardId = data?.boardId
        payload.messageId = data?.messageId
        payload.question = data?.question
        payload.resolved = []
        payload.intentAmbiguity = true
        payload.resolved.push({ "intent": [intent] })
        InitiateChatConversationAction({payload, params})
    }

    const container = document.getElementById(`intent-ambiguity-template-${data?._id}`);

    if(container){
        const ambiguousData = data?.templateInfo?.ambiguous?.find(
            (ob) => ob?.id === "intent"
        );

        if (ambiguousData?.value?.choices?.length) {
            ambiguousData?.value?.choices?.forEach((val, i) => {
                if (val?.connId?.length) {
                    const intentDiv = document.getElementById(`intent-${i}`);
                    if(intentDiv && !intentDiv?.eventListenerAdded){
                        intentDiv.addEventListener("click", (e) => sendIntent(e, i, val));
                        intentDiv.eventListenerAdded = true;
                    }
                }
            });
        }
    }


}
 
export default IntentAmbiguityFunc;