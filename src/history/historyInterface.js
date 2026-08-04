import _, { cloneDeep } from "lodash";
import { bookMarkChatThread, deleteHistory, getBookMarkedChatThreads, updateHistory } from "../redux/actions/global.action";
import { setAllHistory, setBookMarkedChatThreads, clearThreadCompletionIndicator, removeThreadState } from "../redux/globalSlice";
import { isTempThreadKey } from "../chat/threadRegistry";
import store from "../redux/store";
import LoadMoreHistoryData from "./LoadMoreHistoryData";
import SearchHistoryData, { ClearSearchHistoryData, LoadMoreSearchHistoryData } from "./searchHistoryData";
import getHistoryThreadPreview from "./getHistoryThreadPreview";

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
                /*
                Background-thread indicators: decorate every board row with its
                runtime state so the client can render a spinner (isGenerating)
                or a red dot (hasUnreadAnswer).

                A brand-new chat still on screen (active, not yet showInHistory)
                stays plain — its loader lives in the chat panel. Once the row
                has been backgrounded into history, keep the spinner/red-dot
                even if the user reopens that thread.
                */
                const threadRuntimeState = state.threadRuntimeState || {}
                const activeThreadKey = state.activeThreadKey
                _history.data = _history.data?.map(item => {
                    const runtime = threadRuntimeState[item?.id]
                    const hideIndicators = item?.id === activeThreadKey && !runtime?.showInHistory
                    const effectiveRuntime = hideIndicators ? null : runtime
                    return {
                        ...item,
                        isGenerating: !!effectiveRuntime?.isGenerating,
                        hasUnreadAnswer: !effectiveRuntime?.isGenerating && !!effectiveRuntime?.hasCompletedInBackground
                    }
                })
                /*
                Optimistic rows: a background thread the server hasn't put in
                AllHistory yet. Two cases — a boardless new chat (temp
                `#`-prefixed key, no board exists), and the window right after
                temp→real migration before the fetchHistory(limit:1) response
                lands. Both are merged at the top so the row never flickers out.

                A brand-new active thread is NOT listed until the user leaves it
                (New Chat / open another board stamps showInHistory). Once that
                flag is set, reopening the same thread must keep the row — so
                activeThreadKey alone is not enough to hide it.
                */
                const existingIds = new Set((_history.data || []).map(item => item?.id))
                const optimisticRows = Object.keys(threadRuntimeState)
                    .filter(key => {
                        if (existingIds.has(key)) return false
                        const runtime = threadRuntimeState[key]
                        /*only surface threads with something to show — a settled
                        + read thread absent from the loaded pages is not a row*/
                        if (!runtime?.isGenerating && !runtime?.hasCompletedInBackground) return false
                        /*hide while still the original on-screen chat; keep once
                        it has been backgrounded into history (even if reopened)*/
                        if (key === activeThreadKey && !runtime?.showInHistory) return false
                        return true
                    })
                    .map(key => {
                        const runtime = threadRuntimeState[key]
                        return {
                            id: key,
                            name: runtime?.title,
                            title: runtime?.title,
                            createdOn: runtime?.createdOn,
                            isGenerating: !!runtime?.isGenerating,
                            hasUnreadAnswer: !runtime?.isGenerating && !!runtime?.hasCompletedInBackground,
                            isTemp: isTempThreadKey(key)
                        }
                    })
                    .sort((a, b) => (b.createdOn || 0) - (a.createdOn || 0))
                if (optimisticRows.length > 0) {
                    _history.data = [...optimisticRows, ...(_history.data || [])]
                }
                /*
                5th arg: the raw runtime map, for clients that want the
                low-level state (activeReqIds, lastUpdatedAt, ...) directly.
                */
                callback(_history, state.historyRes, state.bookMarkedChatThreads, state.historySearch, threadRuntimeState);
            }
        });

        // Return a function to unsubscribe
        return () => {
            unsubscribe();
        };
    };

    /**
     * Clears the red-dot (unread background answer) indicator for a thread.
     * Called automatically when the thread is opened via JoinChatThread.
     */
    const markThreadAsRead = (boardId) => {
        store.dispatch(clearThreadCompletionIndicator(boardId))
    }

    const deleteHistoryBoard = async (arg) => {
        const response = await store.dispatch(deleteHistory({ boardId: arg?.id }))
        if (response?.payload?.success) {
            let newHistory = { 
                ...state.AllHistory, 
                data: state.AllHistory.data.filter(item => item?.id !== response?.meta?.arg?.boardId)
              };
              
              store.dispatch(setAllHistory(newHistory));      
              /*drop any cached partition/runtime state for the deleted board*/
              store.dispatch(removeThreadState(response?.meta?.arg?.boardId));
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
     * Debounced free-text search over the current user's history conversations
     * (`POST /ka/users/:userId/search/conversations` with body `{ query }`).
     * Safe to invoke on every keystroke — calls are debounced (300ms) and stale
     * responses are cancelled. An empty term clears the search state.
     * Results are also stored in `state.global.historySearch`.
     * Returns `{ status, data: { results, total, pageToken, moreAvailable }, error }`
     * where `status` is 'cancelled' when a newer search superseded this one.
     * Each result is a flat board/message hit:
     * `{ id, docId, docType, boardId, messageId, threadTitle, title, answer, snippet, createdOn, raw }`.
     *
     * @param {object} arg
     * @param {string} arg.search Search term (alias: `query`).
     * @param {number} [arg.limit=25]
     * @param {number} [arg.debounce=300]
     * @param {object} [arg.filters] Extensible filter map sent in the request body
     *   (e.g. `{ agentId: ['ag-...'] }`). Carried through to `loadMoreSearchHistory`.
     */
    const searchHistory = async (arg = {}) => {
        return SearchHistoryData(arg)
    }

    /**
     * Fetches the next page of results for the active search term using the
     * pageToken returned with the previous page.
     */
    const loadMoreSearchHistory = async (arg = {}) => {
        return LoadMoreSearchHistoryData(arg)
    }

    /**
     * Clears the active search term and resets `state.global.historySearch`.
     */
    const clearHistorySearch = () => {
        ClearSearchHistoryData()
    }

    /**
     * Async. Returns the data shown when a history item / search result is hovered —
     * the thread's messages shaped as a `questions` object:
     * `{ boardId, board, matchedMessageId, questions }`.
     * Accepts a boardId string (regular history list) or a search result object.
     * Regular items reuse the messages already on the boards response; search results
     * fetch the thread preview (message hits centered on the matched message) with caching.
     */
    const getHistoryItemPreview = async (target) => {
        return getHistoryThreadPreview(target)
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
        loadMoreSearchHistory,
        clearHistorySearch,
        getHistoryItemPreview,
        markThreadAsRead,
    }
}

export default HistoryInterface;