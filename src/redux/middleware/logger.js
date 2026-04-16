const logger = storeAPI => next => action => {
    const enableDebugging = storeAPI.getState()?.global?.enableDebugging;
    if (enableDebugging) {
        console.log('Dispatching action:', action.type);
    }
    const result = next(action);
    if (enableDebugging) {
        console.log('Next state keys:', Object.keys(storeAPI.getState()?.global || {}));
    }
    return result;
};

export default logger;
