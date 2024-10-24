import { sessionItemHandler } from "../Attachments/createContext";
import InitiateChatConversationAction from './InitiateChatConversationAction';

const InvokeAgent = (agent) => {
    let payload = {
        intent: "welcome",
        question: `How can the "${agent?.name}" agent assist me`,
        source: agent?.id
    }
    const agentDetails = {
        "name": agent?.name,
        "docId": agent?.id,
        "source": agent?.id,
        "title": agent?.name,
        "icon": agent?.icon,
        isAgent: true
    }
    sessionItemHandler({item: agentDetails, invokeAgent: true, type : 'agent'})
    InitiateChatConversationAction({payload})
}

export default InvokeAgent