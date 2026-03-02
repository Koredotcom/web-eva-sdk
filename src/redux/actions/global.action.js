import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosInstance";
import { handleErrorState } from "../../utils/helpers";
import { v4 as uuidv4 } from 'uuid';

// Asynchronous actions (thunks)
export const fetchConfigData = createAsyncThunk(
    'global/fetchConfigData',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`ka/users/${userId}/sdk/config`);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Config");
            return rejectWithValue(error.response.data);
        }
    }
);

export const fetchProfileData = createAsyncThunk(
    'global/fetchProfileData',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`ka/users/${userId}/profile`);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Profile");
            return rejectWithValue(error.response.data);
        }
    }
);

export const fetchAgents = createAsyncThunk(
    'global/fetchAgents',
    async (arg, { rejectWithValue, dispatch }) => {
        try {
            const response = await axiosInstance.get(`users/${arg.userId}/agents`, arg?.params);
            const agentsData = response.data;

            //After getting the agents data, we need to get the user details for the createdBy of the agents
            const createdByIds = [...new Set(
                agentsData?.agents
                    ?.filter(agent => agent.createdBy)
                    ?.map(agent => agent.createdBy)
            )];

            let userDetailsMap = {};
            if (createdByIds.length > 0) {
                try {
                    //dispatch the getUserDetails action to get the user details for the createdBy of the agents
                    const userDetailsResult = await dispatch(getUserDetails({
                        payload: { id: createdByIds }
                    }));

                    userDetailsMap = userDetailsResult.payload?.reduce((acc, user) => {
                        acc[user?.id] = user;
                        return acc;
                    }, {}) || {};
                } catch (userError) {
                    console.warn('Failed to fetch user details for agents:', userError);
                }
            }

            const agentsWithUserData = agentsData?.agents?.map(agent => ({
                ...agent,
                userDetails: agent?.createdBy ? userDetailsMap[agent?.createdBy] : null,
            }));

            //return the agents with the user details
            return {
                ...agentsData,
                agents: agentsWithUserData
            };

        } catch (error) {
            handleErrorState(error, "Agents");
            return rejectWithValue(error.response.data);
        }
    }
);


let controller;

// Helper function to abort any in-progress advance search request
export const abortAdvanceSearch = () => {
    if (controller) {
        controller?.abort();
        controller = null;
    }
};

export const advanceSearch = createAsyncThunk(
    'global/advanceSearch',
    async (arg, thunkAPI) => {
        controller = new AbortController();
        const traceId = uuidv4();
        try {
            const response = await axiosInstance.post(`kora/users/${arg.userId}/advancedsearch`, arg.payload, {
                params: arg?.params,
                signal: controller.signal,
                headers: {
                    'kore-traceid': traceId
                }
            });
            return { ...response.data, 'kore-traceid': traceId };
        } catch (error) {
            handleErrorState(error, "Advance Search");
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

export const searchResultFilters = createAsyncThunk(
    'global/searchResultFilters',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(
                `kora/boards/${arg.params.boardId}/messages/${arg.params.messageId}/dataFilters`,
                arg.payload
            );
            return response.data;
        } catch (error) {
            handleErrorState(error, "Search Result Filters");
            return rejectWithValue(error.response.data);
        }
    }
);

export const cancelAdvancedSearch = createAsyncThunk(
    'global/cancelAdvancedSearch',
    async (arg, thunkAPI) => {

        // Abort the in-flight request immediately before making the cancel API call
        if (controller) {
            controller.abort();
            controller = null;
        }

        try {
            let reqdQuestionId = encodeURIComponent(arg.reqId)

            const response = await axiosInstance({
                url: `kora/users/${arg.userId}/advancedsearch/cancelrequest/${reqdQuestionId}`,
                method: 'POST',
                data: arg.payload
            });

            return response.data;
        } catch (error) {
            handleErrorState(error, "Cancel Advance Search");
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

export const fetchHistory = createAsyncThunk(
    'global/fetchHistory',
    async ({ params }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance({
                url: `kora/boards?type=history`,
                method: 'GET',
                params
            });
            return response.data;
        } catch (error) {
            handleErrorState(error, "History");
            return rejectWithValue(error.response.data);
        }
    }
);

export const fetchRecentFiles = createAsyncThunk(
    'global/fetchRecentFiles',
    async ({ userId, params }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance({
                url: `ka/users/${userId}/files?fileContext=knowledge`,
                method: 'GET',
                params
            });
            return response.data;
        } catch (error) {
            handleErrorState(error, "Recent Files");
            return rejectWithValue(error.response.data);
        }
    }
);

export const getRecentFileDownloadUrl = createAsyncThunk(
    'global/getRecentFileDownloadUrl',
    async ({ userId, params }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance({
                url: `kora/boards/${userId}/sources/${params?.source}/${params?.docId}/signedMediaUrl`,
                method: 'GET',
            });
            return response.data;
        } catch (error) {
            handleErrorState(error, "Download File");
            return rejectWithValue(error.response.data);
        }
    }
);

export const deleteHistory = createAsyncThunk(
    'global/deleteHistory',
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosInstance({
                url: `ka/boards/${params?.boardId}`,
                method: 'DELETE'
            });
            return response.data;
        } catch (error) {
            handleErrorState(error, "Delete History");
            return rejectWithValue(error.response.data);
        }
    }
);

