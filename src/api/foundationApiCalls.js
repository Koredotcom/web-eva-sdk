import { getProfileData, getConfigData } from "../redux/globalSlice";
import store from "../redux/store";

import axiosInstance from "./axiosInstance";

const configApiCall = async (config) => {
    const response = await axiosInstance({
        url: `ka/users/${config?.userId}/sdk/config`,
        method: 'GET'
    });
    store.dispatch(getConfigData(response.data))
}
const profileApiCall = async (config) => {
    const response = await axiosInstance({
        url: `ka/users/${config?.userId}/profile`,
        method: 'GET'
    });
    store.dispatch(getProfileData(response.data))
}

export {configApiCall, profileApiCall}