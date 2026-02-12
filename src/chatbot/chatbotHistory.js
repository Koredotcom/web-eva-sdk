import { HistoryInterface } from "../history";
import { JoinChatThread } from "../chat";
import LoadMoreHistoryData from "../history/LoadMoreHistoryData";
import store from "../redux/store";
import { hideRecentAgentsDiv } from "../LandingPageRecentAgents";
import { segregateHistoryBySections, HISTORY_SECTIONS } from "../utils/helpers";
import { EllipsisHorizontal, createDeleteIcon, EditIcon } from "../templateRenderer/icons-library";


const HISTORY_COMPOSEBAR_ACTIVE_CLASS = "eva-composebar-area--history-selected";

const addHistorySelectedClassToComposebar = (listContainer) => {
  const root = listContainer?.closest?.("#eva-sdk-chatbot-panel") || document;
  const composebarArea = root?.querySelector?.(".eva-composebar-area");
  composebarArea?.classList?.add(HISTORY_COMPOSEBAR_ACTIVE_CLASS);
};

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


const startInlineRename = (listContainer, item, historyInterface) => {
  const li = listContainer.querySelector(`[data-board-id="${item?.id}"]`);
  if (!li) return;
  const row = li.querySelector(".history-item-group-item-row");
  const titleEl = row?.querySelector(".history-item-group-item-title");
  if (!row || !titleEl) return;

  const originalName = item?.name?.trim() || "Untitled";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "eva-sdk-history-item-title-input";
  input.value = originalName;
  input.setAttribute("aria-label", "Rename history item");

  const save = () => {
    const newName = input.value.trim() || originalName;
    input.removeEventListener("blur", onBlur);
    input.removeEventListener("keydown", onKeyDown);
    input.replaceWith(titleEl);
    titleEl.textContent = newName;
    if (newName !== originalName) {
      historyInterface.updateHistoryBoardName({ boardId: item.id, newName });
    }
  };

  const revert = () => {
    input.removeEventListener("blur", onBlur);
    input.removeEventListener("keydown", onKeyDown);
    input.replaceWith(titleEl);
    titleEl.textContent = originalName;
  };

  const onBlur = () => save();
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      revert();
    }
  };

  titleEl.replaceWith(input);
  input.addEventListener("blur", onBlur);
  input.addEventListener("keydown", onKeyDown);
  input.focus();
  input.select();
};

const createHistoryItemDropdown = (item, callbacks = {}) => {
  const { onRename, onDelete } = callbacks;
  const dropdown = document.createElement("sl-dropdown");
  dropdown.classList.add("eva-sdk-history-item-dropdown");
  dropdown.setAttribute("hoist", "");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "eva-sdk-history-item-menu-trigger";
  trigger.setAttribute("aria-label", "More options");
  trigger.setAttribute("slot", "trigger");
  trigger.innerHTML = EllipsisHorizontal({ size: 16, color: "#70707B", className: "eva-sdk-history-item-menu-icon" });

  const menu = document.createElement("sl-menu");
  menu.classList.add("eva-sdk-history-item-menu");
  const renameItem = document.createElement("sl-menu-item");
  renameItem.classList.add("eva-sdk-history-menu-item");
  renameItem.setAttribute("data-action", "rename");
  const renameIcon = document.createElement("span");
  renameIcon.className = "eva-sdk-history-menu-item-icon";
  renameIcon.setAttribute("slot", "prefix");
  renameIcon.innerHTML = EditIcon({ size: 14, color: "#667085", className: "eva-sdk-history-menu-item-svg" });
  renameItem.appendChild(renameIcon);
  renameItem.appendChild(document.createTextNode("Rename"));
  const deleteItem = document.createElement("sl-menu-item");
  deleteItem.classList.add("eva-sdk-history-menu-item", "delete-menu-item", "eva-sdk-history-menu-item--delete");
  deleteItem.setAttribute("data-action", "delete");
  const deleteIcon = document.createElement("span");
  deleteIcon.className = "eva-sdk-history-menu-item-icon";
  deleteIcon.setAttribute("slot", "prefix");
  deleteIcon.innerHTML = createDeleteIcon({ size: 14, color: "#F04438", className: "eva-sdk-history-menu-item-svg" });
  deleteItem.appendChild(deleteIcon);
  deleteItem.appendChild(document.createTextNode("Delete"));
  menu.appendChild(renameItem);
  menu.appendChild(deleteItem);

  dropdown.appendChild(trigger);
  dropdown.appendChild(menu);

  const setActive = (isActive) => {
    const li = dropdown.closest(".history-item-group-item");
    if (!li) return;
    li.classList.toggle("active", Boolean(isActive));
  };

  // Add active state when the menu opens/closes.
  dropdown.addEventListener("sl-show", () => setActive(true));
  dropdown.addEventListener("sl-hide", () => setActive(false));
  // Defensive: ensure active state is removed even if hide lifecycle differs.
  dropdown.addEventListener("sl-after-hide", () => setActive(false));

  renameItem.addEventListener("click", (e) => {
    e.stopPropagation();
    if (typeof dropdown.hide === "function") dropdown.hide();
    onRename?.(item);
  });
  deleteItem.addEventListener("click", (e) => {
    e.stopPropagation();
    if (typeof dropdown.hide === "function") dropdown.hide();
    onDelete?.(item);
  });

  return dropdown;
};

