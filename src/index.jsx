// Import the CSS file
import './styles/sdk.scss';
import './styles/tom-select.css';

import { initializeSDK } from './config';
import {
  configureChatInterfaceElements,
  destroySDKRuntime,
  startNewChat,
} from './sdkRuntime';
import { chatBot } from './chatbot';

// Re-export all modules from nested directories
export { initializeSDK };
export {
  configureChatInterfaceElements,
  destroySDKRuntime,
  startNewChat,
} from './sdkRuntime';
export { chatBot } from './chatbot';
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
export * from "./schedulers";
export * from "./profile";
export * from "./sdkAgents";
export * from "./Authorization";


// Redux store exports
export { default as store } from './redux/store';
export * from './redux/globalSlice';

if (typeof window !== 'undefined') {
  window.EvaSDK = {
    initializeSDK,
    destroy: () => {
      destroySDKRuntime();
      window.__EVA_SDK_INITIALIZED__ = false;
    },
    reinitialize: (config) => {
      window.EvaSDK.destroy();
      initializeSDK(config);
    },
    chatInterface: {
      configure: (options) => configureChatInterfaceElements(options),
      startNewChat: () => startNewChat(),
    },
    chatBot,
  };
}