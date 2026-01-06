import store from "../redux/store";

const pinnedAgents = () => {
    return new Promise((resolve) => {
        // Initial state before subscribing
        const state = store.getState()
        const { status, data } = state.global.allAgents

        if(status === 'success') {
            resolve(data?.pinnedAgents)
            return
        }
        if(status === 'error') {
            resolve({error: "Failed to fetch pinned agents"})
            return
        }

        // subscribtion that handles the state changes
        const unsubscribe = store.subscribe(() => {
            const state = store.getState()
            const { status, data } = state.global.allAgents
            if(status === 'success') {
                unsubscribe()
                resolve(data?.pinnedAgents)
            }
            if(status === 'error'){
                unsubscribe()
                resolve({error: "Failed to fetch pinned agents"})
            }
        })
    })
}

export default pinnedAgents