const renderHistoryList = (listContainer, historyData, callbacks = {}) => {
  if (!listContainer) return;
  const boards = historyData?.data || [];
  const { onThreadClick, onItemSelect, onRename, onDelete } = callbacks;

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

      const row = document.createElement("div");
      row.className = "history-item-group-item-row";

      const itemTitle = document.createElement("div");
      itemTitle.className = "history-item-group-item-title";
      itemTitle.textContent = item?.name || "Untitled";
      row.appendChild(itemTitle);

      const dropdown = createHistoryItemDropdown(item, { onRename, onDelete });
      row.appendChild(dropdown);

      li.appendChild(row);
      li.addEventListener("click", async (e) => {
        if (e.target.closest("sl-dropdown") || e.target.closest(".eva-sdk-history-item-title-input")) return;

        if (li.classList.contains("history-item-group-item--loading")) return;
        addHistorySelectedClassToComposebar(listContainer);

        if (onThreadClick) {
          await onThreadClick(item);
          return;
        }

        li.classList.add("history-item-group-item--loading");
        const spinner = document.createElement("span");
        spinner.className = "eva-sdk-history-item-loading-spinner";
        spinner.setAttribute("aria-hidden", "true");
        row.appendChild(spinner);

        try {
          hideRecentAgentsDiv("recent-agents-container");
          await JoinChatThread({ boardId: item?.id });
          onItemSelect?.();
        } finally {
          li.classList.remove("history-item-group-item--loading");
          spinner.remove();
        }
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
  const callbacksWithHistory = {
    ...callbacks,
    onRename: (item) => startInlineRename(listContainer, item, historyInterface),
    onDelete: (item) => historyInterface.deleteHistoryBoard(item),
  };

  const unsubscribe = historyInterface.subscribe((allhistoryData) => {
    renderHistoryList(listContainer, allhistoryData, callbacksWithHistory);
  });

  const removeScrollListener = setupScrollPagination(listContainer);
  const removeLoadingIndicator = setupLoadingIndicator(listContainer);

  const initialHistory = store.getState()?.global?.AllHistory;
  if (initialHistory?.data) {
    renderHistoryList(listContainer, { data: initialHistory.data, hasMore: initialHistory.hasMore }, callbacksWithHistory);
  }

  return {
    unsubscribe: () => {
      unsubscribe();
      removeScrollListener();
      removeLoadingIndicator();
    },
  };
};
