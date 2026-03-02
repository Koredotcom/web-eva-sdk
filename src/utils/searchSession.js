import { cloneDeep, isEmpty } from 'lodash';
import { searchSession } from '../redux/actions/global.action';
import { setSelectedContext } from '../redux/globalSlice.js';
import store from '../redux/store';

/**
 * sessionItemHandler - Handles adding/removing items from search session context
 * Adapted for SDK structure where selectedContext has a .data property
 */
export const sessionItemHandler = async (args) => {
    const {
        dispatch,
        item,
        discardPrevSession,
        type,
        appContext // This contains userId, selectedContext (from Redux)
    } = args;

    const { userId, selectedContext } = appContext;

    // Use .data if available, otherwise fallback to root (for initial state)
    let _selectedContextData = cloneDeep(selectedContext?.data || selectedContext) || {};
    let action = "", payload;

    // Check if item is already in context
    let _selectedItem = _selectedContextData?.sources?.find(c => (c?.docId === item?.docId || c?.docId === item?.contentId));

    if (_selectedItem && !discardPrevSession) {
        // Remove item logic
        action = "remove";
        payload = [item];
    } else {
        // Add item logic
        let addedItem = { ...item, loading: true };

        if (type === 'accountKnowledge') {
            addedItem.sourceFrom = type;
            _selectedContextData.type = 'accountKnowledge';
        }

        if (!_selectedContextData?.sources || discardPrevSession) {
            _selectedContextData.sources = [];
        }

        _selectedContextData.sources.push(addedItem);

        if (type === 'agent') {
            _selectedContextData.type = 'agent';
        }

        if (_selectedContextData?.sources?.length === 1 || discardPrevSession) {
            action = "add";
            payload = _selectedContextData.sources;
        } else {
            action = "update";
            payload = [addedItem];
        }
    }

    // Update state locally first for UI responsiveness (mimicking handleAsyncActions structure)
    dispatch(setSelectedContext({
        ...selectedContext,
        data: _selectedContextData,
        status: 'success'
    }));

    // Call API
    await setContext(args, { payload, action, type });
};

/**
 * setContext - Calls searchSession API and updates context
 */
export const setContext = async (args, contextParams) => {
    const { dispatch, appContext, item } = args;
    const { selectedContext } = appContext;
    const userId = appContext.userId || window.sdkConfig?.userId;
    const { payload, action, type } = contextParams;

    let formattedPayload = payload.map(p => {
        let obj = {};
        let docId = p?.docId || p?.contentId;

        // Use item's original source if available (e.g., 'attachment')
        const source = p?.source || p?.sourceType || p?.type || type;

        if (source === 'accountKnowledge') {
            // Match Kora-React overrideSource structure for knowledge results
            let overrideSource = {
                docId: p?.contentId || p?.docId,
                title: p?.title || p?.file_title,
                canSetAsSourceContext: true,
                ext: p?.ext || p?.type || p?.sys_content_type,
                source: source,
                type: "knowledge",
                extIcon: p?.extIcon,
                redirectUrl: {
                    dweb: p?.url || p?.redirectUrl?.dweb
                }
            };
            return { ...obj, docId, source, overrideSource };
        } else {
            // For other types like 'attachment' or 'drive'
            return {
                ...obj,
                docId,
                source: source,
                agentType: p?.agentType || null
            };
        }
    });

    const params = {
        action: action,
        sessionId: selectedContext?.data?.sessionId,
        docId: formattedPayload[0]?.docId
    };

    const apiPayload = {};
    if (action === "add") {
        apiPayload.sources = formattedPayload;
    } else if (action === "update") {
        apiPayload.addSources = formattedPayload;
    } else if (action === "remove") {
        // For remove, some APIs expect removeSources in payload
        apiPayload.removeSources = formattedPayload.map(obj => obj.docId);
    }

    try {
        await dispatch(searchSession({
            userId,
            params,
            payload: apiPayload
        }));
    } catch (error) {
        console.error("Failed to set context:", error);
    }
};
