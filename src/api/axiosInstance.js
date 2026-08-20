import axios from 'axios';
import packageJson from '../../package.json';

const axiosInstance = axios.create({
  // baseURL: 'https://eva-dev.kore.ai/api/1.1/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Browser globals are unavailable during Node-based tests and server-side
// imports. Treat those environments as web instead of failing at import time.
const isMobile = () => typeof navigator !== 'undefined'
  && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const _analyticsData =
  `channel=${isMobile() ? 'mobile' : 'web'};version=` +
  packageJson.version +
  ';tz=' +
  (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') +
  ';'


axiosInstance.interceptors.request.use(
  config => {
    if (window.sdkConfig) {
      if (window.sdkConfig.api_url) {
        config.baseURL = window.sdkConfig.api_url;
      }
      if (window.sdkConfig.accessToken) {
        config.headers['Authorization'] = 'bearer ' + window.sdkConfig.accessToken;
      }
      config.headers['X-KORA-Client'] = _analyticsData;
    } else {
      console.error("SDK error: Please initialize the SDK before using its components.");
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

const isIntercepted = (config = {}) => {
  return !(config.hasOwnProperty('intercepted') && !config.intercepted);
};

export default axiosInstance;
