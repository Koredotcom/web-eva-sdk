import store from "../redux/store";
import {
    fetchAboutMe,
    editAboutMe as editAboutMeThunk,
    fetchMemoryInstructions,
    createMemoryInstruction,
    updateMemoryInstruction,
    onboardingFeature,
} from "../redux/actions/global.action";

export const getAboutMe = async () => {
    const state = store.getState();
    const userId = state.global?.profile?.data?.id;

    if (!userId) {
        return { status: "failed", error: { message: "User ID not available" }, data: null };
    }

    try {
        const raw = await store.dispatch(fetchAboutMe(userId)).unwrap();
        return { status: "success", data: raw };
    } catch (error) {
        const err =
            error && typeof error === "object" && !Array.isArray(error)
                ? error
                : { message: String(error ?? "Unable to fetch about me") };
        return { status: "failed", error: err, data: null };
    }
};

export const updateAboutMe = async (instruction) => {
    const state = store.getState();
    const userId = state.global?.profile?.data?.id;

    if (!userId) {
        return { status: "failed", error: { message: "User ID not available" }, data: null };
    }

    if (!instruction?.trim()) {
        return { status: "failed", error: { message: "Instruction is required" }, data: null };
    }

    try {
        const raw = await store.dispatch(editAboutMeThunk({ userId, instruction })).unwrap();
        return { status: "success", data: raw };
    } catch (error) {
        const err =
            error && typeof error === "object" && !Array.isArray(error)
                ? error
                : { message: String(error ?? "Unable to update about me") };
        return { status: "failed", error: err, data: null };
    }
};

export const getInstructions = async ({ scope = 'both', agentId=null, limit, skip } = {}) => {
    const state = store.getState();
    const userId = state.global?.profile?.data?.id;

    if (!userId) {
        return { status: "failed", error: { message: "User ID not available" }, data: null };
    }

    if (scope && !["global", "agent"].includes(scope)) {
        return { status: "failed", error: { message: "Scope must be 'global' or 'agent'" }, data: null };
    }

    const params = {};
    if (scope) params.scope = scope;
    if (agentId) params.agentId = agentId;
    if (limit !== undefined) params.limit = limit;
    if (skip !== undefined) params.skip = skip;

    try {
        const raw = await store.dispatch(fetchMemoryInstructions({ userId, params })).unwrap();
        return { status: "success", data: raw };
    } catch (error) {
        const err =
            error && typeof error === "object" && !Array.isArray(error)
                ? error
                : { message: String(error ?? "Unable to fetch instructions") };
        return { status: "failed", error: err, data: null };
    }
};

export const createInstruction = async ({ instruction, scope, agentId=null } = {}) => {
    const state = store.getState();
    const userId = state.global?.profile?.data?.id;

    if (!userId) {
        return { status: "failed", error: { message: "User ID not available" }, data: null };
    }

    if (!instruction?.trim()) {
        return { status: "failed", error: { message: "Instruction is required" }, data: null };
    }

    if (instruction.length > 2000) {
        return { status: "failed", error: { message: "Instruction must not exceed 2000 characters" }, data: null };
    }

    const resolvedScope = scope || "global";

    if (!["global", "agent"].includes(resolvedScope)) {
        return { status: "failed", error: { message: "Scope must be 'global' or 'agent'" }, data: null };
    }

    if (resolvedScope === "agent" && !agentId) {
        return { status: "failed", error: { message: "agentId is required when scope is 'agent'" }, data: null };
    }

    const payload = { instruction, scope: resolvedScope };
    if (resolvedScope === "agent") {
        payload.agentId = agentId;
    }

    try {
        const raw = await store.dispatch(createMemoryInstruction({ userId, payload })).unwrap();
        return { status: "success", data: raw };
    } catch (error) {
        const err =
            error && typeof error === "object" && !Array.isArray(error)
                ? error
                : { message: String(error ?? "Unable to create instruction") };
        return { status: "failed", error: err, data: null };
    }
};

export const updateSpecificInstruction = async ({ instructionId, instruction } = {}) => {
    const state = store.getState();
    const userId = state.global?.profile?.data?.id;

    if (!userId) {
        return { status: "failed", error: { message: "validated at sdk function level and identified the User ID not available" }, data: null };
    }

    if (!instructionId) {
        return { status: "failed", error: { message: "validated at sdk functionlevel and identified the instructionId is required and not provided" }, data: null };
    }

    if (!instruction?.trim()) {
        return { status: "failed", error: { message: "validated at sdk function level and identified the Instruction provided is empty or whitespace only" }, data: null };
    }

    if (instruction.length > 2000) {
        return { status: "failed", error: { message: "validated at sdk function level and identified the Instruction provided must not exceed 2000 characters" }, data: null };
    }

    const payload = { instruction };

    try {
        const raw = await store.dispatch(updateMemoryInstruction({ userId, instructionId, payload })).unwrap();
        return { status: "success", data: raw };
    } catch (error) {
        const err =
            error && typeof error === "object" && !Array.isArray(error)
                ? error
                : { message: String(error ?? "Unable to update instruction") };
        return { status: "failed", error: err, data: null };
    }
};

export const updateFeatureOnboarding = async ({ featureKey, version = 1, enabled } = {}) => {
    const state = store.getState();
    const userId = state.global?.profile?.data?.id;

    if (!userId) {
        return { status: "failed", error: { message: "User ID not available" }, data: null };
    }

    if (!featureKey?.trim()) {
        return { status: "failed", error: { message: "featureKey is required" }, data: null };
    }

    if (typeof enabled !== "boolean") {
        return { status: "failed", error: { message: "enabled must be a boolean" }, data: null };
    }

    try {
        const raw = await store.dispatch(onboardingFeature({ userId, featureKey, enabled, version })).unwrap();
        return { status: "success", data: raw };
    } catch (error) {
        const err =
            error && typeof error === "object" && !Array.isArray(error)
                ? error
                : { message: String(error ?? "Unable to update feature onboarding") };
        return { status: "failed", error: err, data: null };
    }
};

/**
 * Factory that returns an object exposing all profile-related getters and actions.
 * Mirrors the shape of `ChatInterface()` / `sdkAgents()` so consumers can do:
 *
 *   const p = profile();
 *   const me = await p.getAboutMe();
 *   await p.updateAboutMe("I prefer concise answers");
 */
const profile = () => ({
    getAboutMe,
    updateAboutMe,
    getInstructions,
    createInstruction,
    updateSpecificInstruction,
    updateFeatureOnboarding,
});

export default profile;
