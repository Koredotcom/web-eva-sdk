import store from "../redux/store";

const EnabledAgents = () => {
    return new Promise((resolve) => {
        const unsubscribe = store.subscribe(()=> {
            const state = store.getState()
            const {status, error, data} = state.global.userAgents
            const enabledUserAgents = state.global.enabledUserAgents
            if(status !== 'loading') {
                unsubscribe()
                resolve({
                    status,
                    error,
                    data : enabledUserAgents
                })
            }
        })
    })
}

export default EnabledAgents;