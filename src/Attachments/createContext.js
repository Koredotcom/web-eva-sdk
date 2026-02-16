import { cloneDeep, isEmpty } from "lodash";
import store from "../redux/store";
import { searchSession } from "../redux/actions/global.action";
import { setQuickActions, setSelectedContext } from "../redux/globalSlice";

export const removeItemfromSources = ({ state, item }) => {
    const { selectedContext } = state;
    let _selectedContext = cloneDeep(selectedContext?.data) || {};
    if (item?.source === "attachment") {
        _selectedContext.sources = _selectedContext?.sources?.filter(f => f?.mediaName !== item?.mediaName);
    } else {
        _selectedContext.sources = _selectedContext?.sources?.filter(f => f?.docId !== item?.docId);
    }
    let selectedContextData = {};
    selectedContextData.data = {};
    selectedContextData.data.sources = _selectedContext.sources
    selectedContextData.data.sessionId = selectedContext?.data?.sessionId
    selectedContextData.data.quickactions = selectedContext?.data?.quickactions
    store.dispatch(setSelectedContext(selectedContextData))
}

export const sessionRemoveItem = (state, item) => {
    const { selectedContext } = state;
    let _selectedContext = cloneDeep(selectedContext?.data) || {};
    _selectedContext.sources = _selectedContext?.sources?.map(f => {
        if (f?.docId === item?.docId) {
            f.removeInProgress = true
        }
        return f;
    });

    setContext(state, { payload: [item], action: 'remove' }, () => { });
}

