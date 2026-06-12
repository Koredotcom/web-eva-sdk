import { use, useEffect, useRef, useState } from "react"
import deleteChatThread from "../history/deleteHistoryData"
import updateHistoryData from "../history/updateHistoryData"
import { HistoryData, HistoryInterface, LoadMoreHistoryData } from "../history"
import { JoinChatThread } from "../chat"
import { LoadMoreRecentFiles, RecentFiles } from "../files"
import getBookMarkedChatThreads from "../history/getBookMarkedChatThreads"
import bookMarkChatThread from "../history/bookMarkChatThread"
import loadMoreBookMarkedChatThreads from "../history/loadMoreBookMarkedChatThreads"
import store from "../redux/store"

const History = (props) => {
    const [historyData, setHistoryData] = useState(null)
    const [bookMarkedThreads, setBookMarkedThreads] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [searchBoards, setSearchBoards] = useState([])
    const [searchHasMore, setSearchHasMore] = useState(false)
    const [searchAttempted, setSearchAttempted] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState(null)
    const [hoveredPreview, setHoveredPreview] = useState(null)
    const historyInterface = useRef()
    const recentFilesInterface = useRef()
    const state = store.getState().global

    useEffect(() => {
        // fetchHistoryData()

        // Create an instance of HistoryInterface
        historyInterface.current = HistoryInterface();
        recentFilesInterface.current = RecentFiles();
        // getBookMarkedThreads()

        // Subscribe to updates
        const unsubscribe = historyInterface.current.subscribe((allhistoryData, apiRes, bookMarkedChatThreads) => {
            // Handle the API response data
            if(state?.enableDebugging) {
                console.log('Received data from History API:', allhistoryData, apiRes, bookMarkedChatThreads);
            }
            setHistoryData(allhistoryData)
            setBookMarkedThreads(bookMarkedChatThreads)
        });

        // recentFilesInterface.current.subscribe((allRecentFilesData, apiRes) => {
        //     console.log('Received data from Recent Files API:', allRecentFilesData, apiRes);
        // })


        // Cleanup on component unmount
        return () => {
            // Unsubscribe from store updates
            unsubscribe();
        };
    }, [])
    

    // const fetchHistoryData = async () => {
    //     const res = await HistoryData()
    //     console.log('history', res)
    // }

    const fetchLoadMoreHistoryInitial = async () => {
        const res = await LoadMoreHistoryData({limit: 20, initialData: true})
        // console.log('All History', res)
    }

    const fetchRecentFilesInitial = async () => {
        const res = await LoadMoreRecentFiles({limit: 20, initialData: true})   
        // console.log('All Recent Files', res)
    }

    const fetchLoadMoreHistory = async () => {
        const res = await LoadMoreHistoryData({limit: 10})
        // console.log('All History', res)
    }

    const editNamePopup = (item) => {
        const inputText = document.createElement('input')
        inputText.type = 'text'
        inputText.id = `historyName-${item?.id}`
        inputText.value = item?.name

        const updateButton = document.createElement('button')
        updateButton.innerText = "Update"
        updateButton.addEventListener('click', (e) => changeHistoryBoardName(e,item))

        const respectiveHistoryTab = document.querySelector(`.historyGrp-${item?.id}`)
        respectiveHistoryTab.appendChild(inputText)
        respectiveHistoryTab.appendChild(updateButton)
    }

    const changeHistoryBoardName = (e, item) => {
        e?.preventDefault();
        let updatedNameText = document.getElementById(`historyName-${item?.id}`)
        let updatedName = updatedNameText?.value
        updateHistoryData({ boardId: item?.id, newName: updatedName })
    }

    const joinChatHistory = (board) => {
        JoinChatThread({ boardId: board?.id })
    };

    const getBookMarkedThreads = () => {
        getBookMarkedChatThreads({limit: 10})
    }

    const loadMoreBookMarkedThreads = () => {
        loadMoreBookMarkedChatThreads({limit: 10})
    }

    const bookMarkChatThreadItem = (item) => {
        bookMarkChatThread(item)
    }

    // Search calls are debounced inside the SDK, so this is invoked on every keystroke
    const handleSearchTermChange = async (event) => {
        const value = event.target.value;
        setSearchTerm(value);

        if (!value.trim()) {
            historyInterface.current?.clearHistorySearch?.();
            setSearchBoards([]);
            setSearchHasMore(false);
            setSearchAttempted(false);
            setSearchError(null);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        setSearchAttempted(true);
        setSearchError(null);

        const res = await historyInterface.current?.searchHistory({ search: value });

        // A newer keystroke superseded this call — ignore it
        if (res?.status === 'cancelled') return;

        if (res?.status === 'success') {
            setSearchBoards(res?.data?.results || []);
            setSearchHasMore(!!res?.data?.moreAvailable);
        } else {
            setSearchBoards([]);
            setSearchHasMore(false);
            setSearchError(res?.error?.message || 'Unable to search history');
        }
        setSearchLoading(false);
    }

    const loadMoreSearchResults = async () => {
        const res = await historyInterface.current?.loadMoreSearchHistory();
        if (res?.status === 'success') {
            setSearchBoards(res?.data?.results || []);
            setSearchHasMore(!!res?.data?.moreAvailable);
        }
    }

    // On hover of a history item / search result, preview the thread's messages (Work app behaviour)
    const handleHistoryItemHover = async (item) => {
        const preview = await historyInterface.current?.getHistoryItemPreview(isSearchActive ? item : item?.id);
        setHoveredPreview(preview);
    }

    const isSearchActive = Boolean(searchTerm.trim());
    const visibleHistoryBoards = isSearchActive ? searchBoards : (historyData?.data || []);

    return (
        <div>
            <h1>History</h1>
            <div>
                <input
                    type="search"
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    placeholder="Search history"
                />
                {searchLoading ? <span>Searching...</span> : null}
            </div>
            <button onClick={fetchLoadMoreHistory} disabled={isSearchActive}>Load more history</button>
            {isSearchActive && searchHasMore ? (
                <button onClick={loadMoreSearchResults}>Load more search results</button>
            ) : null}
            {/* <button onClick={fetchLoadMoreHistoryInitial}>Initial history data with custom param</button> */}
            <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                    {searchError ? <div>{searchError}</div> : null}
                    {isSearchActive && searchAttempted && !searchLoading && visibleHistoryBoards.length === 0 ? (
                        <div>No results found</div>
                    ) : null}
                    {visibleHistoryBoards?.length > 0 && visibleHistoryBoards?.map(item => {
                        return (
                            <div
                                className={`historyGrp-${item?.id}`}
                                onClick={()=> JoinChatThread({ boardId: isSearchActive ? (item?.boardId || item?.id) : item?.id })}
                                onMouseEnter={() => handleHistoryItemHover(item)}
                                key={item?.id}
                            >
                                {/* <button onClick={(e) => { e.preventDefault();  e?.stopPropagation();deleteChatThread(item) }}>Delete</button> */}
                                <span>{isSearchActive ? (item?.threadTitle || item?.title || item?.snippet) : item?.name}</span>
                                {/* <button onClick={(e) => { e.preventDefault();  e?.stopPropagation();editNamePopup(item) }}>Edit</button> */}
                                {/* <button onClick={(e) => { e.preventDefault(); e?.stopPropagation(); bookMarkChatThreadItem(item) }}>{item?.bookMarked ? 'UnBook Mark' : 'Book Mark'}</button> */}
                            </div>
                        )
                    })}
                </div>
                {/* Hover preview panel — messages of the hovered thread */}
                {hoveredPreview?.boardId ? (
                    <div>
                        <h3>{hoveredPreview?.board?.name}</h3>
                        {Object.keys(hoveredPreview?.questions || {}).length === 0 ? (
                            <div>No messages to preview</div>
                        ) : (
                            Object.values(hoveredPreview.questions).map(q => (
                                <div key={q?.id}>
                                    <div><b>{q?.question || q?.content?.question}</b></div>
                                    <div>{q?.answer || q?.content?.answer}</div>
                                </div>
                            ))
                        )}
                    </div>
                ) : null}
            </div>
            {/* <div>
                <h1>Book Marked Chat Thread</h1>
                <button onClick={getBookMarkedThreads}>Get Book Marked Chat Threads</button>
                <button onClick={loadMoreBookMarkedThreads}>Get More Book Marked Chat Threads</button>
                {bookMarkedThreads?.boards?.length > 0 && bookMarkedThreads?.boards?.map(item => {
                    return (
                        <div className={`bookMarkedGrp-${item?.id}`} onClick={()=> joinChatHistory(item)}>
                            <span>{item?.name}</span>
                            <button onClick={(e) => { e.preventDefault(); e?.stopPropagation(); bookMarkChatThreadItem(item) }}>UnBook Mark</button>
                        </div>
                    )
                })}
            </div>
            <div>
                <h1>Recent Files</h1>
                <button onClick={fetchRecentFilesInitial}>Initial Recent files data with custom param</button>
                <button onClick={fetchLoadMoreHistory}>Load more Recent files</button>                
            </div>             */}
        </div>
    )
}

export default History