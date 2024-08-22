import { advanceSearch, cancelAdvancedSearch } from "../redux/actions/global.action";
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
    const inputElement = document.createElement('input');
    inputElement.type = 'text';

    // Define the event handler function
    function handleEvent(event) {
      console.log(`Event: ${event.type}, Value: ${event.target.value}`);

      if(event.type == 'keyup') {
        input = event.target.value
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
        const Res = await store.dispatch(advanceSearch({ params, payload, userId: state.profile.data.id }))
        constructQuestionPostCall(Res, qId)
      }
      input = ''
      inputElement.value = ''
    }

    const cancelMessageReqAction = async () => {
        store.dispatch(cancelAdvancedSearch())
    }

    const initiateChatConversationAction = async (arg) => {
      let params = { reqId: uuid() }
      let payload = {}
      if(state.activeBoardId) {
        payload.boardId = state.activeBoardId
      }
      if(arg?.payload) {
        payload = {...payload, ...arg.payload}
      }
      const qId = constructQuestionInitial({ ...params, ...payload })
      const Res = await store.dispatch(advanceSearch({ params, payload, userId: state.profile.data.id }))
      constructQuestionPostCall(Res, qId)
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
        cancelMessageReqAction
    }
}

export default ChatInterface;