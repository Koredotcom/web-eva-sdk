import { createAsyncThunk } from "@reduxjs/toolkit";
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

export const advanceSearch = createAsyncThunk(
    'global/advanceSearch',
    async (arg, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`kora/users/${arg.userId}/advancedsearch`, arg.payload, {
                params: arg?.params
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const fetchRecentFiles = createAsyncThunk(
    'global/fetchRecentFiles',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`ka/users/${userId}/files?fileContext=knowledge`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);