import { createSlice } from '@reduxjs/toolkit';
import { 
  advanceSearch, 
  fetchAgents, 
  fetchConfigData, 
  fetchProfileData, 
  fetchHistory,
  fetchRecentFiles 
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
  history: {},
  AllHistory: {}
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
    },
    extraReducers: (builder) => {
      handleAsyncActions(builder, fetchConfigData, 'config');
      handleAsyncActions(builder, fetchProfileData, 'profile');
      handleAsyncActions(builder, fetchAgents, 'allAgents', (state, action) => {
        let enabledAgents = action.payload.agents.filter(a => !!a?.enabled)
        state.enabledAgents = enabledAgents
        state.recentAgents = action.payload.recents
      });
      handleAsyncActions(builder, advanceSearch, 'advanceSearchRes');
      handleAsyncActions(builder, fetchHistory, 'history', (state, action)=> {
        if(action?.meta?.arg?.onload) {
          state.recentFiles = state.history
          state.AllHistory = state.history
        }
        if(action?.meta?.arg?.loadmore) {
          let allHistory = cloneDeep(state.AllHistory?.data?.boards)         
          allHistory = uniqBy(concat(allHistory, state.history?.data?.boards), 'id')
          state.AllHistory.data.boards = allHistory
          state.AllHistory.status = state.history.status
          state.AllHistory.error = state.history.error
        }
      });
      handleAsyncActions(builder, fetchRecentFiles, 'recentFilesRes', (state, action)=> {
        if(action?.meta?.arg?.onload) {
          state.recentFiles = state.recentFilesRes
          state.AllrecentFiles = state.recentFilesRes
        }
        if(action?.meta?.arg?.loadmore) {
          let allFiles = cloneDeep(state.AllrecentFiles?.data?.files)
          allFiles = concat(allFiles, state.recentFilesRes?.data?.files)
          state.AllrecentFiles.data.files = allFiles
          state.AllrecentFiles.status = state.recentFilesRes.status
          state.AllrecentFiles.error = state.recentFilesRes.error
        }
      });
    }
});

// Export actions
export const { 
  updateChatData,
  setActiveBoardId,
  setCurrentQuestion,
  setRecentFiles,
  setAllHistory,
  setAllRecentFiles
} = globalSlice.actions;

export default globalSlice