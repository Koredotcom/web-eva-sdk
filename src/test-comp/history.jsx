import deleteChatThread from "../history/deleteHistoryData"
import updateHistoryData from "../history/updateHistoryData"

const History = (props) => {

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

    return (
        <>
            {props?.history?.length > 0 && props?.history?.map(item => {
                return (
                    <div className={`historyGrp-${item?.id}`}>
                        <button onClick={(e) => { e.preventDefault(); deleteChatThread(item) }}>Delete</button>
                        <span>{item?.name}</span>
                        <button onClick={(e) => { e.preventDefault(); editNamePopup(item) }}>Edit</button>
                    </div>
                )
            })}</>
    )
}

export default History