export const sessionItemHandler = (args) => {
    const {
        messageId,
        boardId, // both will conly come when try to set context from 3dot menu (ask followup) option
        // state,
        item,
        discardPrevSession, // always create new session
        duplicateErr, // select,deselect functionality will be disabled if its true, instead showing error toast msg
        removingSource, // it will be true while removing any source chip from composebar
        viewType, // it will contain the question type whether its knowledge or data
        override, // it will be true only when comes from overridemsgmodal
        invokeAgent,
        type,
        invokeFrom
    } = args;

    const state = store.getState().global;
    const { selectedContext } = state

    if (selectedContext?.status === 'loading') {
        let selectedContextData = selectedContext
        selectedContextData.data.error = {
            error: true,
            message: 'Please wait, uploading is in progress'
        };

        store.dispatch(setSelectedContext(selectedContextData));

        setTimeout(() => {
            selectedContextData.data.error = {};
            store.dispatch(setSelectedContext(selectedContextData));
        }, 3000);
        return;
    }

    let _selectedContext = cloneDeep(selectedContext?.data) || {};
    let action = "", payload;
    let _selectedItem = _selectedContext?.sources?.find(c => c?.docId === item?.docId);
    let removedItem = {}, addedItem = {};
    let subsheet = item?.selectedSubSheet; // this will only available if creating sesion on subsheet item

    if ((selectedContext?.viewType === "table" || viewType === "table") && !override && item?.sources?.[0]?.ext !== "xlsx") {
        // in case of adding and removing of table source as context it will come in this condition
        if (!selectedContext) {
            // if adding table source chip
            store.dispatch(setSelectedContext(item))
        }
        else if (removingSource) {
            // if removing table source chip
            store.dispatch(setSelectedContext(item))
            // Need to Implement Override Message Modal
        }
        else {
            // if combination not supported
            // Need to Execute Override MSG Modal 

        }
        return;
    }
    else if (viewType === "table" && override) {
        // if previous session items was not table and overriding exiting session with table source
        store.dispatch(setSelectedContext(item))
        // Need to Implement Override Message Modal 
        return;
    }

    if (subsheet) {
        // if creating session on subsheet item only than it will come inside this condition
        let obj = { ...item, loading: true, selectedSheetId: subsheet?.id }
        if (!_selectedContext?.sources) {
            // means no session created yet
            _selectedContext.sources = []
            _selectedContext?.sources?.push(obj);
            action = "add"
        } else {
            if (_selectedItem) {
                _selectedContext.sources = _selectedContext?.sources?.map(f => {
                    if (f?.docId === item?.docId) {
                        return obj
                    }
                    return f;
                });
            } else {
                _selectedContext?.sources?.push(obj);
            }
            action = "update"
        }
        payload = [obj];
        let selectedContextData = {};
        selectedContextData.data = {};
        selectedContextData.data.sources = _selectedContext.sources
        selectedContextData.data.sessionId = selectedContext?.data?.sessionId
        selectedContextData.data.quickactions = selectedContext?.data?.quickactions
        store.dispatch(setSelectedContext(selectedContextData))
        setContext(state, { payload, action, subsheet: true, params: args }, () => { }, type);
        return;
    }

    if (invokeAgent) {
        // comes here only if invoking agent from suggestion modal or composebar agent dropdown
        let selectedContextData = {};
        selectedContextData.data = {};
        // selectedContextData.data.sessionId = selectedContext?.data?.sessionId
        // selectedContextData.data.quickactions = selectedContext?.data?.quickactions
        selectedContextData.data.sources = [{ ...item, type: item?.type || type }];
        if (type) {
            selectedContextData.data.type = type;
        }
        store.dispatch(setSelectedContext(selectedContextData))
        return;
    }

    if (_selectedItem && !discardPrevSession) {
        if (duplicateErr) {
            let selectedContextData = cloneDeep(selectedContext)
            // setTimeout(() => {
            //     selectedContextData.data.error = null;
            //     store.dispatch(setSelectedContext(selectedContextData))
            // }, 3000);
            selectedContextData.data.error = {
                error: true,
                message: 'Source is Already Added'
            }
            store.dispatch(setSelectedContext(selectedContextData))
            return;
        }
        // if removing any item from context, it should always come inside this condition
        removedItem = _selectedContext?.sources?.filter(f => f?.docId === item?.docId);
        _selectedContext.sources = _selectedContext?.sources?.map(f => {
            if (f?.docId === item?.docId) {
                f.removeInProgress = true
            }
            return f;
        });

        action = "remove"
        payload = removedItem;

    } else {
        // if adding or updating any item in context, it should always come inside this condition
        addedItem = { ...item, loading: true }
        if (item?.source === 'attachment') {
            addedItem.type = 'attachment'
        }
        if (type === 'accountKnowledge') {
            addedItem.sourceFrom = type
        }
        if (!_selectedContext?.sources || discardPrevSession) {
            _selectedContext.sources = []
        }
        _selectedContext?.sources?.push(addedItem);

        if ((_selectedContext?.sources?.length === 1 && isEmpty(selectedContext)) || discardPrevSession) {
            // isAgent - it will come here because previously setted context was agent and now it should replace with new agent 
            action = "add"
            payload = _selectedContext?.sources;
            if (!payload[0].hasOwnProperty('ext')) {
                payload[0].ext = addedItem?.sources?.[0]?.ext
            }
            if (!payload[0].hasOwnProperty('docId')) {
                payload[0].docId = addedItem?.sources?.[0]?.docId
            }
        }
        else if (_selectedContext?.sources?.length > selectedContext?.data?.sources?.length) {
            // If sessionId is undefined, use "add" action instead of "update"
            // This matches Kora-React behavior where undefined sessionId means create new session
            if (!selectedContext?.data?.sessionId) {
                action = "add"
                payload = _selectedContext?.sources;
            } else {
                action = "update"
                payload = [addedItem];
            }
        }
    }

    if (invokeFrom === "gptAgent") {
        _selectedContext.setViaGptAgent = true;
        args.setViaGptAgent = true;
    }

    // Set setViaMenuOptions if setting context via menu options (similar to Kora-React)
    if (args?.setViaMenuOptions) {
        _selectedContext.setViaMenuOptions = true;
    }

    // Dispatch loading state to store so UI shows loader
    // store.dispatch(setSelectedContext({selectedContext: _selectedContext}));
    const selectedContextData = {};
    selectedContextData.data = {};
    selectedContextData.data.sources = _selectedContext.sources;
    selectedContextData.data.sessionId = selectedContext?.data?.sessionId;
    selectedContextData.data.quickactions = selectedContext?.data?.quickactions;
    // Include messageId, setViaMenuOptions, and setViaGptAgent in selectedContext data
    if (_selectedContext.messageId || args?.messageId) {
        selectedContextData.data.messageId = _selectedContext.messageId || args?.messageId;
    }
    if (_selectedContext.setViaMenuOptions) {
        selectedContextData.data.setViaMenuOptions = _selectedContext.setViaMenuOptions;
    }
    if (_selectedContext.setViaGptAgent) {
        selectedContextData.data.setViaGptAgent = _selectedContext.setViaGptAgent;
    }
    store.dispatch(setSelectedContext(selectedContextData));

    setContext(state, { payload, action, params: args, messageId, boardId }, () => { }, type);
};

