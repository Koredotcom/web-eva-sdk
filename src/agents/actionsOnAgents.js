import store from "../redux/store";
import { updateAgentAction } from "../redux/actions/global.action";

export const bookmarkAgent = async (agentId, value) => {
    const response = await store.dispatch(updateAgentAction({userId: store.getState().global.profile.data.id, agentId: agentId, payload: value}))
    if(response?.payload?.success) {
        return response?.payload?.pinnedAgents       
    }
    return null
}

export const agentEnablementUserLevel = async (agentId, value) => {
    const response = await store.dispatch(updateAgentAction({userId: store.getState().global.profile.data.id, agentId: agentId, payload: value}))
    if(response?.payload?.success) {
        return response?.payload      
    }
    return null
}