import store from "../redux/store";

const constructRecents = (enabledAgents, recentAgents) => {
    let obj = []
    recentAgents?.map(a => {
        const agentIndex = enabledAgents?.findIndex(e => e?.id === a)
        if(agentIndex !== -1) {                  
            obj.push(enabledAgents[agentIndex])
        }
    })
    return obj;
}

const recentAgents = () => {
    return new Promise((resolve) => {
        // Helper to check state and build result
        const getResult = () => {
            const state = store.getState()
            const {status, error, data} = state.global.allAgents
            const enabledAgents = state.global.enabledAgents
            const recentAgentIds = state.global.recentAgents
            return { status, error, enabledAgents, recentAgentIds }
        }

        // below function is to check if the data is already loaded and if not then subscribe for future updates        
        const current = getResult()
        if (current.status === 'success' || current.status === 'failed') {
            resolve({
                status: current.status,
                error: current.error,
                data: constructRecents(current.enabledAgents, current.recentAgentIds)
            })
            return
        }

        // subscribe for future updates or any other
        const unsubscribe = store.subscribe(() => {
            const result = getResult()
            if (result.status === 'success' || result.status === 'failed') {
                unsubscribe()
                resolve({
                    status: result.status,
                    error: result.error,
                    data: constructRecents(result.enabledAgents, result.recentAgentIds)
                })
            }
        })
    })
}

export default recentAgents;