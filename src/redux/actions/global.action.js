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
            const response = await axiosInstance.delete(`kora/users/${arg.userId}/advancedsearch/cancelrequest/${arg.reqId}`, arg.payload);
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