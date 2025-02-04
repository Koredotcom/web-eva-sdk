import { setActiveBoardId, setGptUploadedFiles, updateChatData, setSelectedContext, setCurrentQuestion, setErrorState } from "../redux/globalSlice"
import store from "../redux/store"

const NewChat = () => {
    // Set board id as null
    store.dispatch(setActiveBoardId(null))
    store.dispatch(updateChatData({}))
    store.dispatch(setGptUploadedFiles(null))
    store.dispatch(setSelectedContext({}))
    store.dispatch(setCurrentQuestion({}))
    store.dispatch(setErrorState([]))
}

export default NewChat