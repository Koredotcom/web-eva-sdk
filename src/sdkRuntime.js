import { renderParentComponent } from "./master-component/ParentComponent";
import { ChatInterface } from "./chat";

let initialized = false;
let parentRendered = false;
let chatInterfaceInstance = null;

const buildNotInitializedError = () =>
  new Error(
    "EvaSDK.initializeSDK(...) must be called before using EvaSDK.chatInterface."
  );

// export const initializeSDKRuntime = ({ containerId } = {}) => {
//   if (!chatInterfaceInstance) {
//     chatInterfaceInstance = ChatInterface();
//   }

//   if (!parentRendered && containerId && typeof document !== "undefined") {
//     renderParentComponent(containerId);
//     parentRendered = true;
//   }

//   initialized = true;
//   return chatInterfaceInstance;
// };

export const initializeSDKRuntime = ({ containerId } = {}) => {
  if (!parentRendered && containerId && typeof document !== "undefined") {
    renderParentComponent(containerId);
    parentRendered = true;
  }

  if (!chatInterfaceInstance) {
    chatInterfaceInstance = ChatInterface();
  }

  initialized = true;
  return chatInterfaceInstance;
};

export const getChatInterfaceInstance = () => {
  if (!initialized || !chatInterfaceInstance) {
    throw buildNotInitializedError();
  }

  return chatInterfaceInstance;
};

export const configureChatInterfaceElements = (options) => {
  const instance = getChatInterfaceInstance();
  return instance.configureChatInterfaceElements(options);
};

export const destroySDKRuntime = () => {
  chatInterfaceInstance = null;
  parentRendered = false;
  initialized = false;
};

export const startNewChat = () => {
  const instance = getChatInterfaceInstance();
  if (!instance.startNewChat) {
    console.warn("startNewChat is not available");
    return;
  }
  instance.startNewChat();
};
