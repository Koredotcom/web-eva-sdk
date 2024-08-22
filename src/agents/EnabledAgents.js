import store from "../redux/store";

const EnabledAgents = () => {
    return new Promise((resolve) => {
        const unsubscribe = store.subscribe(()=> {
            const state = store.getState()
            const {status, error, data} = state.global.allAgents
            const enabledAgents = state.global.enabledAgents
            if(status !== 'loading') {
                unsubscribe()
                resolve({
                    status,
                    error,
                    data : enabledAgents
                })
            }
        })
    })
}

export default EnabledAgents;