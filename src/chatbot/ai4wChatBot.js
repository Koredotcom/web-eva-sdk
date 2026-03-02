import { initializeSDKRuntime } from "../sdkRuntime";
import { initializeSDK } from "../config";
import NewChat from "../chat/NewChat";
import { JoinChatThread } from "../chat";
import { unHideRecentAgentsDiv, hideRecentAgentsDiv } from "../LandingPageRecentAgents";
import { createHistorySidebar, initHistoryList } from "./chatbotHistory";
import store from "../redux/store";

const DEFAULT_CONTAINER_ID = "eva-sdk-chatbot-container";
const DEFAULT_TITLE = "Eva Assistant";

const state = {
  initialized: false,
  isOpen: false,
  isHistoryOpen: false,
  sourcesDrawerObserver: null,
  composebarObserver: null,
  elements: {
    button: null,
    panel: null,
    title: null,
    closeButton: null,
    contentContainer: null,
    threadLoadingOverlay: null,
    chatHistoryButton: null,
    historyOverlay: null,
    historySidebar: null,
    historyCloseButton: null,
    historyBody: null,
    historyContent: null,
  },
  historyUnsubscribe: null,
};

const ensureDomAvailable = () =>
  typeof window !== "undefined" && typeof document !== "undefined";

const BODY_CLASS_MACOS = "eva-sdk--macos";

const isMacOS = () => {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  const ua = navigator.userAgent || "";
  return /mac/i.test(platform) || /macintosh/i.test(ua);
};

const ensureMacOSBodyClass = () => {
  if (!ensureDomAvailable()) return;
  if (!isMacOS()) return;
  document.body.classList.add(BODY_CLASS_MACOS);
};

/**
 * Route agent-selection popup into the chatbot panel instead of <body>.
 * This keeps the popup scoped to the chatbot element tree.
 */
const ensureAgentSelectionPopupPortal = () => {
  if (!ensureDomAvailable()) return;
  if (state.__agentPopupPatched) return;

  const getPortal = () => {
    const panel = state.elements.panel;
    if (!panel) return null;
    let portal = panel.querySelector("#eva-sdk-agent-popup-portal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "eva-sdk-agent-popup-portal";
      // Overlay layer inside panel; allows popups to position freely.
      portal.style.position = "fixed";
      portal.style.inset = "0";
      portal.style.zIndex = "999999";
      portal.style.pointerEvents = "none";
      panel.appendChild(portal);
    }
    return portal;
  };

  const origAppendChild = document.body.appendChild.bind(document.body);
  document.body.appendChild = (node) => {
    try {
      if (
        node &&
        node.nodeType === 1 &&
        node.classList &&
        node.classList.contains("agent-selection-popup")
      ) {
        const portal = getPortal();
        if (portal) {
          // Allow interactions inside the popup
          node.style.pointerEvents = "auto";
          return portal.appendChild(node);
        }
      }
    } catch (e) {
      // fall through
    }
    return origAppendChild(node);
  };

  state.__agentPopupPatched = true;
};

const QUESTIONS_WITH_BOT_WRAPPER_CLASS =
  "eva-sdk-questions-container--with-bot-input-wrapper";

const isElementDisplayBlock = (el) => {
  if (!el) return false;
  const style = window.getComputedStyle?.(el);
  if (!style) return false;
  return (
    style.display === "block" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
};

/**
 * When composebar-bot-input-wrapper is present & visible, add a class on questions container.
 */
const syncQuestionsContainerClass = () => {
  const root = state.elements.panel || document;
  const botWrapper = root.querySelector?.(".composebar-bot-input-wrapper");
  const questionsContainer =
    root.querySelector?.(".questions-container") ||
    root.querySelector?.("#questions-container") ||
    document.querySelector?.(".questions-container") ||
    document.querySelector?.("#questions-container");
  const questionsContainerById =
    root.querySelector?.("#questions-container") ||
    document.querySelector?.("#questions-container");

  if (!questionsContainer) return;

  const enabled = !!botWrapper && isElementDisplayBlock(botWrapper);
  questionsContainer.classList.toggle(QUESTIONS_WITH_BOT_WRAPPER_CLASS, enabled);

  // Specifically adjust #questions-container spacing when bot wrapper is shown
  if (questionsContainerById) {
    if (!enabled) {
      questionsContainerById.style.paddingBottom = "";
    } else {
      const remToPx =
        parseFloat(window.getComputedStyle(document.documentElement).fontSize) ||
        16;
      const wrapperHeight = botWrapper?.offsetHeight || 0;
      questionsContainerById.style.paddingBottom = `${wrapperHeight + remToPx}px`;
    }
  }
};

const ensureComposebarBotWrapperWatcher = () => {
  if (state.composebarObserver) return;

  // Initial sync (in case elements already exist)
  try {
    syncQuestionsContainerClass();
  } catch (e) {
    // ignore
  }

  const target = state.elements.panel || document.body;
  const observer = new MutationObserver(() => {
    // Keep this very cheap; the function does a few querySelector calls.
    syncQuestionsContainerClass();
  });

  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden"],
  });

  state.composebarObserver = observer;
};

