import { InitiateChatConversationAction } from "../../chat";

const ItemsAmbiguityTemplateFunc = (data) => {

    const actionHandler = (event, item) => {
        event.preventDefault();
        event.stopPropagation();

        let payload = {
            boardId: data?.boardId,
            messageId: data?.messageId,
            question: data?.question,
            resolved: {
                eventId: item?.id
            },
            itemsAmbiguity: true,
            action: data?.actionPayload
        }
        const params = {qId: data?.id, type: data?.type, reqId: data?.reqId, messageId: data?.messageId}
        // window.universalSearch({resolvedInterruption: true, params, payload})
        InitiateChatConversationAction({payload, params});
    }

    const container = document.getElementById(`items-ambiguity-template-${data?.id}`);
    if(container){
        data?.templateInfo?.ambiguous?.[0]?.value?.choices?.forEach((item, index) => {
            const itemElement = document.getElementById(`items-ambiguity-value-${index}`);
            if(!itemElement.eventListenerAdded){
                itemElement.addEventListener('click', (e) => {
                    actionHandler(e, item);
                });
                itemElement.eventListenerAdded = true;
            }
        });
    }
}

export default ItemsAmbiguityTemplateFunc;