export const updateHistory = createAsyncThunk(
    'global/updateHistory',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.put(`ka/boards/${arg?.params?.boardId}`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Update History");
            return rejectWithValue(error.response.data);
        }
    }
);

export const getSearchHistory = createAsyncThunk(
    'global/getSearchHistory',
    async ({ boardId, params }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance({
                url: `kora/boards/${boardId}/searchhistory`,
                method: 'GET',
                params
            });
            return response.data;
        } catch (error) {
            handleErrorState(error, "Get History");
            return rejectWithValue(error.response.data);
        }
    }
);

export const searchSession = createAsyncThunk(
    'global/searchSession',
    async (arg, { rejectWithValue }) => {
        const rnd = Math.random().toString(36).substring(7);
        try {
            // Match Kora-React: use /api/ prefix and correct URL structure
            if (arg?.params?.action === "add") {
                // POST to kora/users/:userId/searchsession (no sessionId in URL)
                // Note: baseURL already includes /api/, so we use ... to match other API calls
                const response = await axiosInstance.post(`kora/users/${arg?.userId}/searchsession?rnd=${rnd}`, arg?.payload)
                return response.data
            }
            else if (arg?.params?.action === "update") {
                // PUT to kora/users/:userId/searchsession/:sessionId
                if (!arg?.params?.sessionId) {
                    // If sessionId is undefined, fall back to POST (create new session)
                    const response = await axiosInstance.post(`kora/users/${arg?.userId}/searchsession?rnd=${rnd}`, arg?.payload)
                    return response.data
                }
                const response = await axiosInstance.put(`kora/users/${arg?.userId}/searchsession/${arg?.params?.sessionId}?rnd=${rnd}`, arg?.payload)
                return response.data
            }
            else if (arg?.params?.action === "remove") {
                // DELETE to kora/users/:userId/searchsession/:sessionId/sources/:docId
                if (!arg?.params?.sessionId) {
                    return rejectWithValue({ error: "sessionId is required for remove action" })
                }
                const docId = encodeURIComponent(arg?.params?.docId || arg?.payload?.[0]?.docId)
                const response = await axiosInstance.delete(`kora/users/${arg?.userId}/searchsession/${arg?.params?.sessionId}/sources/${docId}?rnd=${rnd}`)
                return response.data
            }
        }
        catch (error) {
            handleErrorState(error, "Search Session");
            return rejectWithValue(error.response?.data || error)
        }
    }
);

export const submitFeedback = createAsyncThunk(
    'global/submitFeedback',
    async (arg, thunkAPI) => {
        try {
            const response = await axiosInstance.put(`kora/boards/${arg?.boardId}/messages/${arg?.messageId}/feedback`, arg.payload);
            return response;
        } catch (error) {
            handleErrorState(error, "Feedback");
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

// gives sToken - which is required to connect with web socket
export const presenceStart = createAsyncThunk(
    'global/presenceStart',
    async (arg, thunkAPI) => {
        try {
            const response = await axiosInstance.post(`presence/start`);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

//Call to get Notifications
export const getNotification = createAsyncThunk(
    'global/getNotification',
    async (arg, { rejectWithValue }) => {
        try {
            let response;
            if (arg?.loadMore) {
                response = await axiosInstance.get(`ka/users/${arg?.userId}/notifications?offSet=${arg?.offset}&limit=${arg?.limit}`);
            }
            else {
                response = await axiosInstance.get(`ka/users/${arg?.userId}/notifications`);
            }
            return response.data;
        } catch (error) {
            handleErrorState(error, "Get Notification");
            return rejectWithValue(error.response.data);
        }
    }
);

//Call to mark all notifications as read
export const readNotification = createAsyncThunk(
    'global/readNotification',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.put(`ka/users/${arg?.userId}/notifications`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Mark All As Read");
            return rejectWithValue(error.response.data);
        }
    }
);

export const bookMarkChatThread = createAsyncThunk(
    'global/bookMarkChatThread',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.put(`ka/boards/${arg?.params?.boardId}/star`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Book Mark Chat Thread");
            return rejectWithValue(error.response.data);
        }
    }
);

export const getBookMarkedChatThreads = createAsyncThunk(
    'global/getBookMarkedChatThreads',
    async (arg, { rejectWithValue }) => {
        try {
            let url = `ka/boards?type=history&star=true`
            if (arg?.limit) {
                url += `&limit=${arg?.limit}`
            }
            if (arg?.offset) {
                url += `&offset=${arg?.offset}`
            }
            const response = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Get Book Marked Chat Thread");
            return rejectWithValue(error.response.data);
        }
    }
);

export const getSpecificSkills = createAsyncThunk(
    'global/getSpecificSkills',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/ka/users/${arg?.userId}/connectors/${arg?.connectorId}`);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Get Specific Skills");
            return rejectWithValue(error.response.data);
        }
    }
);

export const thirdPartySSO = createAsyncThunk(
    'global/thirdPartySSO',
    async (arg, thunkAPI) => {
        try {
            const response = await axiosInstance.post(`/users/${arg?.userId}/connections`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Third Party SSO");
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);


export const basicAuth = createAsyncThunk(
    'global/basicAuth',
    async (arg, thunkAPI) => {
        try {
            const response = await axiosInstance.post(`/users/${arg?.userId}/connections`, arg?.payload);
            return response;
        } catch (error) {
            handleErrorState(error, "Basic Auth");
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

export const getRelevantQuestions = createAsyncThunk(
    'global/getRelevantQuestions',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/kora/users/${arg?.userId}/advancedsearch/session/${arg?.sessionId}/altQuestions?tabId=${arg?.appId}`);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Get Relevant Questions");
            return rejectWithValue(error.response.data);
        }
    }
);

export const executionPipelineActions = createAsyncThunk(
    'global/executionPipelineActions',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.put(`kora/boards/${arg?.params?.boardId}/messages/${arg?.params?.messageId}/executionpipeline`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Execution Pipeline Actions");
            return rejectWithValue(error.response.data);
        }
    }
);

