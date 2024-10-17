import { fetchAgents, fetchConfigData, fetchProfileData, fetchHistory, fetchRecentFiles } from "./redux/actions/global.action";
import store from "./redux/store";
export const initializeSDK = (config) => {
  const requiredKeys = ['accessToken', 'api_url', 'userId']

  let misConfig = false;
  requiredKeys.map(key => {
    if(!Object.keys(config).includes(key)) {
      console.error(`SDK initialization error: '${key}' is required.`);
      misConfig = true
      return;
    }
  })

  // if(misConfig) return;
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && misConfig) return;

  // Set the SDK config globally
  window.sdkConfig = config;

  // making foundation api call once sdk initialized properly
  store.dispatch(fetchConfigData(config.userId))
  store.dispatch(fetchProfileData(config.userId))
  store.dispatch(fetchAgents({userId: config.userId}))
  store.dispatch(fetchHistory({onload: true, params: {limit: 10}}))
  store.dispatch(fetchRecentFiles({onload: true, userId: config.userId, params: {limit: 10}}))
};
