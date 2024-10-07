import { createSlice } from '@reduxjs/toolkit';
import { 
  advanceSearch, 
  fetchAgents, 
  fetchConfigData, 
  fetchProfileData, 
  fetchHistory,
  fetchRecentFiles, 
  getRecentFileDownloadUrl,
  searchSession
} from './actions/global.action';
import { handleAsyncActions } from '../utils/handleAsyncActions';
import { cloneDeep, concat, uniqBy } from 'lodash';

const initialState = { 
  profile: {},
  config: {},
  allAgents: {},
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
  recentFileDownloadUrl: {},
  // searchHistoryRes: {},
  chatHistoryMoreAvailable: false,
  fileTypes : null,
  selectedContext : {},
  maxAllowedFileSize : null
};

const globalSlice = createSlice({
    name: 'global',
    initialState,
    reducers: {
      updateChatData: (state, action) => {
        state.questions = action.payload;
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
      setChatHistoryMoreAvailable: (state, action) => {
        state.chatHistoryMoreAvailable = action.payload;
      },
      setSelectedContext : (state, action) => {
        state.selectedContext = action.payload;
      }
      // deleteHistoryItem : (state, action) =>{
      //   state.AllHistory = action.payload
      // },
      // updateHistoryItem : (state, action) => {
      //   state.AllHistory = action.payload
      // }
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
      });
      handleAsyncActions(builder, advanceSearch, 'advanceSearchRes');
      handleAsyncActions(builder, fetchHistory, 'historyRes', (state, action)=> {
        if(action?.meta?.arg?.onload) {
          state.history = state.historyRes
          // state.AllHistory = state.historyRes
        }
        // if(action?.meta?.arg?.loadmore) {
          let allHistory = cloneDeep(state.AllHistory?.data) || []     
          if(action?.meta?.arg?.initialData) {
            allHistory = state.historyRes?.data?.boards
          } else {
            allHistory = uniqBy(concat(allHistory, state.historyRes?.data?.boards), 'id')
          }
          state.AllHistory.data = allHistory
          state.AllHistory.status = state.historyRes.status
          state.AllHistory.error = state.historyRes.error
          state.AllHistory.hasMore = state.historyRes?.data?.moreAvailable
        // }
      });
      handleAsyncActions(builder, fetchRecentFiles, 'recentFilesRes', (state, action)=> {
        if(action?.meta?.arg?.onload) {
          state.recentFiles = state.recentFilesRes
          state.AllrecentFiles = state.recentFilesRes
        }
        if(action?.meta?.arg?.loadmore) {
          let AllrecentFiles = cloneDeep(state.AllrecentFiles?.data?.files)
          AllrecentFiles = uniqBy(concat(AllrecentFiles, state.recentFilesRes?.data?.files), 'id')
          state.AllrecentFiles.data.files = AllrecentFiles
          state.AllrecentFiles.status = state.recentFilesRes.status
          state.AllrecentFiles.error = state.recentFilesRes.error
        }
      });
      handleAsyncActions(builder, searchSession, 'selectedContext')
      handleAsyncActions(builder, getRecentFileDownloadUrl, 'recentFileDownloadUrl');
      // handleAsyncActions(builder, getSearchHistory, 'searchHistoryRes', (state, action)=> {
      //   if(action?.meta?.arg?.onload) {
      //     state.recentFiles = state.recentFilesRes
      //     state.AllrecentFiles = state.recentFilesRes
      //   }
      //   if(action?.meta?.arg?.loadmore) {
      //     let AllrecentFiles = cloneDeep(state.AllrecentFiles?.data?.files)
      //     AllrecentFiles = uniqBy(concat(AllrecentFiles, state.recentFilesRes?.data?.files), 'id')
      //     state.AllrecentFiles.data.files = AllrecentFiles
      //     state.AllrecentFiles.status = state.recentFilesRes.status
      //     state.AllrecentFiles.error = state.recentFilesRes.error
      //   }
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
  setAllRecentFiles,
  // deleteHistoryItem,
  // updateHistoryItem,
  setChatHistoryMoreAvailable,
  setSelectedContext
} = globalSlice.actions;

export default globalSlice