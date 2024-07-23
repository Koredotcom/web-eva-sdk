import { createSlice } from '@reduxjs/toolkit';
const globalSlice = createSlice({
    name: 'global',
    initialState: { 
        profile: {},
        config: {},
        count: 5
    },
    reducers: {
      getProfileData: (state, action) => {
        state.profile = action.payload;
      },
      getConfigData: (state, action) => {
        state.config = action.payload;
      },
      increment: (state, action) => {
        state.count += 1;
      },
      decrement: (state) => {
        state.count -= 1;
      },
    },
});

// Export actions
export const { getConfigData, getProfileData, increment, decrement } = globalSlice.actions;

export default globalSlice