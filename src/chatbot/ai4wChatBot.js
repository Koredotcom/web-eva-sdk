import { initializeSDKRuntime } from "../sdkRuntime";
import { initializeSDK } from "../config";

const DEFAULT_CONTAINER_ID = "eva-sdk-chatbot-container";
const DEFAULT_TITLE = "Eva Assistant";

const state = {
  initialized: false,
  isOpen: false,
  elements: {
    button: null,
    panel: null,
    title: null,
    closeButton: null,
    contentContainer: null,
  },
};

const ensureDomAvailable = () =>
  typeof window !== "undefined" && typeof document !== "undefined";

const createButton = (label) => {
  const button = document.createElement("button");
  button.type = "button";
  button.id = "eva-sdk-chatbot-button";
  button.className = "eva-sdk-chatbot-button";
  button.setAttribute("aria-label", label);
  button.innerHTML =
    '<span class="eva-sdk-chatbot-button-icon" aria-hidden="true"><img src="https://staticqa2-workassist.kore.ai/KoraQA/images/eva-black-svg.svg" width="16" height="16" /></span>' +
    `<span class="eva-sdk-chatbot-button-text">${label}</span>`;
  return button;
};

const createPanel = (titleText) => {
  const panel = document.createElement("div");
  panel.id = "eva-sdk-chatbot-panel";
  panel.className = "eva-sdk-chatbot-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-hidden", "true");

  const header = document.createElement("div");
  header.className = "eva-sdk-chatbot-header";

  const title = document.createElement("div");
  title.className = "eva-sdk-chatbot-title";
  title.textContent = titleText;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "eva-sdk-chatbot-close";
  closeButton.setAttribute("aria-label", "Close chat");
  closeButton.innerHTML = "×";

  header.appendChild(title);
  header.appendChild(closeButton);

  const body = document.createElement("div");
  body.className = "eva-sdk-chatbot-body";

  const contentContainer = document.createElement("div");
  contentContainer.className = "eva-sdk-chatbot-content";
  body.appendChild(contentContainer);

  panel.appendChild(header);
  panel.appendChild(body);

  return { panel, title, closeButton, contentContainer };
};

const ensureElements = (config = {}) => {
  if (state.elements.button && state.elements.panel) {
    return;
  }

  const buttonLabel = config?.buttonLabel || "Chat";
  const titleText = config?.title || DEFAULT_TITLE;

  const button = createButton(buttonLabel);
  const panelElements = createPanel(titleText);

  const { panel, title, closeButton, contentContainer } = panelElements;

  button.setAttribute("aria-controls", "eva-sdk-chatbot-panel");
  button.setAttribute("aria-expanded", "false");

  document.body.appendChild(button);
  document.body.appendChild(panel);

  state.elements = {
    button,
    panel,
    title,
    closeButton,
    contentContainer,
  };

  button.addEventListener("click", () => {
    if (state.isOpen) {
      close();
    } else {
      open();
    }
  });

  closeButton.addEventListener("click", () => {
    close();
  });
};

const ensureChatContainer = (containerId) => {
  const { contentContainer } = state.elements;
  if (!contentContainer) {
    return null;
  }

  let container = contentContainer.querySelector(`#${containerId}`);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "eva-sdk-chatbot-container";
    contentContainer.appendChild(container);
  }

  return container;
};

const syncPanelState = () => {
  const { panel, button } = state.elements;
  if (!panel || !button) {
    return;
  }

  panel.classList.toggle("eva-sdk-chatbot-panel--open", state.isOpen);
  panel.setAttribute("aria-hidden", state.isOpen ? "false" : "true");
  button.setAttribute("aria-expanded", state.isOpen ? "true" : "false");
};

export const init = (config = {}) => {
  if (!ensureDomAvailable()) {
    return null;
  }

  const containerId = config?.containerId || DEFAULT_CONTAINER_ID;
  const sdkAlreadyInitialized =
    typeof window !== "undefined" && window.__EVA_SDK_INITIALIZED__;

  ensureElements(config);
  ensureChatContainer(containerId);

  initializeSDK({
    ...config,
    containerId,
  });
  if (sdkAlreadyInitialized) {
    initializeSDKRuntime({ containerId });
  }

  if (config?.autoOpen) {
    state.isOpen = true;
  }

  syncPanelState();
  state.initialized = true;

  return containerId;
};

export const open = () => {
  if (!state.initialized) {
    return;
  }

  state.isOpen = true;
  syncPanelState();
};

export const close = () => {
  if (!state.initialized) {
    return;
  }

  state.isOpen = false;
  syncPanelState();
};

export const chatBot = {
  init,
  open,
  close,
};
