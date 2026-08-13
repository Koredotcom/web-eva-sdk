const logger = storeAPI => next => action => {
    const enableDebugging = storeAPI.getState()?.global?.enableDebugging;
    if (enableDebugging) {
        /* store subscribers are not handed the action, so stash the type for them to attribute triggers
        (paired with the commented-out reportSubscriberTrigger diagnostic in ChatInterface.js) */
        // globalThis.__evaLastAction = action?.type;
        console.log('Dispatching action:', action);
    }
    const result = next(action);
    if (enableDebugging) {
        console.log('Next state:', storeAPI.getState()?.global || {});
    }
    return result;
};

export default logger;
