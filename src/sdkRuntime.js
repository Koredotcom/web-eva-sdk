import { renderParentComponent } from "./master-component/ParentComponent";
import { ChatInterface } from "./chat";
import InvokeAgent from "./chat/invokeAgent";
import store from "./redux/store";
import { updateChatData } from "./redux/globalSlice";
import { v4 as uuid } from "uuid";

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

export const setAgentContext = (agent) => {
  const instance = getChatInterfaceInstance();
  return instance.setAgentContext(agent);
};

export const invokeAgent = (agent) => InvokeAgent(agent);

/**
 * Replace the questions currently displayed by the chat UI.
 * This only updates Redux/UI state; it does not send a request to an agent.
 */
export const updateQuestions = (questions = {}) => {
  if (!questions || typeof questions !== "object" || Array.isArray(questions)) {
    throw new TypeError("updateQuestions expects a questions object");
  }

  const normalizedQuestions = Object.fromEntries(
    Object.entries(questions).map(([key, question]) => {
      if (!question || typeof question !== "object") return [key, question];

      const reqId = question.reqId || question.cId || question.id || uuid();
      return [key, {
        ...question,
        id: question.id || reqId,
        cId: question.cId || reqId,
        reqId: question.reqId || reqId,
      }];
    })
  );

  store.dispatch(updateChatData(normalizedQuestions));
  return normalizedQuestions;
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
