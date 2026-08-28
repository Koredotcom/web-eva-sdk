import { createSlice, current } from '@reduxjs/toolkit';
import {
  advanceSearch,
  fetchAgents,
  fetchSchedulers,
  fetchConfigData,
  fetchProfileData,
  fetchHistory,
  searchHistoryConversations,
  fetchRecentFiles,
  getRecentFileDownloadUrl,
  searchSession,
  submitFeedback,
  Feedback_V2Thunk,
  presenceStart,
  getNotification,
  getAllAnnouncements
} from './actions/global.action';
import { handleAsyncActions } from '../utils/handleAsyncActions';
import { cloneDeep, concat, uniqBy } from 'lodash';

/**
 * Merge feedback API response fields into `state.questions` (by `cId` or all rows with `messageId`).
 * The feedback API returns the full message document keyed by `_id` (no `messageId`); we normalize
 * it back to `messageId` so chat-flow consumers (rendering, follow-up dispatches) keep working.
 * @param {object} state - Immer draft global slice state
 * @param {{ cId?: string, messageId?: string }} metaArg - from thunk `meta.arg`
 * @param {object} [updates] - Response body to merge into the question(s)
 */
function mergeFeedbackResponseIntoQuestions(state, metaArg, updates) {
  if (!updates || typeof updates !== 'object') return;
  const { cId, messageId } = metaArg || {};
  const questions = cloneDeep(state.questions);

  const applyMerge = (existing) => {
    const merged = { apiSuccess: true, ...existing, ...updates};
    if(!updates?.hasOwnProperty('userFeedback')){
      delete merged?.userFeedback;
    }
    
    if (!merged.messageId) {
      merged.messageId = existing?.messageId || updates?._id || merged?._id;
    }
    return merged;
  };

  if (cId && questions[cId]) {
    questions[cId] = applyMerge(questions[cId]);
  } else if (messageId) {
    Object.keys(questions).forEach((key) => {
      if (questions[key]?.messageId === messageId) {
        questions[key] = applyMerge(questions[key]);
      }
    });
  }
  state.questions = questions;
  syncActiveThreadPartition(state);
}

/**
 * Mirror the foreground `state.questions` into the partition of the thread
 * currently on screen (`questionsByBoard[activeThreadKey]`). Keeps the live
 * partition in sync so navigating away mid-generation needs no snapshot step.
 */
function syncActiveThreadPartition(state) {
  if (state.activeThreadKey) {
    state.questionsByBoard[state.activeThreadKey] = state.questions;
  }
}

const initialState = {
  profile: {},
  config: {},
  allAgents: {},
  schedulers: {},
  commonAgents: {},
  enabledAgents: null,
  recentAgents: null,
  advanceSearchRes: {},
  questions: {},
  activeBoardId: null,
  recentFilesRes: {},
  recentFiles: {},
  AllrecentFiles: {},
  currentQuestion: {},
  historyRes: {},
  history: {},
  AllHistory: {},
  historySearchRes: {},
  historySearch: {},
  recentFileDownloadUrl: {},
  // searchHistoryRes: {},
  chatHistoryMoreAvailable: false,
  fileTypes: null,
  selectedContext: {},
  maxAllowedFileSize: null,
  enabledCustomTemplates: {},
  GptUploadedFiles: null,
  submitFeedback: {},
  Feedback_V2: {},
  customData: {},
  presenceStart: {},
  chatInterfaceOptions: {},
  botTemplateElementReference: null,
  botSDkInstance: null,
  enableKoreBotSDK: false, // use to enable the bot sdk custom templates
  enableContextByFollowupContext: true, // use to set the context by followup context,
  errorState: [],
  notifications: {},
  bookMarkedChatThreads: [],
  enableDebugging: true,
  quickActions: [],
  announcements: {},
  autoRemoveWebSearchFromContext: false,
  userSelectedLLMModel: null,
  /*
  Multi-thread / background generation state.
  - activeThreadKey: the thread currently on screen — a real boardId, or a
    `#`-prefixed temp key for a boardless new chat (first question's reqId).
  - questionsByBoard: live per-thread partitions `{ [threadKey]: { [qId]: question } }`.
    Only threads with an active/unread generation keep a partition.
  - threadRuntimeState: sidebar indicator source of truth
    `{ [threadKey]: { isGenerating, activeReqIds, hasCompletedInBackground, title, createdOn, lastUpdatedAt } }`.
  */
  activeThreadKey: null,
  questionsByBoard: {},
  threadRuntimeState: {}
};

