import { setActiveBoardId, setGptUploadedFiles, updateChatData, setSelectedContext, setCurrentQuestion } from "../redux/globalSlice"
import store from "../redux/store"

const NewChat = () => {
    // Set board id as null
    store.dispatch(setActiveBoardId(null))
    store.dispatch(updateChatData({}))
    store.dispatch(setGptUploadedFiles(null))
    store.dispatch(setSelectedContext({}))
    store.dispatch(setCurrentQuestion({}))
}

export default NewChat