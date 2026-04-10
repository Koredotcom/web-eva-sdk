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
        const checkState = () => {
            const state = store.getState()
            const { status, error, data } = state.global.allAgents
            const recentAgentIds = state.global.recentAgents
            if (status !== 'loading') {
                return { resolved: true, result: { status, error, data: constructRecents(data?.agents, recentAgentIds) } }
            }
            return { resolved: false }
        }

        const current = checkState()
        if (current.resolved) {
            resolve(current.result)
            return
        }

        const unsubscribe = store.subscribe(() => {
            const check = checkState()
            if (check.resolved) {
                unsubscribe()
                resolve(check.result)
            }
        })
    })
}

export default recentAgents;