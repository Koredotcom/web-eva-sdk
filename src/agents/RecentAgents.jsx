import store from "../redux/store";

const constructRecents = (enabledUserAgents, recentAgents) => {
    let obj = []
    enabledUserAgents?.map(a => {
        if(recentAgents?.includes(a?.id)) {
            obj.push(a)
        }
    })
    return obj;
}

const RecentAgents = () => {
    return new Promise((resolve) => {
        const unsubscribe = store.subscribe(()=> {
            const state = store.getState()
            const {status, error, data} = state.global.userAgents
            const enabledUserAgents = state.global.enabledUserAgents
            const recentAgents = state.global.enabledRecentUserAgents
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

export default RecentAgents;