import { createSlice } from '@reduxjs/toolkit';
import { advanceSearch, fetchAgents, fetchConfigData, fetchProfileData, fetchRecentFiles } from './actions/global.action';
import { handleAsyncActions } from '../utils/handleAsyncActions';

const initialState = { 
  profile: {},
  config: {},
  allAgents: {},
  enabledAgents: null,
  recentAgents: null,
  advanceSearchRes: {},
  questions: {},
  activeBoardId: null,
  recentFiles: {}
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
      handleAsyncActions(builder, fetchRecentFiles, 'recentFiles');
    }
});

// Export actions
export const { 
  updateChatData,
  setActiveBoardId
} = globalSlice.actions;

export default globalSlice