const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    updateChatData: (state, action) => {
      state.questions = action.payload;
      // Keep the on-screen thread's partition in sync (background threads
      // are written through setBoardQuestions instead).
      syncActiveThreadPartition(state);
    },
    setActiveThreadKey: (state, action) => {
      /*
      Leaving a thread (New Chat → null, or opening a different board) means
      that thread has been "backgrounded". Stamp showInHistory so its optimistic
      history row stays visible even if the user later reopens it — without this
      flag, JoinChatThread would set it active again and the subscribe merge
      would drop it from the list.
      */
      const prevKey = state.activeThreadKey;
      const nextKey = action.payload;
      if (prevKey && prevKey !== nextKey && state.threadRuntimeState[prevKey]) {
        state.threadRuntimeState[prevKey].showInHistory = true;
        state.threadRuntimeState[prevKey].lastUpdatedAt = Date.now();
      }
      state.activeThreadKey = nextKey;
    },
    /* Replace a background thread's whole partition (streaming merges). */
    setBoardQuestions: (state, action) => {
      const { threadKey, questions } = action.payload || {};
      if (!threadKey) return;
      state.questionsByBoard[threadKey] = questions || {};
    },
    /* Temp -> real reconcile: rename partition, runtime entry and active key. */
    migrateThreadKey: (state, action) => {
      const { fromKey, toKey } = action.payload || {};
      if (!fromKey || !toKey || fromKey === toKey) return;
      if (state.questionsByBoard[fromKey]) {
        state.questionsByBoard[toKey] = state.questionsByBoard[fromKey];
        delete state.questionsByBoard[fromKey];
      }
      const fromRuntime = state.threadRuntimeState[fromKey];
      if (fromRuntime) {
        const toRuntime = state.threadRuntimeState[toKey] || {};
        state.threadRuntimeState[toKey] = {
          ...fromRuntime,
          ...toRuntime,
          activeReqIds: { ...(fromRuntime.activeReqIds || {}), ...(toRuntime.activeReqIds || {}) },
          isGenerating: !!(fromRuntime.isGenerating || toRuntime.isGenerating),
          hasCompletedInBackground: !!(fromRuntime.hasCompletedInBackground || toRuntime.hasCompletedInBackground),
          showInHistory: !!(fromRuntime.showInHistory || toRuntime.showInHistory)
        };
        delete state.threadRuntimeState[fromKey];
      }
      if (state.activeThreadKey === fromKey) {
        state.activeThreadKey = toKey;
      }
    },
    markThreadGenerationStart: (state, action) => {
      const { threadKey, reqId, title } = action.payload || {};
      if (!threadKey || !reqId) return;
      const prev = state.threadRuntimeState[threadKey] || {};
      state.threadRuntimeState[threadKey] = {
        ...prev,
        title: prev.title || title,
        createdOn: prev.createdOn || Date.now(),
        activeReqIds: { ...(prev.activeReqIds || {}), [reqId]: true },
        isGenerating: true,
        lastUpdatedAt: Date.now()
      };
    },
    markThreadGenerationSettled: (state, action) => {
      const { threadKey, reqId, background, clearAll } = action.payload || {};
      if (!threadKey) return;
      const prev = state.threadRuntimeState[threadKey];
      if (!prev) return;
      const activeReqIds = { ...(prev.activeReqIds || {}) };
      if (clearAll) {
        Object.keys(activeReqIds).forEach(key => delete activeReqIds[key]);
      } else if (reqId) {
        delete activeReqIds[reqId];
      }
      state.threadRuntimeState[threadKey] = {
        ...prev,
        activeReqIds,
        isGenerating: Object.keys(activeReqIds).length > 0,
        hasCompletedInBackground: !!background || !!prev.hasCompletedInBackground,
        lastUpdatedAt: Date.now()
      };
    },
    /* Clears the red dot (user opened / read the thread). */
    clearThreadCompletionIndicator: (state, action) => {
      const threadKey = action.payload;
      if (!threadKey || !state.threadRuntimeState[threadKey]) return;
      state.threadRuntimeState[threadKey].hasCompletedInBackground = false;
      state.threadRuntimeState[threadKey].lastUpdatedAt = Date.now();
    },
    /* Drop a settled background thread's cached partition (memory hygiene). */
    removeThreadPartition: (state, action) => {
      const threadKey = action.payload;
      if (!threadKey) return;
      delete state.questionsByBoard[threadKey];
    },
    /* Full cleanup: board deleted from history. */
    removeThreadState: (state, action) => {
      const threadKey = action.payload;
      if (!threadKey) return;
      delete state.questionsByBoard[threadKey];
      delete state.threadRuntimeState[threadKey];
    },
    setActiveBoardId: (state, action) => {
      state.activeBoardId = action.payload;
    },
    setCurrentQuestion: (state, action) => {
      state.currentQuestion = action.payload;
    },
    setRecentFiles: (state, action) => {
      state.recentFiles = action.payload;
    },
    setAllRecentFiles: (state, action) => {
      state.AllrecentFiles = action.payload;
    },
    setAllHistory: (state, action) => {
      state.AllHistory = action.payload;
    },
    setHistorySearch: (state, action) => {
      state.historySearch = action.payload;
    },
    setChatHistoryMoreAvailable: (state, action) => {
      state.chatHistoryMoreAvailable = action.payload;
    },
    setSelectedContext: (state, action) => {
      state.selectedContext = action.payload;
    },
    setEnabledCustomTemplates: (state, action) => {
      state.enabledCustomTemplates = action.payload;
    },
    setGptUploadedFiles: (state, action) => {
      state.GptUploadedFiles = action.payload;
    },
    setCustomData: (state, action) => {
      state.customData = action.payload
    },
    setChatInterfaceOptions: (state, action) => {
      state.chatInterfaceOptions = action.payload;
    },
    setBotSDKInstance: (state, action) => {
      state.botSDkInstance = action.payload
    },
    setEnableKoreBotSDK: (state, action) => {
      state.enableKoreBotSDK = action.payload
    },
    setEnableContextByFollowupContext: (state, action) => {
      state.enableContextByFollowupContext = action.payload
    },
    // deleteHistoryItem : (state, action) =>{
    //   state.AllHistory = action.payload
    // },
    // updateHistoryItem : (state, action) => {
    //   state.AllHistory = action.payload
    // }
    setErrorState: (state, action) => {
      state.errorState = action.payload
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload
    },
    setBookMarkedChatThreads: (state, action) => {
      state.bookMarkedChatThreads = action.payload
    },
    setEnabledDebugging: (state, action) => {
      state.enableDebugging = action.payload
    },
    setQuickActions: (state, action) => {
      state.quickActions = action.payload;
    },
    setAnnouncements: (state , action) =>{
       state.announcements = action.payload;
    },
    setAutoRemoveWebSearchFromContext: (state, action) => {
      state.autoRemoveWebSearchFromContext = action.payload;
    },
    setSchedulers: (state, action) => {
      state.schedulers = action.payload
    },
    setUserSelectedLLMModel: (state, action) => {
      state.userSelectedLLMModel = action.payload
    },
    setAdvanceSearchRes: (state, action) => {
      state.advanceSearchRes = action.payload
    }
  },
  extraReducers: (builder) => {
    handleAsyncActions(builder, fetchConfigData, 'config', (state, action) => {
      state.fileTypes = action.payload.fileTypes
      state.maxAllowedFileSize = action.payload.maxKnowledgeFileSize
    });
    handleAsyncActions(builder, fetchProfileData, 'profile');
    handleAsyncActions(builder, fetchAgents, 'allAgents', (state, action) => {
      let enabledAgents = action.payload.agents.filter(a => !!a?.enabled)
      state.enabledAgents = enabledAgents
      state.recentAgents = action.payload.recents
      state.commonAgents = action.payload.commonAgents
    });
    handleAsyncActions(builder, fetchSchedulers, 'schedulers');
    handleAsyncActions(builder, advanceSearch, 'advanceSearchRes', (state, action) => {
      /*
      update the botConversation of the conversation
      */
      if (action?.meta?.arg?.params?.from === "botAgent") {
        let botReqId = action?.meta?.arg?.params?.reqId
        let questions = cloneDeep(state?.questions)
        const currentBotAgentQuestion = Object.values(questions).find((ques) => ques.reqId === botReqId)
        if (currentBotAgentQuestion) {
          /*for history question we need to rely on id */
          if (currentBotAgentQuestion?.historicalData) {
            if (questions?.[currentBotAgentQuestion?.id]?.hasOwnProperty('botConversation')) {
              questions[currentBotAgentQuestion?.id].botConversation[action?.payload?.messageId] = {
                ...questions[currentBotAgentQuestion?.id].botConversation[action?.payload?.messageId],
                "status": action?.payload?.status,
                "answer": action?.payload?.answer
              }
            }
          } else {
            if (questions?.[currentBotAgentQuestion?.reqId]?.hasOwnProperty('botConversation')) {
              questions[currentBotAgentQuestion?.reqId].botConversation[action?.payload?.messageId] = {
                ...questions[currentBotAgentQuestion?.reqId].botConversation[action?.payload?.messageId],
                "status": action?.payload?.status,
                "answer": action?.payload?.answer
              }
            }
          }
          state.questions = questions
          syncActiveThreadPartition(state)
        }

      }
      if (state.enableDebugging) {
        console.log("advanceSearch fulfilled, action type:", action.type);
      }
    });
    handleAsyncActions(builder, fetchHistory, 'historyRes', (state, action) => {
      const response = action.payload || {};
      const incomingBoards = response.data?.boards || response?.boards || [];

      if (action?.meta?.arg?.onload) {
        state.history = state.historyRes
        // state.AllHistory = state.historyRes
      }

      /*
       * This reducer receives an Immer draft. Take a plain snapshot before
       * pagination; lodash.cloneDeep on the draft array can violate the
       * Proxy prototype invariant in client applications.
       */
      const existingBoards = state.AllHistory?.data
        ? current(state.AllHistory.data)
        : [];
      const allHistory = action?.meta?.arg?.initialData
        ? incomingBoards
        : uniqBy([...existingBoards, ...incomingBoards], 'id');

      state.AllHistory.data = allHistory.map(item => ({
        ...item,
        bookMarked: item?.pinnedAt > 0,
      }));
      state.AllHistory.status = state.historyRes.status
      state.AllHistory.error = state.historyRes.error
      state.AllHistory.hasMore = response?.moreAvailable
    });
    handleAsyncActions(builder, searchHistoryConversations, 'historySearchRes', (state, action) => {
      /*accumulating searched results the same way AllHistory does for pagination calls
      (pagination is pageToken based — a pageToken on the request means "append")*/
      const isPagination = !!action?.meta?.arg?.pageToken
      let searchedResults = cloneDeep(state.historySearch?.data?.results) || []
      if (isPagination) {
        searchedResults = uniqBy(concat(searchedResults, action.payload?.results || []), 'id')
      } else {
        searchedResults = action.payload?.results || []
      }
      state.historySearch = {
        status: state.historySearchRes.status,
        error: state.historySearchRes.error,
        searchTerm: action?.meta?.arg?.query,
        data: {
          results: searchedResults,
          total: action.payload?.total ?? searchedResults.length,
          pageToken: action.payload?.pageToken || null,
          moreAvailable: !!(action.payload?.moreAvailable || action.payload?.pageToken)
        }
      }
    });
    handleAsyncActions(builder, fetchRecentFiles, 'recentFilesRes', (state, action) => {
      const response = action.payload || {};
      const incomingFiles = response?.files || [];

      if (action?.meta?.arg?.onload) {
        state.recentFiles = {
          ...state.recentFilesRes,
          data: { ...response, files: [...incomingFiles] },
        };
        state.AllrecentFiles = {
          ...state.recentFilesRes,
          data: { ...response, files: [...incomingFiles] },
        };
      }
      if (action?.meta?.arg?.loadmore) {
        /* Use a plain snapshot instead of cloning an Immer draft array. */
        const existingFiles = state.AllrecentFiles?.data?.files
          ? current(state.AllrecentFiles.data.files)
          : [];
        state.AllrecentFiles.data.files = uniqBy(
          [...existingFiles, ...incomingFiles],
          'id'
        );
        state.AllrecentFiles.data.moreAvailable =
          response.moreAvailable ?? response?.moreAvailable;
        state.AllrecentFiles.status = state?.recentFilesRes?.status
        state.AllrecentFiles.error = response?.error
      }
    });
    handleAsyncActions(builder, searchSession, 'selectedContext')
    handleAsyncActions(builder, getRecentFileDownloadUrl, 'recentFileDownloadUrl');
    handleAsyncActions(builder, submitFeedback, 'submitFeedback', (state, action) => {
      mergeFeedbackResponseIntoQuestions(
        state,
        action.meta.arg,
        action.payload?.data,
      );
    });
    handleAsyncActions(builder, Feedback_V2Thunk, 'Feedback_V2', (state, action) => {
      mergeFeedbackResponseIntoQuestions(state, action.meta.arg, action.payload);
    });
    handleAsyncActions(builder, presenceStart, 'presenceStart');
    // handleAsyncActions(builder, getAllAnnouncements, 'announcements', (state, action) => {
    //   state.announcements = action.payload
    // });
  }
});

// Export actions
export const {
  updateChatData,
  setActiveBoardId,
  setCurrentQuestion,
  setRecentFiles,
  setAllHistory,
  setHistorySearch,
  setAllRecentFiles,
  // deleteHistoryItem,
  // updateHistoryItem,
  setChatHistoryMoreAvailable,
  setSelectedContext,
  setEnabledCustomTemplates,
  setGptUploadedFiles,
  setCustomData,
  setChatInterfaceOptions,
  setBotSDKInstance,
  setEnableKoreBotSDK,
  setEnableContextByFollowupContext,
  setErrorState,
  setNotifications,
  setBookMarkedChatThreads,
  setEnabledDebugging,
  setQuickActions,
  setAnnouncements,
  setAutoRemoveWebSearchFromContext,
  setSchedulers,
  setUserSelectedLLMModel,
  setAdvanceSearchRes,
  setActiveThreadKey,
  setBoardQuestions,
  migrateThreadKey,
  markThreadGenerationStart,
  markThreadGenerationSettled,
  clearThreadCompletionIndicator,
  removeThreadPartition,
  removeThreadState
} = globalSlice.actions;

export default globalSlice;
