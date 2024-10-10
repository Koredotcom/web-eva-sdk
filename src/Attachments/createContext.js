import { cloneDeep} from "lodash";
import store from "../redux/store";
import { searchSession } from "../redux/actions/global.action";
import { setSelectedContext } from "../redux/globalSlice";

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
        state,
        item,
        discardPrevSession, // always create new session
        duplicateErr, // select,deselect functionality will be disabled if its true, instead showing error toast msg
        removingSource, // it will be true while removing any source chip from composebar
        viewType, // it will contain the question type whether its knowledge or data
        override, // it will be true only when comes from overridemsgmodal
        invokeAgent,
        type
    } = args;

    const { selectedContext } = state

    if (selectedContext.status === 'loading') {
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
        selectedContextData.sources = [{ ...item }, type]
        store.dispatch(setSelectedContext(selectedContextData))
        return;
    }

    if (_selectedItem && !discardPrevSession) {
        if (duplicateErr) {   
            let selectedContextData = selectedContext
            setTimeout(() => {
                selectedContextData.data.error = null;
                store.dispatch(setSelectedContext(selectedContextData))
            }, 3000);
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
        if (type === 'accountKnowledge') {
            addedItem.sourceFrom = type
        }
        if (!_selectedContext?.sources || discardPrevSession) {
            _selectedContext.sources = []
        }
        _selectedContext?.sources?.push(addedItem);

        if ((_selectedContext?.sources?.length === 1 && !selectedContext) || discardPrevSession) {
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
        else if (_selectedContext?.sources?.length > selectedContext?.sources?.length) {
            action = "update"
            payload = [addedItem];
        }
    }

    // let selectedContextData = {};
    // selectedContextData.data = {};
    // selectedContextData.data.sources = _selectedContext.sources
    // selectedContextData.data.sessionId = selectedContext?.data?.sessionId
    // selectedContextData.data.quickactions = selectedContext?.data?.quickactions
    // store.dispatch(setSelectedContext(selectedContextData))
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
                return { ...obj, docId: p?.docId, source: p?.source }
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

    if (args?.messageId) {
        payload.messageId = args.messageId
    }

    if (args?.boardId) {
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
            params.docId = args?.payload?.[0]?.docId
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
        console.log(data?.response)
    }
    // if comes in this condition means all items removed from existing session
    if (data?.args?.action === "remove" && (data?.response?.payload?.sources?.length === 0)) {
        store.dispatch(setSelectedContext(null));
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

