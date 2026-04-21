// Styles (keep ordering: vendor CSS first, then SDK overrides)
import 'choices.js/public/assets/styles/choices.css';
import '@shoelace-style/shoelace/dist/themes/light.css';
import 'tom-select/dist/css/tom-select.css';
import './styles/input-text.css';
import './styles/buttons.css';
import './styles/dropdown.css';
import './styles/sdk.scss';
import './styles/tom-select.css';
import '@shoelace-style/shoelace';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import TomSelect from 'tom-select';
import './plugins/tom-autocomplete.js';

if (typeof document !== "undefined" && typeof window !== "undefined") {
  if (!window.__EVA_SDK_ASSET_BASE__) {
    const script = document.currentScript;
    if (script && script.src) {
      const baseUrl = script.src.substring(0, script.src.lastIndexOf("/") + 1);
      window.__EVA_SDK_ASSET_BASE__ = baseUrl;
    }
  }

  if (window.__EVA_SDK_ASSET_BASE__) {
    const assetBase = window.__EVA_SDK_ASSET_BASE__;
    setBasePath(`${assetBase}shoelace/`);
    window.TomSelect = TomSelect;
    document.documentElement.style.setProperty(
      "--eva-sdk-asset-base",
      assetBase
    );
    document.documentElement.style.setProperty(
      "--eva-sdk-font-eot",
      `${assetBase}fonts/Inter-Variable.eot?v=3.13`
    );
    document.documentElement.style.setProperty(
      "--eva-sdk-font-woff2",
      `${assetBase}fonts/Inter-Variable.woff2?v=3.13`
    );
    document.documentElement.style.setProperty(
      "--eva-sdk-font-woff",
      `${assetBase}fonts/Inter-Variable.woff?v=3.13`
    );
  }
}

// Re-export all modules from nested directories
import { initializeSDK } from './config';
import { configureChatInterfaceElements, destroySDKRuntime, startNewChat } from './sdkRuntime';
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
export * from "./authorization";
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
      startNewChat: () => startNewChat(),
    },
    chatBot,
  };
}