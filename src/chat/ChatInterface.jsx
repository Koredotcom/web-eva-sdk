import { advanceSearch } from "../redux/actions/global.action";
import store from "../redux/store";
import { v4 as uuid } from 'uuid';

const ChatInterface = (props) => {
    let state = store.getState().global, input = '';

    // Subscribe to store updates
    const subscribe = (cb) => {
        let callback = cb;
        const unsubscribe = store.subscribe(() => {
            state = store.getState().global;
            // If callback exists and API call is completed, invoke it
            if (state.advanceSearch.status !== 'loading' && callback) {
                callback(state.advanceSearch.data);
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
    async function handleEvent(event) {
      console.log(`Event: ${event.type}, Value: ${event.target.value}`);

      if(event.type == 'keyup') {
        input = event.target.value
        if((event?.key === 'Enter' || event?.keyCode === 13)) {
            if(input) {
                let params = {reqId: uuid()}
                let payload = {question: input}
                await store.dispatch(advanceSearch({params, payload, userId: state.profile.data.id})) 
            }
            input = ''
            inputElement.value = ''
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
        subscribe
    }
}

export default ChatInterface;