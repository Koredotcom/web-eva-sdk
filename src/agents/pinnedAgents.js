import store from "../redux/store";

const pinnedAgents = () => {
    return new Promise((resolve) => {
        // Initial state before subscribing
        const state = store.getState()
        const { status, data } = state.global.allAgents

        if(status !== 'loading') {
            if(status === 'success') {
                resolve(data?.pinnedAgents)
            } else {
                resolve({error: "Failed to fetch pinned agents"})
            }
            return
        }

        // subscribtion that handles the state changes
        const unsubscribe = store.subscribe(() => {
            const state = store.getState()
            const { status, data } = state.global.allAgents
            if(status !== 'loading') {
                unsubscribe()
                if(status === 'success') {
                    resolve(data?.pinnedAgents)
                } else {
                    resolve({error: "Failed to fetch pinned agents"})
                }
            }
        })
    })
}

export default pinnedAgents