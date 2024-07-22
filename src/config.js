// let sdkConfig = null;

export const initializeSDK = (config) => {
  if (!config.accessToken) {
    console.error("SDK initialization error: 'accessToken' is required.");
    return;
  }
  if (!config.api_url) {
    console.error("SDK initialization error: 'api_url' is required.");
    return;
  }
  // sdkConfig = config;

  // Set the SDK config globally
  window.sdkConfig = config;
};