export const attachmentSessionHanlder = (args) => {
    const state = store.getState().global;
    const { attachments, action } = args;
    const { selectedContext } = state
    if (selectedContext.status === 'loading') {
        let selectedContextData = selectedContext
        selectedContextData.data.error = {
            error: true,
            message: 'Uploading in Progress. Please Wait'
        };

        store.dispatch(setSelectedContext(selectedContextData));

        setTimeout(() => {
            selectedContextData.data.error = null;
            store.dispatch(setSelectedContext(selectedContextData));
        }, 3000);
        return;
    }
    setContext(state, { payload: attachments, action }, () => { });
}

export const setContext = async (state, args, callback, type) => {

    let userId = window.sdkConfig.userId

    if (args?.payload) {
        args.payload = args?.payload?.map(p => {
            let obj = {}
            let ext = p?.ext || p?.extName;
            if (["gsheet", "xls", "xlsx"].includes(ext)) {
                obj.sheetId = p?.selectedSheetId ? p?.selectedSheetId : "0"
            }
            if (type === 'accountKnowledge') {
                // as it shouldnt be file type [TEMPERORY SOLUTION TILL BACKEND GIVE US]
                if (args?.params?.overrideSource && !p?.file_title) {
                    let overrideSource = {
                        docId: p?.contentId,
                        title: p?.title,
                        canSetAsSourceContext: true,
                        ext: p?.ext,
                        source: type,
                        type: "knowledge",
                        extIcon: p?.extIcon,
                        redirectUrl: {
                            dweb: p?.url
                        }
                    }
                    return { ...obj, docId: p?.contentId, source: type, overrideSource: overrideSource }
                } else return { ...obj, docId: p?.contentId, source: type }
            }
            else {
                if (p?.docId) {
                    obj.docId = p?.docId
                }
                if (p?.source) {
                    obj.source = p?.source
                }
                // Include agentType if present (for GPT agents set as context)
                // Matching Kora-React: agentType : args?.params?.setViaGptAgent ? "gptAgent" : p?.agentType ? p?.agentType : null
                if (args?.params?.setViaGptAgent) {
                    obj.agentType = "gptAgent";
                } else if (p?.agentType) {
                    obj.agentType = p?.agentType;
                }
                return obj
            }
        })
    }

    const { } = args;
    const params = {
        action: args?.action,
        // it will be helpfull to remove items from selectedContext state if api got failed
        actionItemIds: args?.payload?.map(p => p?.docId)
    }
    const payload = {}

    if (args?.messageId && !args?.params?.skipPayloadMessageId) {
        payload.messageId = args.messageId
    }

    if (args?.boardId && !args?.params?.skipPayloadMessageId) {
        payload.boardId = args.boardId
    }

    if (args?.action === "add") {
        payload.sources = args?.payload
    }
    else if (args?.action === "update") {
        payload.addSources = args?.payload
    }

    if (args?.action === "update" || args?.action === "remove") {
        params.sessionId = state.selectedContext?.data?.sessionId
        if (args?.action === "remove") {
            // Set params.docId for DELETE API call (matching Kora-React)
            // The API expects docId in params for the URL path: /sources/:docId
            params.docId = args?.payload?.[0]?.docId || args?.payload?.[0]?.contentId || args?.payload?.[0]?.id
            payload.removeSources = args?.payload?.map(obj => obj?.docId || obj?.contentId || obj?.id)
        }
    }
    const response = await store.dispatch(searchSession({ params, payload, userId }))
    getContextData(state, { response, args, callback, type })
}

