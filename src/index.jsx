// Import the CSS file
import './styles/sdk.scss';
import './styles/tom-select.css';

// Re-export all modules from nested directories
import { initializeSDK } from './config';
import { configureChatInterfaceElements, destroySDKRuntime } from './sdkRuntime';
import { chatBot } from './chatbot';
export { initializeSDK };
export * from './components';
export * from './history';
export * from './widgets';
export * from './chat';
export * from './agents';
export * from './files';
export * from './Attachments';
export * from './Feedback'
export * from "./templateRenderer";
export * from "./Announcements";
export * from "./chatbot";
export { RenderComposeBar } from './composebar';
export { renderRecentAgents, hideRecentAgentsDiv, unHideRecentAgentsDiv, RecentAgentsFunc } from './LandingPageRecentAgents';

// Redux store exports
export { default as store } from './redux/store';
export * from './redux/globalSlice';

if (typeof window !== 'undefined') {
  // window.EvaSDK = {
  //   initializeSDK,
  //   chatInterface: {
  //     configure: (options) => configureChatInterfaceElements(options),
  //   },
  // };
  window.EvaSDK = {
    initializeSDK,
    destroy: () => {
      // WebSocketService.disconnect?.();
      destroySDKRuntime();
      window.__EVA_SDK_INITIALIZED__ = false;
    },
    reinitialize: (config) => {
      window.EvaSDK.destroy();
      initializeSDK(config);
    },
    chatInterface: {
      configure: (options) => configureChatInterfaceElements(options),
    },
    chatBot,
  };
}