// utils/handleAsyncActions.js
export const handleAsyncActions = (builder, asyncThunk, stateKey) => {
    builder
        .addCase(asyncThunk.pending, (state) => {
            state[stateKey].status = 'loading';
        })
        .addCase(asyncThunk.fulfilled, (state, action) => {
            state[stateKey].status = 'success';
            state[stateKey].error = null;
            state[stateKey].data = action.payload;
        })
        .addCase(asyncThunk.rejected, (state, action) => {
            state[stateKey].status = 'failed';
            state[stateKey].error = action.payload;
        });
};