const getContextData = (state, data) => {
    let _selectedContext = state.selectedContext?.data;

    if (data?.response?.error) {
        // if api get fails
        if (data?.args?.action === "add") {
            _selectedContext = null;
        }
        else if (data?.args?.action === "update") {
            _selectedContext.sources = _selectedContext?.sources?.map(c => {
                if (data?.args?.subsheet) {
                    delete c?.loading;
                    return c;
                }
                if (data?.data?.params?.actionItemIds?.includes(c?.docId)) {
                    return null;
                }
                return c;
            })?.filter(Boolean);
        }
        else if (data?.data?.params?.action === "remove") {
            if (!!_selectedContext?.type) {
                _selectedContext = null
            } else {
                _selectedContext.sources = _selectedContext?.sources?.map(c => {
                    if (data?.data?.params?.actionItemIds.includes(c?.docId)) {
                        delete c?.removeInProgress;
                    }
                    return c;
                });
            }
        }
        let selectedContextData = state.selectedContext;
        selectedContextData.data = _selectedContext
        return store.dispatch(setSelectedContext(selectedContextData));
    } else {
        // API call succeeded - update selectedContext with API response (matching Kora-React)
        if (state?.enableDebugging) {
            console.log('SearchSession API success:', data?.response)
        }

        const wasInvokedFromMenuOptions = data?.args?.params?.invokeFrom === "menuOptions";
        const wasInvokedFromGptAgent = data?.args?.params?.invokeFrom === "gptAgent";

        // Get sources from API response
        let contextSources = data?.response?.payload?.sources;

        // Preserve correct docId for GPT agents (matching Kora-React fix)
        if (wasInvokedFromGptAgent && data?.args?.params?.item?.docId && contextSources?.[0]) {
            contextSources = contextSources.map(source => ({
                ...source,
                docId: data?.args?.params?.item?.docId
            }));
        }

        // Update selectedContext with API response data
        const selectedContextData = {
            data: {
                ...data?.response?.payload,
                // Use corrected sources if available
                sources: contextSources || data?.response?.payload?.sources,
                // Preserve sessionId from API response
                sessionId: data?.response?.payload?.sessionId || state.selectedContext?.data?.sessionId,
                // Preserve flags
                setViaMenuOptions: state.selectedContext?.data?.setViaMenuOptions || wasInvokedFromMenuOptions,
                setViaGptAgent: state.selectedContext?.data?.setViaGptAgent || wasInvokedFromGptAgent,
                // Preserve messageId/boardId if previously set (e.g., via menu options)
                messageId: state.selectedContext?.data?.messageId || data?.args?.messageId || data?.args?.params?.messageId,
                boardId: state.selectedContext?.data?.boardId || data?.args?.boardId || data?.args?.params?.boardId,
                // Set type based on agent type (matching Kora-React)
                type: data?.type || (data?.response?.payload?.context?.agentType === "gptAgent" ? "agent" : null),
                // Preserve quickactions
                quickactions: data?.response?.payload?.quickactions || state.selectedContext?.data?.quickactions
            }
        };

        // Remove loading state from sources
        if (selectedContextData.data.sources) {
            selectedContextData.data.sources = selectedContextData.data.sources.map(source => {
                const updated = { ...source };
                delete updated.loading;
                return updated;
            });
        }

        store.dispatch(setSelectedContext(selectedContextData));

        // Update quick actions
        let _quickActions = data?.response?.payload?.quickactions;
        if (_quickActions) {
            store.dispatch(setQuickActions(_quickActions));
        }
    }

    // if comes in this condition means all items removed from existing session
    if (data?.args?.action === "remove" && (data?.response?.payload?.sources?.length === 0 || isEmpty(data?.response?.payload))) {
        store.dispatch(setSelectedContext({}));
    }

    if (data?.callback) {
        data?.callback();
    }
}

export const removeLoadingFile = ({ state, item }) => {
    const { selectedContext } = state;
    let _selectedContext = {};
    _selectedContext.data = {};
    let remainingFiles = selectedContext.data.sources.filter(file => file.uID !== item.uID)
    _selectedContext.data.sources = remainingFiles
    _selectedContext.data.sessionId = selectedContext?.data?.sessionId
    _selectedContext.data.quickactions = selectedContext?.data?.quickactions
    store.dispatch(setSelectedContext(_selectedContext))
}

