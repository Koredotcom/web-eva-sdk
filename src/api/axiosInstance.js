import axios from 'axios';

const axiosInstance = axios.create({
  // baseURL: 'https://eva-dev.kore.ai/api/1.1/',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  config => {
    if (window.sdkConfig) {
      if (window.sdkConfig.api_url) {
        config.baseURL = window.sdkConfig.api_url;
      }
      if (window.sdkConfig.accessToken) {
        config.headers['Authorization'] = 'bearer ' + window.sdkConfig.accessToken;
      }
    } else {
      console.error("SDK error: Please initialize the SDK before using its components.");
    } 
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
