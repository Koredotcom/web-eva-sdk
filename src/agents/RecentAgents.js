import store from "../redux/store";

const constructRecents = (enabledAgents, recentAgents) => {
    let obj = []
    enabledAgents?.map(a => {
        if(recentAgents?.includes(a?.id)) {
            obj.push(a)
        }
    })
    return obj;
}

const recentAgents = () => {
    return new Promise((resolve) => {
        const unsubscribe = store.subscribe(()=> {
            const state = store.getState()
            const {status, error, data} = state.global.allAgents
            const enabledAgents = state.global.enabledAgents
            const recentAgents = state.global.recentAgents
            if(status !== 'loading') {
                unsubscribe()
                resolve({
                    status,
                    error,
                    data : constructRecents(data?.agents, recentAgents)
                })
            }
        })
    })
}

export default recentAgents;