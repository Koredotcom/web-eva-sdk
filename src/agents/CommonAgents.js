import store from "../redux/store";

const CommonAgents = () => {
    return new Promise((resolve) => {
        const state = store.getState();
        const { status, error } = state.global.allAgents;
        const commonAgents = state.global.commonAgents;

        if (status && status !== 'loading') {
            resolve({ status, error, data: commonAgents });
            return;
        }

        const unsubscribe = store.subscribe(() => {
            const currentState = store.getState();
            const { status: s, error: e } = currentState.global.allAgents;
            const ca = currentState.global.commonAgents;
            if (s && s !== 'loading') {
                unsubscribe();
                resolve({ status: s, error: e, data: ca });
            }
        });
    })
}

export default CommonAgents;