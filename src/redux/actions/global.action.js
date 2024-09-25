import { createAsyncThunk  } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosInstance";

// Asynchronous actions (thunks)
export const fetchConfigData = createAsyncThunk(
    'global/fetchConfigData',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`ka/users/${userId}/sdk/config`);
            return response.data;
        } catch (error) {
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
            return rejectWithValue(error.response.data);
        }
    }
);

export const fetchAgents = createAsyncThunk(
    'global/fetchAgents',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`users/${arg.userId}/agents`, arg?.params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);


const controller = new AbortController();
export const advanceSearch = createAsyncThunk(
    'global/advanceSearch',
    async (arg, thunkAPI) => {
        try {            
            const response = await axiosInstance.post(`kora/users/${arg.userId}/advancedsearch`, arg.payload, {
                params: arg?.params,
                signal: controller.signal,
            });
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

export const cancelAdvancedSearch = createAsyncThunk(
    'global/cancelAdvancedSearch',
    async (arg, thunkAPI) => { 
        controller?.abort();
        try {   
            let reqdQuestionId = encodeURIComponent(arg.reqId)         
            const response = await axiosInstance.delete(`https://eva-qa.kore.ai/api/kora/users/${arg.userId}/advancedsearch/cancelrequest/${reqdQuestionId}`, arg.payload);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

export const fetchHistory = createAsyncThunk(
    'global/fetchHistory',
    async ({params}, { rejectWithValue }) => {
        try {
            const response = await axiosInstance({
                url: `kora/boards?type=history`,
                method: 'GET',
                params
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const fetchRecentFiles = createAsyncThunk(
    'global/fetchRecentFiles',
    async ({userId, params}, { rejectWithValue }) => {
        try {
            const response = await axiosInstance({
                url: `ka/users/${userId}/files?fileContext=knowledge`,
                method: 'GET',
                params
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const getRecentFileDownloadUrl = createAsyncThunk(
    'global/getRecentFileDownloadUrl',
    async ({userId, params}, { rejectWithValue }) => {
        try {
            const response = await axiosInstance({
                url: `kora/boards/${userId}/sources/${params?.source}/${params?.docId}/signedMediaUrl`,
                method: 'GET',
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const deleteHistory = createAsyncThunk(
    'global/deleteHistory',
    async (params, { rejectWithValue }) => {
        try {
            const response = await axiosInstance({
                url: `/ka/boards/${params?.boardId}`, 
                method: 'DELETE'
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const updateHistory = createAsyncThunk(
    'global/updateHistory',
    async (arg,{ rejectWithValue }) => {
        try {
            const response = await axiosInstance.put(`/ka/boards/${arg?.params?.boardId}`,arg?.payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const getSearchHistory = createAsyncThunk(
    'global/getSearchHistory',
    async ({boardId, params},{ rejectWithValue }) => {
        try {
            const response = await axiosInstance({
                url: `/kora/boards/${boardId}/searchhistory`,
                method: 'GET',
                params
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);