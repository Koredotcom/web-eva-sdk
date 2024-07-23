import { configApiCall, profileApiCall } from "./api/foundationApiCalls";

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

  if(misConfig) return;

  // Set the SDK config globally
  window.sdkConfig = config;

  // making foundation api call once sdk initialized properly
  configApiCall(config)
  profileApiCall(config)
};
