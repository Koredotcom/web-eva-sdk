import { abortAdvanceSearch } from "../redux/actions/global.action"
import { setActiveBoardId, setGptUploadedFiles, updateChatData, setSelectedContext, setCurrentQuestion, setErrorState, setQuickActions, setAutonomousAsyncPending } from "../redux/globalSlice"
import store from "../redux/store"
import { cleanupAllAuthChallenges } from "../templateRenderer/functionality/agent-auth-challenge"
import ChatInterface from "./ChatInterface"

const NewChat = (agentContext=null) => {    
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

    if (agentContext) {
        // Let the reset subscribers finish hiding the previous banner before
        // restoring the default agent context.
        setTimeout(() => {
            ChatInterface().setAgentContext(agentContext)
        }, 150)
    }

}

export default NewChat
