import { useEffect, useRef, useState } from "react"
import deleteChatThread from "../history/deleteHistoryData"
import updateHistoryData from "../history/updateHistoryData"
import { HistoryData, HistoryInterface, LoadMoreHistoryData } from "../history"
import { JoinChatThread } from "../chat"

const History = (props) => {
    const [historyData, setHistoryData] = useState(null)
    const historyInterface = useRef()

    useEffect(() => {
        // fetchHistoryData()

        // Create an instance of HistoryInterface
        historyInterface.current = HistoryInterface();

        // Subscribe to updates
        const unsubscribe = historyInterface.current.subscribe((allhistoryData, apiRes) => {
            // Handle the API response data
            console.log('Received data from History API:', allhistoryData, apiRes);
            setHistoryData(allhistoryData)
        });

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
        console.log('All History', res)
    }

    const fetchLoadMoreHistory = async () => {
        const res = await LoadMoreHistoryData({limit: 10})
        console.log('All History', res)
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

    return (
        <div>
            <h1>History</h1>
            <button onClick={fetchLoadMoreHistory}>Load more history</button>
            <button onClick={fetchLoadMoreHistoryInitial}>Initial history data with custom param</button>
            <div>
                {historyData?.data?.length > 0 && historyData?.data?.map(item => {
                    return (
                        <div className={`historyGrp-${item?.id}`} onClick={()=> joinChatHistory(item)}>
                            <button onClick={(e) => { e.preventDefault(); deleteChatThread(item) }}>Delete</button>
                            <span>{item?.name}</span>
                            <button onClick={(e) => { e.preventDefault(); editNamePopup(item) }}>Edit</button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default History