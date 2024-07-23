// store.js
import { configureStore } from '@reduxjs/toolkit';
import globalSlice from './globalSlice';
import logger from './middleware/logger';

// Configure store
const store = configureStore({
    reducer: {
        global: globalSlice.reducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(logger),
});

export default store;
