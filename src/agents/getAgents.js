import { fetchAgents } from "../redux/actions/global.action"
import store from "../redux/store"

export const getAgents = async () => {
    const state = store.getState()
    const userId = state.global.profile.data.id
    store.dispatch(fetchAgents({ userId: userId }))    
    return state.global.allAgents
}