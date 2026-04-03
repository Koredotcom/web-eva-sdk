import store from "../redux/store";

export { getAgents } from "../agents/getAgents.js";
export { bookmarkAgent, agentEnablementUserLevel } from "../agents/actionsOnAgents.js";

const notInitialized = { status: "not_initialized", error: null, data: [] };

export const getAllAgents = () => {
    const state = store.getState();
    const { status, error, data } = state.global.allAgents;
    if (!status || status === "loading") return notInitialized;
    return { status, error, data: data?.agents || [] };
};

export const getCommonAgents = () => {
    const state = store.getState();
    const { status, error } = state.global.allAgents;
    if (!status || status === "loading") return notInitialized;
    const commonAgents = state.global.commonAgents;
    return { status, error, data: Array.isArray(commonAgents) ? commonAgents : [] };
};

export const getEnabledAgents = () => {
    const state = store.getState();
    const { status, error } = state.global.allAgents;
    if (!status || status === "loading") return notInitialized;
    return { status, error, data: state.global.enabledAgents || [] };
};

export const getRecentAgents = () => {
    const state = store.getState();
    const { status, error } = state.global.allAgents;
    if (!status || status === "loading") return notInitialized;
    return { status, error, data: state.global.recentAgents || [] };
};

export const getPinnedAgents = () => {
    const state = store.getState();
    const { status, error, data } = state.global.allAgents;
    if (!status || status === "loading") return notInitialized;
    return { status, error, data: data?.pinnedAgents || [] };
};
