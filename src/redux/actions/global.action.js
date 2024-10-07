import { createAsyncThunk  } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axiosInstance";

// Asynchronous actions (thunks)
export const fetchConfigData = createAsyncThunk(
    'global/fetchConfigData',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`1.1/ka/users/${userId}/sdk/config`);
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
            const response = await axiosInstance.get(`1.1/ka/users/${userId}/profile`);
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
            const response = await axiosInstance.get(`1.1/users/${arg.userId}/agents`, arg?.params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);


let controller;
export const advanceSearch = createAsyncThunk(
    'global/advanceSearch',
    async (arg, thunkAPI) => {
        controller = new AbortController();
        try {            
            const response = await axiosInstance.post(`1.1/kora/users/${arg.userId}/advancedsearch`, arg.payload, {
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
        
        try {   
            let reqdQuestionId = encodeURIComponent(arg.reqId)

            const response = await axiosInstance({
                url: `kora/users/${arg.userId}/advancedsearch/cancelrequest/${reqdQuestionId}`, 
                method: 'DELETE',
                data: arg.payload
            });

            controller?.abort();
            controller = null;
            
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
                url: `1.1/kora/boards?type=history`,
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
                url: `1.1/ka/users/${userId}/files?fileContext=knowledge`,
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
                url: `1.1/kora/boards/${userId}/sources/${params?.source}/${params?.docId}/signedMediaUrl`,
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
                url: `1.1/ka/boards/${params?.boardId}`, 
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
            const response = await axiosInstance.put(`1.1/ka/boards/${arg?.params?.boardId}`,arg?.payload);
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
                url: `1.1/kora/boards/${boardId}/searchhistory`,
                method: 'GET',
                params
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const searchSession = createAsyncThunk(
    'global/searchSession',
    async (arg, { rejectWithValue }) => {
        try{
            if(arg?.params?.action === "add"){
                const response = await axiosInstance.post(`/kora/users/${arg?.userId}/searchsession`, arg?.payload)
                return response.data
            }
            else if(arg?.params?.action === "update"){
                const response = await axiosInstance.put(`/kora/users/${arg?.userId}/searchsession/${arg?.sessionId}`, arg?.payload)
                return response.data
            }
            else if(arg?.params?.action === "remove"){
                const response = await axiosInstance.delete(`/kora/users/${arg?.userId}/searchsession/${arg?.sessionId}/sources/${arg?.docId}`)
                return response.data
            }
        }
        catch (error){
            return rejectWithValue(error.response.data)
        }
    }
)