export const getSuggestedContactListNew = createAsyncThunk(
    'global/getSuggestedContactListNew',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/ka/users/${arg?.params?.userId}/connectors/${arg?.params?.source}/actions/send_email/resolveFields`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Get Suggested Contact List New");
            return rejectWithValue(error.response.data);
        }
    }
);

export const smartComposeEmail = createAsyncThunk(
    'global/smartComposeEmail',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/ka/users/${arg?.params?.userId}/nlp/generations/text`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Smart Compose Email");
            return rejectWithValue(error.response.data);
        }
    }
);

export const sendEmail = createAsyncThunk(
    'global/sendEmail',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/ka/users/${arg?.params?.userId}/connectors/${arg?.params?.provider || "gmail"}/actions/send_email`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Send Email");
            return rejectWithValue(error.response.data);
        }
    }
);

export const stopResponseGeneration = createAsyncThunk(
    'global/stopResponseGeneration',
    async (arg, { rejectWithValue }) => {
        try {
            let reqdQuestionId = encodeURIComponent(arg?.params?.id)
            const response = await axiosInstance.post(`kora/users/${arg?.params?.userId}/advancedsearch/cancelrequest/${reqdQuestionId}`, arg?.payload);
            console.log("stopResponseGeneration response", response);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Stop Response Generation");
            return rejectWithValue(error.response.data);
        }
    }
);

export const getAllAnnouncements = createAsyncThunk(
    'global/getAllAnnouncements',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/users/${arg?.params?.userId}/announcements`);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Unable to get Announcements");
            return rejectWithValue(error?.response?.data);
        }
    }
);

export const getUserDetails = createAsyncThunk(
    'global/getUserDetails',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/_resolve/user`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Get User Details");
            return rejectWithValue(error.response.data);
        }
    }
);


export const getChannelRecepients = createAsyncThunk(
    'global/getChannelRecepients',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/ka/users/${arg?.userId}/connectors/${arg?.source}/actions/send_message/resolveFields`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Get Channel Recepients");
            return rejectWithValue(error.response.data);
        }
    }
);

export const bookmarkAgentAction = createAsyncThunk(
    'global/bookmarkAgent',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.patch(`/users/${arg?.userId}/agents/${arg?.agentId}`, arg?.payload);
            return response.data;
        } catch (error) {
            handleErrorState(error, "Bookmark Agent");
            return rejectWithValue(error.response.data);
        }
    }
);

export const deleteAnnouncementAction = createAsyncThunk(
    'global/deleteAnnouncementAction',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.delete(`/users/${arg?.userId}/announcements/${arg?.announcementId}`);
            return { data: response.data, status: response.status };
        } catch (error) {
            handleErrorState(error, "Delete Announcement");
            return rejectWithValue(error.response.data);
        }
    }
);

export const resolveAgentAction = createAsyncThunk(
    'global/resolveAgent',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/_resolve/agent`, { id: arg?.payload });
            return response.data;
        } catch (error) {
            handleErrorState(error, "Resolve Agent");
            return rejectWithValue(error.response.data);
        }
    }
);
export const getRegeneratedAnswer = createAsyncThunk(
    'global/getRegeneratedAnswer',
    async (arg, thunkAPI) => {
        try {
            const response = await axiosInstance.post(`kora/users/${arg.userId}/advancedsearch/regenerate`, arg.payload, {
                params: arg?.params
            });
            return response.data;
        } catch (error) {
            handleErrorState(error, "Regenerate Answer");
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);
