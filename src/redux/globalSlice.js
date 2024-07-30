import { createSlice } from '@reduxjs/toolkit';
import { advanceSearch, fetchAgents, fetchConfigData, fetchProfileData } from './actions/global.action';
import { handleAsyncActions } from '../utils/handleAsyncActions';

const initialState = { 
  profile: {},
  config: {},
  userAgents: {},
  enabledUserAgents: null,
  enabledRecentUserAgents: null,
  count: 5,
  advanceSearch: {}
};

const globalSlice = createSlice({
    name: 'global',
    initialState,
    reducers: {
      increment: (state, action) => {
        state.count += 1;
      },
      decrement: (state) => {
        state.count -= 1;
      },
    },
    extraReducers: (builder) => {
      handleAsyncActions(builder, fetchConfigData, 'config');
      handleAsyncActions(builder, fetchProfileData, 'profile');
      handleAsyncActions(builder, fetchAgents, 'userAgents', (state, action) => {
        let enabledUserAgents = action.payload.agents.filter(a => !!a?.enabled)
        state.enabledUserAgents = enabledUserAgents
        state.enabledRecentUserAgents = action.payload.recents
      });
      handleAsyncActions(builder, advanceSearch, 'advanceSearch');
    }
});

// Export actions
export const { increment, decrement } = globalSlice.actions;

export default globalSlice