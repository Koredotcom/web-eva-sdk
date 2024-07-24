import { createSlice } from '@reduxjs/toolkit';
import { fetchConfigData, fetchProfileData } from './actions/global.action';
import { handleAsyncActions } from '../utils/handleAsyncActions';

const initialState = { 
  profile: {},
  config: {},
  count: 5,
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
    }
});

// Export actions
export const { increment, decrement } = globalSlice.actions;

export default globalSlice