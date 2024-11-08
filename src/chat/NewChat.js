import { setActiveBoardId, setGptUploadedFiles, updateChatData } from "../redux/globalSlice"
import store from "../redux/store"

const NewChat = () => {
    // Set board id as null
    store.dispatch(setActiveBoardId(null))
    store.dispatch(updateChatData({}))
    store.dispatch(setGptUploadedFiles(null))
}

export default NewChat