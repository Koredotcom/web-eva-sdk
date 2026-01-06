import store from "../redux/store";
import { bookmarkAgentAction } from "../redux/actions/global.action";

export const bookmarkAgent = async (agentId, value) => {
    const response = await store?.dispatch(bookmarkAgentAction({userId: store?.getState()?.global?.profile?.data?.id, agentId: agentId, payload: value}))
    if(response?.payload?.success) {
        return response?.payload?.pinnedAgents       
    }
    if(response?.payload?.error) {
        return {error: response?.payload?.error}
    }
    return null
}