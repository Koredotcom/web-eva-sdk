import { advanceSearch } from "../redux/actions/global.action";
// import { updateChatData } from "../redux/globalSlice";
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
            if (state.advanceSearchRes.status !== 'loading' && callback) {
                callback(state.questions, state.advanceSearchRes.data);
            }
        });

        // Return a function to unsubscribe
        return () => {
            unsubscribe();
        };
    };

    const constructChatData = () => {
        let alreadyOnResultPage = data?.params?.alreadyOnResultPage;
        let followupFromSuggestionModal = data?.params?.suggestionContext;
        let question = updatedQuestions?.[data?.params?.qId]
        delete question?.loading;

        if(data?.params?.arg?.retry) {
            delete question?.error;
        }

        if (data?.res?.viewType === "list" || data?.res?.viewType === "table") {
            question.showData = true
            {showSearchResults && props?.setRelevantQuestions(false)}
        }

        //for email
        if(data?.res?.templateType === "action_send_email" && data?.res?.status === "draft") {    
            let obj = {
                canIncludeSource: data?.res?.canIncludeSource,
                emailData: emailData(question, data?.res)
            }
            question = {...question, ...obj}
        }

        //for slack and msTeams 
        if((data?.res?.templateType === "action_send_slack_message" || data?.res?.templateType === "action_send_teams_message" || data?.res?.templateType === "action_send_msteams_message") && data?.res?.status === "draft") {    
            question = {...question, ...{externalIntegrationAction : true, skills: `${data?.res?.templateType === "action_send_teams_message" || data?.res?.templateType === "action_send_msteams_message" ? "msteams" : "slack"}`}}
        }

        if(data?.res?.templateType === 'resolve_ambiguity' || data?.res?.templateType === 'intent_ambiguity'){
            setAmbiguityState(true)
        }

        //Query Limit Exhaustion Pop-up
        let _limitExhausted;
        if(data?.res?.queryExhaustionInfo?.queryLimitExhausted){
            _limitExhausted = data?.res?.queryExhaustionInfo
        }

        // Kiaas form
        if(data?.res?.templateType === "bulk_action") {
            let formFields = {}
            data.res.content.formFields.map(f => {
                formFields[f.formId] = f
            })
            data.res.formsLength = data.res.content.formFields?.length;
            data.res.content.formFields = formFields;
        }

        if(data?.res?.templateType === "connection_provider") {
            question.params = data?.params
        }

        if(data?.error) {
            question = { ...question, error: data?.error, errInfo: data?.errInfo};
            if(data?.errInfo?.errors[0]?.code === 'MaximumPointsExceeded'){
                _limitExhausted = data?.errInfo?.errors[0]
            }
        }
        else if(data?.params?.multiIntentExecution) {
            const stepIndex = question?.stepIndex;
            question = { ...question, ...data?.res, showResponse: true};
            updatedQuestions[question?.parentMsgId].executingActionId = question?.id
            if(stepIndex === 0) {
                updatedQuestions[question?.parentMsgId].status = 'in-progress'
            }
        }
        else {
            question = { ...question, ...data?.res};
        }
       
        let context;
        if(data?.res?.context && data?.res?.context?.hasOwnProperty("enable") && !!data?.res?.context?.enable) {
            let type = data?.params?.type || data?.res?.context?.type || data?.res?.context?.agentType//this type is required while removing the context that is set
            context = {...data?.res?.context, messageId: data?.res.messageId, sources: (!isEmpty(data?.res?.sources) ? data?.res?.sources : data?.res?.context?.sources), viewType: data?.res?.viewType, type: type}
        } else if(data?.params?.quickActions) {
            if(data?.params?.context?.viewType === "table") {
                // record level summarise button
                context = selectedContext
            } else {
                context = data?.params?.context
            }
        } else {
            context = null
        }
        const _selectedContext = {...selectedContext, messageId: data?.res?.messageId };

        //if the response contains thread intiating the bot conversation
        if (data?.res?.thread) {
            //rename the answer to question and include botConversation object.
            // question.question = data?.res?.thread?.previousMessage?.question

            if (!question?.botConversation) {
                question.botConversation = {}
                data?.res?.thread?.messages?.map(message => {
                    question.botConversation[message?.messageId] = message
                })
                question.collapseBotConversation = false
                updateState({
                    isBotRunning: true
                })
                console.log("is bot running", isBotRunning)
            }
            if (data?.res?.thread && data?.res?.thread?.nextMessages && data?.res?.thread?.nextMessages?.length) {
                question = updatedQuestions?.[currentQuestion]
                question.botConversation[data?.res?.messageId].status = data?.res?.status
                question.botConversation[data?.res?.messageId].answer = data?.res?.answer
                data?.res?.thread?.nextMessages?.map(message => {
                    question.botConversation[message?.messageId] = message
                })
                if (data?.res?.thread?.nextMessages[0]?.status === "completed" && data?.res?.thread?.parentMessage?.status === "completed") {
                    question.parentMessage = data?.res?.thread?.parentMessage
                    question.collapseBotConversation = true
                    updateState({
                        isBotRunning: false
                    })
                }
            }
            question.question = data?.res?.question
        }

        if(data?.res?.viewType === "threadView"){
            if(!question.hasOwnProperty("botConversation")){
                question.parentMessage = data.res  
                question.botConversation = {}
                updateState({
                    isBotRunning: true
                })
            }
        }

        updatedQuestions[data.params.qId] = question;

        updateState({
            searchResultData: data?.res,
            showError: false,
            selectedContext: followupFromSuggestionModal ? _selectedContext : context,
            questions: updatedQuestions,
            generatingAnswerMsg: null,
            showQuickActions: data?.res?.quickactions,
            currentMessageId : data?.res?.messageId,
            limitExhausted : _limitExhausted,
            searchInput: document.getElementById("search-input")?.innerText,
        }, () => {
            scrollBottom(data?.params?.qId)
        })

        if(!selectedThreadId) {
            setSelectedThreadId(data?.res?.boardId)
        }

        if(question?.isTask) {
            setTimeout(() => {
                const stepIndex = question?.stepIndex;
                props.MultiIntentExecutionRef.current.runNextTask(stepIndex, data?.res?.status)
            }, 1000);
            setTimeout(() => {
                let getEl = document.querySelector('.taskItem.loading')
                getEl?.scrollIntoView({ block: "nearest", behavior: 'smooth' });
            }, 1500);
        }
    }

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