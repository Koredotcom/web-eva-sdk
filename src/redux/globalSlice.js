import { createSlice } from '@reduxjs/toolkit';
import { 
  advanceSearch, 
  fetchAgents, 
  fetchConfigData, 
  fetchProfileData, 
  fetchRecentFiles 
} from './actions/global.action';
import { handleAsyncActions } from '../utils/handleAsyncActions';
import { cloneDeep, concat } from 'lodash';

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
  currentQuestion: {}
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
  setAllRecentFiles
} = globalSlice.actions;

export default globalSlice