import { advanceSearch, cancelAdvancedSearch } from "../redux/actions/global.action";
import { setCurrentQuestion, setEnabledCustomTemplates } from "../redux/globalSlice"
// import { updateChatData } from "../redux/globalSlice";
import store from "../redux/store";
import { v4 as uuid } from 'uuid';
import { constructQuestionInitial, constructQuestionPostCall } from "./chat-utils";
import { generateShortUUID, getCidByMessageId, getCidByReqId } from "../utils/helpers";
import { cloneDeep, isEmpty } from "lodash";

const ChatInterface = (props) => {
    let state = store.getState().global, input = '';

    // Subscribe to store updates
    const subscribe = (cb) => {
        let callback = cb;
        const unsubscribe = store.subscribe(() => {
            state = store.getState().global;
            // If callback exists and API call is completed, invoke it
            if (state.advanceSearchRes.status !== 'loading' && callback) {
                callback(state.questions, state.advanceSearchRes, state.chatHistoryMoreAvailable);
                console.log(state.questions, state.advanceSearchRes, state.chatHistoryMoreAvailable)
            }
        });

        // Return a function to unsubscribe
        return () => {
            unsubscribe();
        };
    };

    const sendMessageAction = async (value) => {
      if (value) {
        const {enabledAgents, selectedContext} = state
        let params = { reqId: generateShortUUID() }
        let payload = { question: value }
        if(state.activeBoardId) {
          payload.boardId = state.activeBoardId
        }
        const qId = constructQuestionInitial({ ...params, ...payload })

        if(!isEmpty(selectedContext)) {
          let _agents = cloneDeep(enabledAgents)
          let isAgentSetAsSource = _agents.find(ag => ag.id === selectedContext?.data?.sources?.[0]?.source)
          let isAgent = isAgentSetAsSource ? "agent" : null
          if(isAgent) {
            // when setted context is an agent
            payload.context = selectedContext?.data?.context || selectedContext?.data?.sources?.[0]
            if(selectedContext?.data?.messageId) {
              payload.contextParams = {messageId: selectedContext?.data?.messageId}
            }
          } else {
            // when setted context is an attachment
            payload.context = {
              sessionId : selectedContext?.data?.sessionId
            }
          }
        }

        const Res = await store.dispatch(advanceSearch({ params, payload, userId: state.profile.data.id }))
        constructQuestionPostCall(Res, qId)
      }
    }

    const cancelMessageReqAction = async (id) => {
      const reqId = id || state.currentQuestion.reqId;
      const payload = { boardId: state.activeBoardId };
    
      const response = await store.dispatch(cancelAdvancedSearch({ 
        userId: state.profile.data.id, 
        reqId, 
        payload 
      }));
    
      const questions = cloneDeep(store.getState().global.questions);
      const reqdCId = getCidByReqId(questions, reqId);
    
      constructQuestionPostCall(response, reqdCId);
    };
    

    const initiateChatConversationAction = async (arg) => {
      state = store.getState().global
      let params = { reqId: generateShortUUID() }
      let payload = {}
      let replaceExistingQsn = false;
      if(state.activeBoardId) {
        payload.boardId = state.activeBoardId
      }
      if(arg?.payload) {
        payload = {...payload, ...arg.payload}
      }
      if(arg?.createIssue){
        if(arg?.from === "gptAgent"){
          params.agentType = "gptAgent"
          replaceExistingQsn = true
        }
      }

      const qId = constructQuestionInitial({ ...params, ...payload, replaceExistingQsn })

      const Res = await store.dispatch(advanceSearch({ params, payload, userId: state?.profile?.data?.id }))
      /*
      below condition triggers when templatetype is gpt_form_template and user doesnt have any input fields to enter, so application needs to make advancesearch api call with {} formData, as per EVA
      */
      if (Res?.payload?.templateType === "gpt_form_template" && Res?.payload?.content?.formFields?.inputFields?.length === 0){
        delete payload.context
        payload.formData = {}
        // payload.messageId = qId
        const newRes = await store.dispatch(advanceSearch({ params, payload,  userId: state.profile.data.id }))
        console.log("newRes..", newRes)
        constructQuestionPostCall(newRes, qId)
      }else{
        constructQuestionPostCall(Res, qId)
      }

      if(arg?.callback) {
        arg.callback()
      }
    }

    const invokeGptAgentTemplate = (arg) => {
      const item = arg.item
      if (!item?.templateInfo?.suggestions?.[0]?.comingSoon) {
          let payload = {};
          let context =  {sources : item?.sources}
          payload.context = context
          payload.question = arg.utterance.label
          initiateChatConversationAction({payload})
      }
    }

    const askQuickActions = (arg) => {
      const payload = {
        action : arg
      }
      initiateChatConversationAction({payload})
    }

    const enableCustomTemplate = (payload) => {
      store.dispatch(setEnabledCustomTemplates(payload))
    }

    return {
        subscribe,
        sendMessageAction,
        initiateChatConversationAction,
        cancelMessageReqAction,
        invokeGptAgentTemplate,
        askQuickActions,
        enableCustomTemplate,
    }
}

export default ChatInterface;