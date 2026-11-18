import store from "../redux/store";

const STORAGE_PREFIX = "eva-chat-sdk:chat-recovery";

const getStorageKeys = () => {
  const config = typeof window !== "undefined" ? window.sdkConfig : null;
  const apiUrl = encodeURIComponent(config?.api_url || "unknown-api");
  const userId = encodeURIComponent(config?.userId || "unknown-user");
  const namespace = `${STORAGE_PREFIX}:${apiUrl}:${userId}`;
  return {
    activeBoardId: `${namespace}:active-board-id`,
    streamAnswers: `${namespace}:stream-answers`,
  };
};

const getSessionStorage = () => {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

const normalizeSnapshots = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const snapshots = {};
  Object.entries(value).forEach(([reqId, entry]) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;

    const snapshot = {};
    if (typeof entry.answer === "string") snapshot.answer = entry.answer;
    if (Array.isArray(entry.thoughts)) snapshot.thoughts = entry.thoughts;
    if (typeof entry.thoughtViewType === "string") snapshot.thoughtViewType = entry.thoughtViewType;

    if (entry.botConversation && typeof entry.botConversation === "object" && !Array.isArray(entry.botConversation)) {
      snapshot.botConversation = {};
      Object.entries(entry.botConversation).forEach(([outputId, conversation]) => {
        if (!conversation || typeof conversation !== "object" || !Array.isArray(conversation.thoughts)) return;
        snapshot.botConversation[outputId] = {
          thoughts: conversation.thoughts,
          ...(typeof conversation.templateType === "string" ? { templateType: conversation.templateType } : {}),
        };
      });
      if (Object.keys(snapshot.botConversation).length === 0) delete snapshot.botConversation;
    }

    if (Object.keys(snapshot).length > 0) snapshots[reqId] = snapshot;
  });
  return snapshots;
};

export const getSavedChatBoardId = () => {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    return storage.getItem(getStorageKeys().activeBoardId);
  } catch {
    return null;
  }
};

export const saveActiveChatBoardId = (boardId) => {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    const key = getStorageKeys().activeBoardId;
    if (boardId) storage.setItem(key, boardId);
    else storage.removeItem(key);
  } catch (error) {
    if (store.getState().global?.enableDebugging) {
      console.warn("Failed to persist active chat board ID", error);
    }
  }
};

export const readChatStreamSnapshots = () => {
  const storage = getSessionStorage();
  if (!storage) return {};
  try {
    const key = getStorageKeys().streamAnswers;
    return normalizeSnapshots(JSON.parse(storage.getItem(key) || "{}"));
  } catch {
    return {};
  }
};

const writeChatAnswerSnapshots = (snapshots) => {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(getStorageKeys().streamAnswers, JSON.stringify(snapshots));
  } catch (error) {
    if (store.getState().global?.enableDebugging) {
      console.warn("Failed to cache in-progress chat state", error);
    }
  }
};

export const persistChatStreamSnapshots = (questions) => {
  const snapshots = readChatStreamSnapshots();
  let changed = false;

  Object.entries(questions || {}).forEach(([questionKey, question]) => {
    const reqId = question?.reqId || questionKey;
    if (!reqId) return;

    if (question?.status === "completed") {
      if (snapshots[reqId] !== undefined) {
        delete snapshots[reqId];
        changed = true;
      }
      return;
    }

    const isInProgress = question?.status === "in-progress"
      || question?.streamingStatus === "in-progress";
    if (!isInProgress) return;

    const snapshot = { ...(snapshots[reqId] || {}) };
    let snapshotChanged = false;

    if (typeof question?.answer === "string" && question.answer.length > 0
      && snapshot.answer !== question.answer) {
      snapshot.answer = question.answer;
      snapshotChanged = true;
    }

    if (Array.isArray(question?.thoughts) && question.thoughts.length > 0
      && JSON.stringify(snapshot.thoughts) !== JSON.stringify(question.thoughts)) {
      snapshot.thoughts = question.thoughts;
      snapshotChanged = true;
    }
    if (Array.isArray(question?.thoughts) && question.thoughts.length > 0
      && typeof question?.thoughtViewType === "string"
      && snapshot.thoughtViewType !== question.thoughtViewType) {
      snapshot.thoughtViewType = question.thoughtViewType;
      snapshotChanged = true;
    }

    const nestedThoughts = {};
    Object.entries(question?.botConversation || {}).forEach(([outputId, conversation]) => {
      if (!Array.isArray(conversation?.thoughts) || conversation.thoughts.length === 0) return;
      nestedThoughts[outputId] = {
        thoughts: conversation.thoughts,
        ...(typeof conversation.templateType === "string" ? { templateType: conversation.templateType } : {}),
      };
    });
    if (Object.keys(nestedThoughts).length > 0
      && JSON.stringify(snapshot.botConversation) !== JSON.stringify(nestedThoughts)) {
      snapshot.botConversation = nestedThoughts;
      snapshotChanged = true;
    }

    if (snapshotChanged) {
      snapshots[reqId] = snapshot;
      changed = true;
    }
  });

  if (changed) writeChatAnswerSnapshots(snapshots);
};

let persistenceUnsubscribe = null;
let persistenceNamespace = null;

export const initializeChatRecoveryPersistence = () => {
  const keys = getStorageKeys();
  const namespace = `${keys.activeBoardId}|${keys.streamAnswers}`;
  if (persistenceUnsubscribe && persistenceNamespace === namespace) return;

  persistenceUnsubscribe?.();
  persistenceNamespace = namespace;

  const initialState = store.getState().global;
  let previousBoardId = initialState.activeBoardId;
  let previousQuestions = initialState.questions;

  persistenceUnsubscribe = store.subscribe(() => {
    const globalState = store.getState().global;
    if (globalState.activeBoardId !== previousBoardId) {
      previousBoardId = globalState.activeBoardId;
      saveActiveChatBoardId(previousBoardId);
    }

    if (globalState.questions !== previousQuestions) {
      previousQuestions = globalState.questions;
      persistChatStreamSnapshots(globalState.questions);
    }
  });
};
