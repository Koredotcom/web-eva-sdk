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
        // Helper to check state and resolve if ready
        const checkAndResolve = () => {
            const state = store.getState()
            const {status, error, data} = state.global.allAgents
            const enabledAgents = state.global.enabledAgents
            const recentAgentIds = state.global.recentAgents
            
            if (status !== 'loading') {
                return {
                    ready: true,
                    result: {
                        status,
                        error,
                        data: constructRecents(data?.agents, recentAgentIds)
                    }
                }
            }
            return { ready: false }
        }
        
        // Check current state first (in case already loaded)
        const initial = checkAndResolve()
        if (initial.ready) {
            resolve(initial.result)
            return
        }
        
        // Otherwise, subscribe and wait for changes
        const unsubscribe = store.subscribe(() => {
            const check = checkAndResolve()
            if (check.ready) {
                unsubscribe()
                resolve(check.result)
            }
        })
    })
}

export default recentAgents;