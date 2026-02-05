import { initializeSDKRuntime } from "../sdkRuntime";
import { initializeSDK } from "../config";
import NewChat from "../chat/NewChat";
import { unHideRecentAgentsDiv } from "../LandingPageRecentAgents";

const DEFAULT_CONTAINER_ID = "eva-sdk-chatbot-container";
const DEFAULT_TITLE = "Eva Assistant";

const state = {
  initialized: false,
  isOpen: false,
  isHistoryOpen: false,
  elements: {
    button: null,
    panel: null,
    title: null,
    closeButton: null,
    contentContainer: null,
    chatHistoryButton: null,
    historyOverlay: null,
    historySidebar: null,
    historyCloseButton: null,
    historyBody: null,
    historyContent: null,
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

  const newChatButton = document.createElement("button");
  newChatButton.type = "button";
  newChatButton.className = "sdk-chatbot-newchat";
  newChatButton.textContent = "New Chat";

  newChatButton.addEventListener("click", () => {
    unHideRecentAgentsDiv('recent-agents-container');
    NewChat()
  });

  const chatHistoryButton = document.createElement("button");
  chatHistoryButton.type = "button";
  chatHistoryButton.className = "sdk-chatbot-newchat sdk-chatbot-chat-history";
  chatHistoryButton.textContent = "Chat History";

  const headerButtonContainer = document.createElement("div");
  headerButtonContainer.className = "eva-sdk-chatbot-header-buttons";
  headerButtonContainer.appendChild(chatHistoryButton);
  headerButtonContainer.appendChild(newChatButton);
  headerButtonContainer.appendChild(closeButton);

  header.appendChild(title);
  header.appendChild(headerButtonContainer);

  const body = document.createElement("div");
  body.className = "eva-sdk-chatbot-body";

  const contentContainer = document.createElement("div");
  contentContainer.className = "eva-sdk-chatbot-content";
  body.appendChild(contentContainer);

  panel.appendChild(header);
  panel.appendChild(body);

  const historyElements = createHistorySidebar();
  const {
    overlay,
    sidebar,
    closeButton: historyCloseButton,
    body: historyBody,
    content: historyContent,
  } = historyElements;
  panel.appendChild(overlay);

  return {
    panel,
    title,
    closeButton,
    contentContainer,
    chatHistoryButton,
    historyOverlay: overlay,
    historySidebar: sidebar,
    historyCloseButton,
    historyBody,
    historyContent,
  };
};

const createHistorySidebar = () => {
  const overlay = document.createElement("div");
  overlay.className = "eva-sdk-chatbot-history-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const sidebar = document.createElement("aside");
  sidebar.className = "eva-sdk-chatbot-history-sidebar";
  sidebar.setAttribute("role", "dialog");
  sidebar.setAttribute("aria-label", "Chat History");
  sidebar.setAttribute("aria-modal", "true");

  const header = document.createElement("div");
  header.className = "eva-sdk-chatbot-history-header";

  const title = document.createElement("div");
  title.className = "eva-sdk-chatbot-history-title";
  title.textContent = "Chat History";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "eva-sdk-chatbot-history-close";
  closeButton.setAttribute("aria-label", "Close chat history");
  closeButton.innerHTML = "×";

  header.appendChild(title);
  header.appendChild(closeButton);

  const body = document.createElement("div");
  body.className = "eva-sdk-chatbot-history-body";

  const content = document.createElement("div");
  content.className = "eva-sdk-chatbot-history-content";

  // Sample structured HTML (can be replaced via setChatHistoryContent)
  content.innerHTML = `
    <div class="eva-sdk-chatbot-history-list">
      <div class='history-item-group'>
        <div class='history-item-group-title'>Last 7 days</div>
        <ul class='history-item-group-items'>
          <li class='history-item-group-item'>
            <div class='history-item-group-item-title'>Order status</div>
          </li>
          <li class='history-item-group-item'>
            <div class='history-item-group-item-title'>Order status</div>
          </li>
          <li class='history-item-group-item'>
            <div class='history-item-group-item-title'>Order status</div>
          </li>
          <li class='history-item-group-item'>
            <div class='history-item-group-item-title'>Order status</div>
          </li>
          <li class='history-item-group-item'>
            <div class='history-item-group-item-title'>Order status</div>
          </li>
        </ul>
      </div>
      <div class='history-item-group'>
        <div class='history-item-group-title'>Last 7 days</div>
        <ul class='history-item-group-items'>
          <li class='history-item-group-item'>
            <div class='history-item-group-item-title'>Order status</div>
          </li>
          <li class='history-item-group-item'>
            <div class='history-item-group-item-title'>Order status</div>
          </li>
          <li class='history-item-group-item'>
            <div class='history-item-group-item-title'>Order status</div>
          </li>
          <li class='history-item-group-item'>
            <div class='history-item-group-item-title'>Order status</div>
          </li>
          <li class='history-item-group-item'>
            <div class='history-item-group-item-title'>Lorem ipsum dolor sit amet Lorem ipsum dolor sit amet Lorem ipsum dolor sit amet Lorem ipsum dolor sit amet</div>
          </li>
        </ul>
      </div>
    </div>
  `;
  body.appendChild(content);

  sidebar.appendChild(header);
  sidebar.appendChild(body);
  overlay.appendChild(sidebar);

  // Clicking outside closes; clicking inside should not.
  sidebar.addEventListener("click", (e) => e.stopPropagation());

  return { overlay, sidebar, closeButton, body, content };
};

const ensureElements = (config = {}) => {
  if (state.elements.button && state.elements.panel) {
    return;
  }

  const buttonLabel = config?.buttonLabel || "Chat";
  const titleText = config?.title || DEFAULT_TITLE;

  const button = createButton(buttonLabel);
  const panelElements = createPanel(titleText);

  const {
    panel,
    title,
    closeButton,
    contentContainer,
    chatHistoryButton,
    historyOverlay: overlay,
    historySidebar: sidebar,
    historyCloseButton,
    historyBody,
    historyContent,
  } = panelElements;

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
    chatHistoryButton,
    historyOverlay: overlay,
    historySidebar: sidebar,
    historyCloseButton,
    historyBody,
    historyContent,
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

  if (chatHistoryButton) {
    chatHistoryButton.addEventListener("click", (e) => {
      // Defensive: avoid any form-submit/navigation behavior.
      e.preventDefault?.();
      if (state.isHistoryOpen) {
        closeHistory();
      } else {
        openHistory();
      }
    });
  }

  overlay.addEventListener("click", () => {
    closeHistory();
  });

  historyCloseButton.addEventListener("click", () => {
    closeHistory();
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

const syncHistoryState = () => {
  const { historyOverlay, historySidebar } = state.elements;
  if (!historyOverlay || !historySidebar) {
    return;
  }

  historyOverlay.classList.toggle(
    "eva-sdk-chatbot-history-overlay--open",
    state.isHistoryOpen
  );
  historySidebar.classList.toggle(
    "eva-sdk-chatbot-history-sidebar--open",
    state.isHistoryOpen
  );
  historyOverlay.setAttribute("aria-hidden", state.isHistoryOpen ? "false" : "true");

  if (state.isHistoryOpen && state.elements.historyCloseButton) {
    state.elements.historyCloseButton.focus?.();
  }
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
  syncHistoryState();
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
  state.isHistoryOpen = false;
  syncPanelState();
  syncHistoryState();
};

const openHistory = () => {
  if (!state.initialized) {
    return;
  }

  state.isHistoryOpen = true;
  syncHistoryState();
};

const closeHistory = () => {
  if (!state.initialized) {
    return;
  }

  state.isHistoryOpen = false;
  syncHistoryState();
};

export const setChatHistoryContent = (html) => {
  if (!state.initialized) {
    return;
  }

  const { historyContent } = state.elements;
  if (!historyContent) {
    return;
  }

  // Allow either DOM Node or HTML string.
  if (typeof Node !== "undefined" && html instanceof Node) {
    historyContent.replaceChildren(html);
    return;
  }

  historyContent.innerHTML = typeof html === "string" ? html : "";
};

export const chatBot = {
  init,
  open,
  close,
  setChatHistoryContent,
};
