import store from "../redux/store";

const AllAgents = () => {
    return new Promise((resolve) => {
        const unsubscribe = store.subscribe(()=> {
            const state = store.getState()
            const {status, error, data} = state.global.allAgents
            if(status !== 'loading') {
                unsubscribe()
                resolve({
                    status,
                    error,
                    data: data?.agents
                })
            }
        })
    })
}

export default AllAgents;