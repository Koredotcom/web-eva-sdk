import { fetchAgents } from "../redux/actions/global.action"
import store from "../redux/store"

export const getAgents = async () => {
    const state = store.getState()
    const profileData = state.global.profile
    if(profileData?.status === 'success') {
        store.dispatch(fetchAgents({ userId: profileData.data.id }))    
    }
}