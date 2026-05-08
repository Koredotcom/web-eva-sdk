import _, { cloneDeep } from "lodash";
import { bookMarkChatThread, deleteHistory, getBookMarkedChatThreads, searchHistoryBoards, updateHistory } from "../redux/actions/global.action";
import { setAllHistory, setBookMarkedChatThreads } from "../redux/globalSlice";
import store from "../redux/store";
import LoadMoreHistoryData from "./LoadMoreHistoryData";

let bookMarkedThreadsOffset = 1;

const HistoryInterface = (props) => {
    let state = store.getState().global;

    // Subscribe to store updates
    const subscribe = (cb) => {
        let callback = cb;
        const unsubscribe = store.subscribe(() => {
            state = store.getState().global;
            // If callback exists and API call is completed, invoke it
            if (state.historyRes.status !== 'loading' && callback) {
                let _history = cloneDeep(state.AllHistory)
                _history.data = _.orderBy(_history.data, 'createdOn', 'desc')
                callback(_history, state.historyRes, state.bookMarkedChatThreads);
            }
        });

        // Return a function to unsubscribe
        return () => {
            unsubscribe();
        };
    };

    const deleteHistoryBoard = async (arg) => {
        const response = await store.dispatch(deleteHistory({ boardId: arg?.id }))
        if (response?.payload?.success) {
            let newHistory = { 
                ...state.AllHistory, 
                data: state.AllHistory.data.filter(item => item?.id !== response?.meta?.arg?.boardId)
              };
              
              store.dispatch(setAllHistory(newHistory));      
        }
    }

    const updateHistoryBoardName = async (arg) => {
        let params = {
            "boardId": arg?.boardId
        }
        let payload = {
            "name": arg?.newName
        }
        const response = await store.dispatch(updateHistory({ params, payload }))
        if (response) {
            let newBoard = state?.AllHistory?.data.map(b => {
                if(b.id === arg.boardId) {
                    b = response.payload
                }
                return b
            })
            let newHistory = {
                ...state.AllHistory,
                data: newBoard
            };
            store.dispatch(setAllHistory(newHistory));
        }
    }

    const fetchBookMarkedChatThread = async (arg) => {
        let params = {
            limit: arg?.limit || 10
        }
        const res = await store.dispatch(getBookMarkedChatThreads(params))
        let bookmarkedThreads = {
            ...res?.payload,
            boards: res?.payload?.boards?.map(boardItem => {
                boardItem = {...boardItem, bookMarked: true}
                return boardItem
            })
        }
        store.dispatch(setBookMarkedChatThreads(bookmarkedThreads))
    }

    const loadMoreBookMarkedChatThreads = async (arg) => {
        let _bookMarkedThreads = cloneDeep(state?.bookMarkedChatThreads)
        let params = {
            limit: arg?.limit || 10,
            offset: bookMarkedThreadsOffset* arg?.limit || 10
        }
        const res = await store.dispatch(getBookMarkedChatThreads(params))
        if(!!res?.payload) {
            _bookMarkedThreads = {
                ..._bookMarkedThreads,
                boards: [..._bookMarkedThreads?.boards, ...res?.payload?.boards], 
                moreAvailable: res?.payload?.moreAvailable
            }
            if(res?.payload?.moreAvailable) {
                bookMarkedThreadsOffset++
            }
            store.dispatch(setBookMarkedChatThreads(_bookMarkedThreads))
        }
    }

    const bookMarkChatThreadItem = async (item) => {
        const payload = {
            markAsStar: item?.bookMarked ? false : true
        }
        const params = {
            boardId: item?.id
        }
        const res = await store.dispatch(bookMarkChatThread({params, payload}))
        if(res?.payload?.[0] === "SUCCESS") {
            let _history = cloneDeep(state?.AllHistory)
            let _bookMarkedThreads = cloneDeep(state?.bookMarkedChatThreads)
            _history.data = _history?.data?.map(historyItem => {
                if(historyItem?.id === item?.id) {
                    historyItem = {...historyItem, bookMarked: !historyItem?.bookMarked}
                }
                return historyItem
            })
            if(item?.bookMarked) {
                _bookMarkedThreads.boards = _bookMarkedThreads?.boards?.filter(boardItem => boardItem?.id !== item?.id)
            }
            store.dispatch(setAllHistory(_history))
            store.dispatch(setBookMarkedChatThreads(_bookMarkedThreads))
        }
    }

    const updateHistoryBoardNameonSocketEvent = async (arg) => {
        let _history = cloneDeep(state?.AllHistory)
        _history.data = _history?.data?.map(historyItem => {
            if (historyItem?.id === arg?.id) {
                historyItem = { ...historyItem, name: arg?.name }
            }
            return historyItem
        })
        store.dispatch(setAllHistory(_history))
    }

    const historyPagination = async (arg) => {
        /*invoke loadMoreHistoryData with the given arguments*/
        await LoadMoreHistoryData(arg)
    }

    /**
     * Free-text search over the current user's history boards.
     * Returns `{ status, data, error }` so consumers don't have to dig into the raw thunk result.
     *
     * @param {object} arg
     * @param {string} arg.search Search term (required).
     * @param {number} [arg.limit=50]
     * @param {number} [arg.messagesLimit=20]
     * @param {boolean} [arg.includeMessages=true]
     * @param {boolean} [arg.showdata=false]
     */
    const searchHistory = async (arg = {}) => {
        const term = typeof arg?.search === 'string' ? arg.search.trim() : '';
        if (!term) {
            return { status: 'failed', error: { message: 'search term is required' }, data: null };
        }
        try {
            const data = await store
                .dispatch(searchHistoryBoards({ ...arg, search: term }))
                .unwrap();
            return { status: 'success', data, error: null };
        } catch (error) {
            const err =
                error && typeof error === 'object' && !Array.isArray(error)
                    ? error
                    : { message: String(error ?? 'Unable to search history') };
            return { status: 'failed', error: err, data: null };
        }
    }

    return {
        subscribe,
        deleteHistoryBoard,
        updateHistoryBoardName,
        fetchBookMarkedChatThread,
        loadMoreBookMarkedChatThreads,
        bookMarkChatThreadItem,
        updateHistoryBoardNameonSocketEvent,
        historyPagination,
        searchHistory,
    }
}

export default HistoryInterface;