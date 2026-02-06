import store from "../redux/store";

const pinnedAgents = () => {
    return new Promise((resolve) => {
        const unsubscribe = store.subscribe(() => {
            const state = store.getState()
            const { status, error, data } = state.global.allAgents
            const pinnedAgents = data?.pinnedAgents
            if(status !== 'loading') {
                unsubscribe()
                resolve(pinnedAgents)
            }
        })
    })
}

export default pinnedAgents