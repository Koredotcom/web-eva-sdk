import { advanceSearch, cancelAdvancedSearch } from "../redux/actions/global.action";
import { setCurrentQuestion } from "../redux/globalSlice"
// import { updateChatData } from "../redux/globalSlice";
import store from "../redux/store";
import { v4 as uuid } from 'uuid';
import { constructQuestionInitial, constructQuestionPostCall } from "./chat-utils";

const ChatInterface = (props) => {
    let state = store.getState().global, input = '';

    // Subscribe to store updates
    const subscribe = (cb) => {
        let callback = cb;
        const unsubscribe = store.subscribe(() => {
            state = store.getState().global;
            // If callback exists and API call is completed, invoke it
            if (state.advanceSearchRes.status !== 'loading' && callback) {
                callback(state.questions, state.advanceSearchRes.data);
            }
        });

        // Return a function to unsubscribe
        return () => {
            unsubscribe();
        };
    };

    // Create the input element
    const inputElement = document.createElement('div');
    inputElement.contentEditable = true;

    // Define the event handler function
    function handleEvent(event) {
      console.log(`Event: ${event.type}, Value: ${event.target.value}`);

      if(event.type == 'keyup') {
        // input = event.target.value
        input = event?.target?.textContent;
        if((event?.key === 'Enter' || event?.keyCode === 13)) {
          sendMessageAction()
        }
      }
      else if (event.type == 'keydown') {
        // invoke on keydown
      }
      else if (event.type == 'change') {
        // invoke on change
      }
      else if (event.type == 'focus') {
        // invoke on focus
      }
      else if (event.type == 'blur') {
        // invoke on blur
      }
    }

    const sendMessageAction = async () => {
      if (input) {
        let params = { reqId: uuid() }
        let payload = { question: input }
        if(state.activeBoardId) {
          payload.boardId = state.activeBoardId
        }
        const qId = constructQuestionInitial({ ...params, ...payload })
        store.dispatch(setCurrentQuestion({ ...params, ...payload }))

        input = ''
        inputElement.textContent = ''

        const Res = await store.dispatch(advanceSearch({ params, payload, userId: state.profile.data.id }))
        constructQuestionPostCall(Res, qId)
        store.dispatch(setCurrentQuestion({}))
      }
    }

    const cancelMessageReqAction = async (id) => {
      if (id) {
        store.dispatch(cancelAdvancedSearch({ userId: state.profile.data.id, reqId: id, payload: state.currentQuestion }))
      } else {
        store.dispatch(cancelAdvancedSearch({ userId: state.profile.data.id, reqId: state.currentQuestion.reqId, payload: state.currentQuestion }))
      }
    }

    const initiateChatConversationAction = async (arg) => {
      let params = { reqId: uuid() }
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
      const Res = await store.dispatch(advanceSearch({ params, payload, userId: state.profile.data.id }))
      constructQuestionPostCall(Res, qId)
    }

    const invokeGptAgentTemplate = (arg) => {
      const item = arg.question
      if (!item?.templateInfo?.suggestions?.[0]?.comingSoon) {
          let payload = {};
          // let context = {};
          let context = {...item?.context, messageId : item?.messageId, sources : item?.sources, viewType : item?.viewType, type : "gptAgent"}
          payload.context = context
          payload.question = arg.utterance.label
          initiateChatConversationAction({payload})
      }
    }

    // Add event listeners for the various events
    inputElement.addEventListener('change', handleEvent);
    inputElement.addEventListener('keyup', handleEvent);
    inputElement.addEventListener('keydown', handleEvent);
    inputElement.addEventListener('focus', handleEvent);
    inputElement.addEventListener('blur', handleEvent);

    return {
        showComposeBar: parentEl => {
            // Append the input element to the parentEl
            document.getElementById(parentEl).appendChild(inputElement);
        },
        subscribe,
        sendMessageAction,
        initiateChatConversationAction,
        cancelMessageReqAction,
        invokeGptAgentTemplate
    }
}

export default ChatInterface;