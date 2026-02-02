import { fetchAgents } from "../redux/actions/global.action"
import store from "../redux/store"

export const getAgents = async () => {
    const state = store.getState()
<<<<<<< HEAD
    const userId = state.global.profile.data.id
    store.dispatch(fetchAgents({ userId: userId }))    
=======
    const profileData = state.global.profile
    if(profileData?.status === 'success') {
        store.dispatch(fetchAgents({ userId: profileData.data.id }))    
    }
>>>>>>> 26d8b700c3e9492c21b06935fc73ef768f499999
}