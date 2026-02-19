import { abortAdvanceSearch } from "../redux/actions/global.action"
import { setActiveBoardId, setGptUploadedFiles, updateChatData, setSelectedContext, setCurrentQuestion, setErrorState, setQuickActions } from "../redux/globalSlice"
import store from "../redux/store"

const NewChat = () => {    
    abortAdvanceSearch()    
    // Set board id as null
    abortAdvanceSearch()
    store.dispatch(setActiveBoardId(null))
    store.dispatch(updateChatData({}))
    store.dispatch(setGptUploadedFiles(null))
    store.dispatch(setSelectedContext({}))
    store.dispatch(setCurrentQuestion({}))
    store.dispatch(setErrorState([]))
    store.dispatch(setQuickActions([]))

}

export default NewChat