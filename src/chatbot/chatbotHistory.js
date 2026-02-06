import { HistoryInterface } from "../history";
import { JoinChatThread } from "../chat";
import LoadMoreHistoryData from "../history/LoadMoreHistoryData";
import store from "../redux/store";
import { hideRecentAgentsDiv } from "../LandingPageRecentAgents";
import { segregateHistoryBySections, HISTORY_SECTIONS } from "../utils/helpers";


const getHistorySectionsOrdered = (items, timeZone) => {
  const { today, yesterday, last7Days, last30Days, older } = segregateHistoryBySections(items, timeZone);
  const out = [];
  if (today.length) out.push({ sectionTitle: HISTORY_SECTIONS.TODAY, items: today });
  if (yesterday.length) out.push({ sectionTitle: HISTORY_SECTIONS.YESTERDAY, items: yesterday });
  if (last7Days.length) out.push({ sectionTitle: HISTORY_SECTIONS.LAST_7_DAYS, items: last7Days });
  if (last30Days.length) out.push({ sectionTitle: HISTORY_SECTIONS.LAST_30_DAYS, items: last30Days });
  if (older.length) out.push({ sectionTitle: HISTORY_SECTIONS.OLDER, items: older });
  return out;
};


export const createHistorySidebar = () => {
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
  content.innerHTML = '<div class="eva-sdk-chatbot-history-list"></div>';
  body.appendChild(content);

  sidebar.appendChild(header);
  sidebar.appendChild(body);
  overlay.appendChild(sidebar);

  sidebar.addEventListener("click", (e) => e.stopPropagation());

  return { overlay, sidebar, closeButton, body, content };
};


const renderHistoryList = (listContainer, historyData, callbacks = {}) => {
  if (!listContainer) return;
  const boards = historyData?.data || [];
  const { onItemSelect } = callbacks;

  const sections = getHistorySectionsOrdered(boards);

  const fragment = document.createDocumentFragment();
  sections.forEach(({ sectionTitle, items }) => {
    const group = document.createElement("div");
    group.className = "history-item-group";
    const titleEl = document.createElement("div");
    titleEl.className = "history-item-group-title";
    titleEl.textContent = sectionTitle;
    group.appendChild(titleEl);

    const ul = document.createElement("ul");
    ul.className = "history-item-group-items";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "history-item-group-item";
      li.setAttribute("data-board-id", item?.id || "");
      const itemTitle = document.createElement("div");
      itemTitle.className = "history-item-group-item-title";
      itemTitle.textContent = item?.name || "Untitled";
      li.appendChild(itemTitle);
      li.addEventListener("click", () => {
        hideRecentAgentsDiv("recent-agents-container");
        JoinChatThread({ boardId: item?.id });
        onItemSelect?.();
      });
      ul.appendChild(li);
    });
    group.appendChild(ul);
    fragment.appendChild(group);
  });

  listContainer.replaceChildren(fragment);
};

const createHistoryLoader = () => {
  const wrap = document.createElement("div");
  wrap.className = "eva-sdk-chatbot-history-loader";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `
    <div class="eva-sdk-chatbot-history-loader-spinner"></div>
    <span class="eva-sdk-chatbot-history-loader-text">Loading...</span>
  `;
  return wrap;
};

const setupLoadingIndicator = (listContainer) => {
  const content = listContainer?.parentElement;
  if (!content) return () => {};

  const loader = createHistoryLoader();
  content.appendChild(loader);

  const updateVisibility = () => {
    const isLoading = store.getState()?.global?.AllHistory?.status === "loading";
    loader.classList.toggle("eva-sdk-chatbot-history-loader--visible", isLoading);
    loader.setAttribute("aria-hidden", String(!isLoading));
  };

  updateVisibility();
  const unsubscribe = store.subscribe(updateVisibility);

  return () => {
    unsubscribe();
    loader.remove();
  };
};

const SCROLL_LOAD_THRESHOLD_PX = 80;
const LOAD_MORE_LIMIT = 10;

const setupScrollPagination = (listContainer) => {
  const scrollContainer = listContainer?.closest(".eva-sdk-chatbot-history-body");
  if (!scrollContainer) return () => {};

  const onScroll = () => {
    const { scrollTop, clientHeight, scrollHeight } = scrollContainer;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceFromBottom > SCROLL_LOAD_THRESHOLD_PX) return;

    const { AllHistory } = store.getState()?.global || {};
    const hasMore = Boolean(AllHistory?.hasMore);
    const isLoading = AllHistory?.status === "loading";
    if (!hasMore || isLoading) return;

    LoadMoreHistoryData({ limit: LOAD_MORE_LIMIT });
  };

  scrollContainer.addEventListener("scroll", onScroll, { passive: true });
  return () => scrollContainer.removeEventListener("scroll", onScroll);
};

export const initHistoryList = (listContainer, callbacks = {}) => {
  if (!listContainer) return null;

  const historyInterface = HistoryInterface();
  const unsubscribe = historyInterface.subscribe((allhistoryData) => {
    renderHistoryList(listContainer, allhistoryData, callbacks);
  });

  const removeScrollListener = setupScrollPagination(listContainer);
  const removeLoadingIndicator = setupLoadingIndicator(listContainer);

  const initialHistory = store.getState()?.global?.AllHistory;
  if (initialHistory?.data) {
    renderHistoryList(listContainer, { data: initialHistory.data, hasMore: initialHistory.hasMore }, callbacks);
  }

  return {
    unsubscribe: () => {
      unsubscribe();
      removeScrollListener();
      removeLoadingIndicator();
    },
  };
};
