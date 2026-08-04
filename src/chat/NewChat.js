import { setActiveBoardId, setGptUploadedFiles, updateChatData, setSelectedContext, setCurrentQuestion, setErrorState, setQuickActions, setAdvanceSearchRes, setActiveThreadKey } from "../redux/globalSlice"
import store from "../redux/store"

const NewChat = () => {
    /*
    Background generation: an in-flight request is intentionally NOT aborted
    here. Its thread partition (questionsByBoard) and runtime state stay
    alive, streaming keeps flowing into the partition, and completion raises
    the red-dot indicator on the history row.
    Detaching the thread key BEFORE clearing the foreground state stops the
    updateChatData mirror from wiping the outgoing thread's partition.
    */
    store.dispatch(setActiveThreadKey(null))
    // Set board id as null
    store.dispatch(setActiveBoardId(null))
    store.dispatch(updateChatData({}))
    store.dispatch(setGptUploadedFiles(null))
    store.dispatch(setSelectedContext({}))
    store.dispatch(setCurrentQuestion({}))
    store.dispatch(setErrorState([]))
    store.dispatch(setQuickActions([]));
    store.dispatch(setAdvanceSearchRes({}))

}

export default NewChat
