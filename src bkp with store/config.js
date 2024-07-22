// let sdkConfig = null;

export const initializeSDK = (config) => {
  if (!config || !config.accessToken) {
    console.error("SDK initialization error: 'accessToken' is required.");
    return;
  }
  // sdkConfig = config;

  // Set the SDK config globally
  window.sdkConfig = config;
};