/**
 * Force Shoelace Sources drawer to use bottom placement.
 * Note: The drawer is created elsewhere (SourcesSidebar), so we enforce it here at runtime.
 */
const enforceSourcesDrawerBottomPlacement = () => {
  const drawer = document.getElementById("sources-sidebar-drawer");
  if (!drawer) return false;

  // Shoelace supports: start | end | top | bottom
  drawer.setAttribute("placement", "bottom");
  return true;
};

/**
 * Observe DOM for Sources drawer creation and enforce placement.
 */
const ensureSourcesDrawerPlacementWatcher = () => {
  if (state.sourcesDrawerObserver) return;

  // Apply immediately if it already exists
  enforceSourcesDrawerBottomPlacement();

  const observer = new MutationObserver(() => {
    enforceSourcesDrawerBottomPlacement();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  state.sourcesDrawerObserver = observer;
};

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
    panel
      ?.querySelector?.(".eva-composebar-area")
      ?.classList?.remove("eva-composebar-area--history-selected");
    unHideRecentAgentsDiv('recent-agents-container');
    NewChat();
    /* Hide agent banner after Redux subscribers run, so ComposeBar does not re-show it */
    const hideAgentBanner = () => {
      const agentBanner = document.querySelector('.composebar-bot-input-wrapper');
      if (agentBanner) agentBanner.style.display = "none";
    };
    setTimeout(hideAgentBanner, 0);
  });

  const chatHistoryButton = document.createElement("button");
  chatHistoryButton.type = "button";
  chatHistoryButton.className = "sdk-chatbot-newchat sdk-chatbot-chat-history";
  chatHistoryButton.textContent = "Chat History";
  if (store.getState().global.disableHistorySectionInChatSection) {
    chatHistoryButton.style.display = "none";
  }

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

  const threadLoadingOverlay = document.createElement("div");
  threadLoadingOverlay.className = "eva-sdk-chatbot-thread-skeleton";
  threadLoadingOverlay.setAttribute("aria-hidden", "true");
  threadLoadingOverlay.innerHTML = `
    <div class="eva-sdk-chatbot-thread-skeleton-content">
      <div class='top-component'>
         <div class="questions-container">
           <div class="message-container">
              <div class="skeleton-group-wrapper">
                <div class="skeleton-group">
                  <div class="skeleton-group-item">
                    <sl-skeleton effect="pulse" width="1rem" height="1rem"></sl-skeleton>
                    <sl-skeleton effect="pulse" width="60%" height="1rem"></sl-skeleton>
                  </div>
                  <div class="skeleton-group-item">
                    <sl-skeleton effect="pulse" width="1rem" height="1rem"></sl-skeleton>
                    <sl-skeleton effect="pulse" width="60%" height="1rem"></sl-skeleton>
                  </div>
                </div>
                <div class="skeleton-group">
                  <div class="skeleton-group-item">
                    <sl-skeleton effect="pulse" width="1rem" height="1rem"></sl-skeleton>
                    <sl-skeleton effect="pulse" width="60%" height="1rem"></sl-skeleton>
                  </div>
                  <div class="skeleton-group-item">
                    <sl-skeleton effect="pulse" width="1rem" height="1rem"></sl-skeleton>
                    <sl-skeleton effect="pulse" width="60%" height="1rem"></sl-skeleton>
                  </div>
                </div>
                <div class="skeleton-group">
                  <div class="skeleton-group-item">
                    <sl-skeleton effect="pulse" width="1rem" height="1rem"></sl-skeleton>
                    <sl-skeleton effect="pulse" width="60%" height="1rem"></sl-skeleton>
                  </div>
                  <div class="skeleton-group-item">
                    <sl-skeleton effect="pulse" width="1rem" height="1rem"></sl-skeleton>
                    <sl-skeleton effect="pulse" width="60%" height="1rem"></sl-skeleton>
                  </div>
                </div>
              </div>
           </div>
         </div>
      </div>
      <div class='bottom-component'>
        <div class="compose-bar-container" id="compose-bar-container">
          <div class="ComposeBarContainer new-layout">
            <div class="eva-composebar-parent">
              <div class="eva-composebar-area eva-composebar-area--history-selected">
                <div class="eva-input-container">
                  <div class="left-actions">
                    <sl-skeleton effect="pulse" width="2rem" height="2rem"></sl-skeleton>
                  </div>
                  <div class="eva-compose-textarea-container">
                    <sl-skeleton effect="pulse" width="60%"></sl-skeleton>
                  </div>
                  <div class="right-actions">
                    <sl-skeleton effect="pulse" width="2rem" height="2rem"></sl-skeleton>
                    <sl-skeleton effect="pulse" width="2rem" height="2rem"></sl-skeleton>
                    <sl-skeleton effect="pulse" width="2rem" height="2rem"></sl-skeleton>
                  </div>                  
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  contentContainer.appendChild(threadLoadingOverlay);

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
    threadLoadingOverlay,
    chatHistoryButton,
    historyOverlay: overlay,
    historySidebar: sidebar,
    historyCloseButton,
    historyBody,
    historyContent,
  };
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
    threadLoadingOverlay,
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
    threadLoadingOverlay,
    chatHistoryButton,
    historyOverlay: overlay,
    historySidebar: sidebar,
    historyCloseButton,
    historyBody,
    historyContent,
  };

  // Ensure agent-selection popup is scoped inside chatbot panel
  ensureAgentSelectionPopupPortal();

  const listContainer = historyContent?.querySelector(".eva-sdk-chatbot-history-list");
  if (listContainer && !state.historyUnsubscribe) {
    const showThreadLoader = () => {
      const overlay = state.elements.threadLoadingOverlay;
      if (overlay) {
        overlay.classList.add("eva-sdk-chatbot-thread-skeleton--visible");
        overlay.setAttribute("aria-hidden", "false");
      }
    };
    const hideThreadLoader = () => {
      const overlay = state.elements.threadLoadingOverlay;
      if (overlay) {
        overlay.classList.remove("eva-sdk-chatbot-thread-skeleton--visible");
        overlay.setAttribute("aria-hidden", "true");
      }
    };
    const result = initHistoryList(listContainer, {
      onThreadClick: async (item) => {
        closeHistory();
        hideRecentAgentsDiv("recent-agents-container");
        showThreadLoader();
        try {
          await JoinChatThread({ boardId: item?.id });
        } finally {
          hideThreadLoader();
        }
      },
    });
    if (result) state.historyUnsubscribe = result.unsubscribe;
  }

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

  // Keep questions container in sync with composebar header wrapper visibility
  ensureComposebarBotWrapperWatcher();
};

const ensureChatContainer = (containerId) => {
  const { contentContainer, threadLoadingOverlay } = state.elements;
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

  if (threadLoadingOverlay && threadLoadingOverlay.parentNode === contentContainer) {
    contentContainer.appendChild(threadLoadingOverlay);
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
  button.classList.toggle("eva-sdk-chatbot-button--hidden", state.isOpen);
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

  ensureMacOSBodyClass();

  const containerId = config?.containerId || DEFAULT_CONTAINER_ID;
  const sdkAlreadyInitialized =
    typeof window !== "undefined" && window.__EVA_SDK_INITIALIZED__;

  ensureElements(config);
  ensureChatContainer(containerId);
  ensureSourcesDrawerPlacementWatcher();

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

  // Re-enforce in case something changed between sessions
  enforceSourcesDrawerBottomPlacement();
  syncQuestionsContainerClass();
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
