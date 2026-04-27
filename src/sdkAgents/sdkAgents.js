import store from "../redux/store";
import { getAgents } from "../agents/getAgents.js";
import { bookmarkAgent, agentEnablementUserLevel } from "../agents/actionsOnAgents.js";

export { getAgents };
export { bookmarkAgent, agentEnablementUserLevel };


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

/**
 * Factory that returns an object exposing all agent-related getters and actions.
 * Mirrors the shape of `ChatInterface()` so consumers can do:
 *
 *   const agents = sdkAgents();
 *   agents.getAllAgents();
 *   await agents.bookmarkAgent({ agentId });
 */
const sdkAgents = () => ({
    getAllAgents,
    getCommonAgents,
    getEnabledAgents,
    getRecentAgents,
    getPinnedAgents,
    getAgents,
    bookmarkAgent,
    agentEnablementUserLevel,
});

export default sdkAgents;
