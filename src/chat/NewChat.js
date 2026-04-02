import { abortAdvanceSearch } from "../redux/actions/global.action"
import { setActiveBoardId, setGptUploadedFiles, updateChatData, setSelectedContext, setCurrentQuestion, setErrorState, setQuickActions, setAutonomousAsyncPending } from "../redux/globalSlice"
import store from "../redux/store"
import { cleanupAllAuthChallenges } from "../templateRenderer/functionality/agent-auth-challenge"

const NewChat = () => {    
    abortAdvanceSearch()
    cleanupAllAuthChallenges()
    store.dispatch(setAutonomousAsyncPending({}))
    // Set board id as null
    store.dispatch(setActiveBoardId(null))
    store.dispatch(updateChatData({}))
    store.dispatch(setGptUploadedFiles(null))
    store.dispatch(setSelectedContext({}))
    store.dispatch(setCurrentQuestion({}))
    store.dispatch(setErrorState([]))
    store.dispatch(setQuickActions([]))

}

export default NewChat