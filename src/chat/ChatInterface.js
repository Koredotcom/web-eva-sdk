import { advanceSearch, cancelAdvancedSearch, stopResponseGeneration, getSignedMediaURL, addFileToAutonomousAgentAction, removeFileFromAutonomousAgentAction } from "../redux/actions/global.action";
import { agentFilesRegistry } from "./chat-utils";
import { setChatInterfaceOptions, setCurrentQuestion, setCustomData, setEnableContextByFollowupContext, setEnabledCustomTemplates, setErrorState, setUserSelectedLLMModel, setBoardQuestions } from "../redux/globalSlice"
import { updateChatData } from "../redux/globalSlice";
import { resolveRequestThread } from "./threadRegistry";
import store from "../redux/store";
import { v4 as uuid } from 'uuid';
import { constructQuestionInitial, constructQuestionPostCall } from "./chat-utils";
import { checkHistoryAccessed, generateShortUUID, getCidByMessageId, getCidByReqId } from "../utils/helpers";
import { cloneDeep, isEmpty, isEqual } from "lodash";
import BotConversation from "./botAgent/getBotConversation";
import { sessionItemHandler } from "../Attachments/createContext";

/** Normalize escaped newlines in stored markdown (same as Kora-React MenuOptions copyAnswer). */
const normalizeCopyNewlines = (text) => {
    if (text == null || text === "") return "";
    const s = typeof text === "string" ? text : String(text);
    return s.replace(/\\n/g, "\n");
};

/**
 * Resolve chat content from the Redux store by `messageId` only.
 * For `viewType === 'threadView'`, matches `messageId` against keys of `botConversation` first; otherwise matches `question.messageId`.
 * @param {string} messageId
 * @returns {{ parent: object, botMessage: object | null } | null}
 */
const resolveMessageForCopy = (messageId) => {
    if (messageId == null || messageId === "") return null;
    const questions = store.getState().global?.questions;
    if (!questions || typeof questions !== "object") return null;

    const id = messageId;

    for (const key of Object.keys(questions)) {
        const parent = questions[key];
        if (parent?.viewType === "threadView" && parent?.botConversation && typeof parent.botConversation === "object") {
            const turn = parent.botConversation[id];
            if (turn) {
                return { parent, botMessage: turn };
            }
        }
    }

    for (const key of Object.keys(questions)) {
        const q = questions[key];
        if (q?.messageId === id) {
            return { parent: q, botMessage: null };
        }
    }

    return null;
};

const buildMultiResponseAnswer = (parent) => {
    const responses = parent?.responses;
    if (!Array.isArray(responses) || responses.length === 0) return "";
    return responses
        .map((r) => (r?.answer != null && r?.answer !== "" ? String(r.answer) : ""))
        .filter(Boolean)
        .join("\n\n");
};

/**
 * Resolve which thread a socket event belongs to and pick the right source
 * question map. Foreground events (owner is the thread on screen, or an
 * unregistered legacy event) keep working against `state.questions` exactly
 * as before; background events read/write that thread's partition only.
 */
const resolveStreamTarget = (globalState, eventReqId) => {
    const ownerThreadKey = resolveRequestThread(eventReqId);
    const isForeground = !ownerThreadKey || ownerThreadKey === globalState.activeThreadKey;
    const sourceQuestions = isForeground
        ? globalState.questions
        : (globalState.questionsByBoard?.[ownerThreadKey] || {});
    return { ownerThreadKey, isForeground, sourceQuestions };
};

/** Route a stream update to the visible chat (foreground) or a background thread's partition. */
const writeStreamQuestions = (isForeground, ownerThreadKey, questionsMap) => {
    if (isForeground) {
        store.dispatch(updateChatData(questionsMap));
    } else {
        store.dispatch(setBoardQuestions({ threadKey: ownerThreadKey, questions: questionsMap }));
    }
};

// Module-level registry shared across all ChatInterface() instances
const _attachmentChipCallbacks = new Set();

export const notifyAttachmentChipClick = (data) => {
    if (!data?.messageId) return;
    _attachmentChipCallbacks.forEach((cb) => {
        try { cb(data); } catch (e) { console.error('[EVA-SDK] attachmentChipClick callback error', e); }
    });
};

/*
Diagnostic support for `subscribe`, kept for future investigation of how often
the subscriber is notified and why. `store.subscribe` notifies on every
dispatched action regardless of whether anything the subscriber reads moved, so
these helpers classify each of the five emitted values per notification to show
whether a trigger carried real data. Uncomment this block together with the
call inside `subscribe` and the `__evaLastAction` line in the logger middleware.
Deep comparison is only affordable because the call site is gated on
`enableDebugging`; it must never run in a client build.
*/
// const SUBSCRIBED_KEYS = ['questions', 'advanceSearchRes', 'chatHistoryMoreAvailable', 'errorState', 'quickActions'];
//
// /** 'unchanged' | 'sameValueNewRef' (identity changed, content did not) | 'changed'. */
// const classifyChange = (prev, next) => {
//     if (prev === next) return 'unchanged';
//     return isEqual(prev, next) ? 'sameValueNewRef' : 'changed';
// };
//
// /** Names of the top-level fields that differ between two objects. */
// const changedFields = (a, b) => {
//     const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
//     const out = [];
//     keys.forEach((k) => {
//         if (!isEqual(a?.[k], b?.[k])) out.push(k);
//     });
//     return out;
// };
//
// /** Which question ids were added/removed/modified, and which fields moved on each. */
// const diffQuestionMaps = (prev, next) => {
//     const p = prev || {};
//     const n = next || {};
//     return {
//         added: Object.keys(n).filter((k) => !(k in p)),
//         removed: Object.keys(p).filter((k) => !(k in n)),
//         modified: Object.keys(n)
//             .filter((k) => k in p && !isEqual(p[k], n[k]))
//             .map((k) => ({ id: k, fields: changedFields(p[k], n[k]) }))
//     };
// };
//
// const reportSubscriberTrigger = (triggerCount, prev, next) => {
//     const action = globalThis.__evaLastAction || 'unknown';
//
//     if (!prev) {
//         console.log(`[EVA-SDK subscribe] #${triggerCount} by "${action}" — initial snapshot, nothing to compare against`);
//         return;
//     }
//
//     const statuses = {};
//     SUBSCRIBED_KEYS.forEach((k) => {
//         statuses[k] = classifyChange(prev[k], next[k]);
//     });
//
//     const moved = SUBSCRIBED_KEYS.filter((k) => statuses[k] !== 'unchanged');
//     if (moved.length === 0) {
//         console.log(`[EVA-SDK subscribe] #${triggerCount} by "${action}" — NO-OP: none of the 5 subscribed values changed`);
//         return;
//     }
//
//     const realChanges = moved.filter((k) => statuses[k] === 'changed');
//     const details = { action, statuses };
//     if (statuses.questions === 'changed') {
//         details.questionsDiff = diffQuestionMaps(prev.questions, next.questions);
//     }
//     const verdict = realChanges.length === 0
//         ? 'NO-OP: new object identity but identical content'
//         : `changed: ${realChanges.join(', ')}`;
//     console.log(
//         `[EVA-SDK subscribe] #${triggerCount} by "${action}" — ${verdict} | ${moved.map((k) => `${k}=${statuses[k]}`).join(', ')}`,
//         details
//     );
// };

const ChatInterface = (props) => {
    let state = store.getState().global, input = '', resIndexRef = 0;

    // Subscribe to store updates
    const subscribe = (cb) => {
        let callback = cb;
        /*
        `store.subscribe` notifies on every dispatched action, not on state
        change, so without this the callback also runs for history,
        notifications, presence and thread bookkeeping. Reference equality is a
        sound test for "did a reducer write this branch": Immer preserves the
        identity of untouched branches, and every write path here clones before
        dispatching rather than mutating in place. Deliberately O(1) so the
        cost does not grow with the number of questions in the thread.
        */
        let prev = null;
        // let triggerCount = 0;
        const unsubscribe = store.subscribe(() => {
            state = store.getState().global;
            const next = {
                questions: state.questions,
                advanceSearchRes: state.advanceSearchRes,
                chatHistoryMoreAvailable: state.chatHistoryMoreAvailable,
                errorState: state.errorState,
                quickActions: state.quickActions
            };
            // if (state?.enableDebugging) {
            //     triggerCount += 1;
            //     reportSubscriberTrigger(triggerCount, prev, next);
            // }
            const unchanged = !!prev
                && prev.questions === next.questions
                && prev.advanceSearchRes === next.advanceSearchRes
                && prev.chatHistoryMoreAvailable === next.chatHistoryMoreAvailable
                && prev.errorState === next.errorState
                && prev.quickActions === next.quickActions;
            prev = next;
            if (unchanged) return;
            if (state?.enableDebugging) {
                console.log("Received data from chat API:", next.questions, next.advanceSearchRes, next.chatHistoryMoreAvailable, next.errorState, next.quickActions);
            }
            callback(next.questions, next.advanceSearchRes, next.chatHistoryMoreAvailable, next.errorState, next.quickActions);
        });

        // Return a function to unsubscribe
        return () => {
            unsubscribe();
        };
    };

    const stopBotAnswer = async()=>{
     
        let updatedQuestions = state.questions;
        let cancelledQuestion;
        let currentQuestion = state.currentQuestion;
        if(currentQuestion){
           
                cancelledQuestion = updatedQuestions?.[currentQuestion?.reqId]
                       
        }
        else{
            cancelledQuestion = Object.values(updatedQuestions)?.find((ques) => ques?.status === 'threadRunning')
        }

        const params = {
          id: cancelledQuestion?.reqId, "quesId": cancelledQuestion?.id , userId : state?.profile?.data?.id
        }
        const payload = { boardId: state.activeBoardId }
        
        const response = await store.dispatch(stopResponseGeneration({params, payload}));
        const questions = cloneDeep(store.getState().global.questions);
        const reqdCId = getCidByReqId(questions, cancelledQuestion?.reqId);
        constructQuestionPostCall(response, reqdCId);
    

    }

    const sendMessageAction = async (value) => {
      const state = store.getState()?.global
      if (value) {
        const { allAgents, selectedContext, commonAgents, userSelectedLLMModel} = state
        let params = { reqId: generateShortUUID() }
        let payload = { question: value }        
        if(state.activeBoardId) {
          payload.boardId = state.activeBoardId
        }
        if(!isEmpty(state.customData)){
          
          payload.customData = state.customData
          if(state?.enableDebugging){
            console.log("custom data in chat interface", state.customData)
            console.log("selectedContext in chat interface", selectedContext)
          }
        }
        const qId = constructQuestionInitial({ ...params, ...payload })

        if(!isEmpty(selectedContext?.data)) {
          let _agents = cloneDeep(allAgents?.data?.agents)
          let _commonAgents = cloneDeep(commonAgents) || []
          _agents = [..._agents, ..._commonAgents?.filter(agent => !agent.disabled)]
          let isAgentSetAsSource = _agents.find(ag => ag.id === selectedContext?.data?.sources?.[0]?.source)
          let isAgent = isAgentSetAsSource ? "agent" : null
          if(isAgent) {
            // when setted context is an agent
            const _source = cloneDeep(selectedContext?.data?.context || selectedContext?.data?.sources?.[0]) || {}
            payload.context = {
              agentType: isAgentSetAsSource?.type,
              title: isAgentSetAsSource?.name,
              "sources": [_source]}
            if(selectedContext?.data?.messageId) {
              payload.contextParams = {messageId: selectedContext?.data?.messageId}
            }
            /*writing especially for botAgent, will remove this once search session api gives the context data, when we click on askFollowup after bot completion */
            if(selectedContext?.data?.sessionId){
              payload.context.sessionId = selectedContext?.data?.sessionId
            }
            if(selectedContext?.data?.sources?.[0]?.docId === 'llm' || selectedContext?.data?.sources?.[0]?.source === 'llm') {
              if(userSelectedLLMModel) {
                payload.context.sources[0] = {
                  ...payload.context.sources[0],
                  llmIntegrationId: userSelectedLLMModel
                }
              }
            }
          } else {
            // when setted context is an attachment
            payload.context = {
              sessionId : selectedContext?.data?.sessionId
            }
            if(selectedContext?.data?.followUpContext){
              payload.context = {
                ...payload.context,
                'agentType': selectedContext?.data?.context?.agentType || 'aAAgent',
                'source': selectedContext?.data?.source || selectedContext?.data?.context?.source,
              }
            }
          }
        }
        if(state?.enableDebugging){
          console.log("payload in chat interface", payload)
        }
        const Res = await store.dispatch(advanceSearch({ params, payload, userId: state.profile.data.id }))
        if(state?.enableDebugging){
          console.log("payload in chat interface", payload)
        }
        constructQuestionPostCall(Res, qId)
        resIndexRef = 0
      }
    }

    const cancelMessageReqAction = async (id) => {


      const reqId = id || state.currentQuestion.reqId;
      const questions = cloneDeep(store.getState().global.questions);
      const payload = { boardId: state.activeBoardId };
      const currQuestion = state.currentQuestion?.isTask ? state.currentQuestion : questions[state.currentQuestion.reqId];
      if(currQuestion?.viewType === "threadView" && currQuestion?.botConversation) {
         stopBotAnswer()
        return;
      }
    
      const response = await store.dispatch(cancelAdvancedSearch({ 
        userId: state.profile.data.id, 
        reqId, 
        payload 
      }));
      
      const reqdCId = currQuestion?.isTask ? currQuestion?.cId : getCidByReqId(questions, reqId);
    
      constructQuestionPostCall(response, reqdCId);
    };
    

    const initiateChatConversationAction = async (arg) => {
      const { enabledAgents, selectedContext } = state
      state = store.getState().global
      let params = { reqId: generateShortUUID() }
      let payload = {}
      let replaceExistingQsn = false;
      if (arg?.params?.reqId) {
        params.reqId = arg.params.reqId
        replaceExistingQsn = true
      }

      if (state.activeBoardId) {
        payload.boardId = state.activeBoardId
      }
      if(arg?.payload) {
        payload = {...payload, ...arg.payload}
      }
      if(arg?.createIssue){
        if(arg?.from === "gptAgent"){
          params.agentType = "gptAgent"
          if(payload?.messageId){
            params.reqId = getCidByMessageId(state.questions, payload?.messageId)
            replaceExistingQsn = true
          }            
          if(arg?.isTask){
            params.parentMsgId = arg?.parentMsgId
          }
        }

        if(arg?.from === 'mcpAgent'){
          params.agentType = "mcpAgent"
          params.reqId = getCidByMessageId(state.questions, payload?.messageId)
          replaceExistingQsn = true
          if(arg?.isTask){
            params.parentMsgId = arg?.parentMsgId
          }
        }
      }

      if(!isEmpty(state.customData)){
        if(state?.enableDebugging){
          console.log("custom data in chat interface line no 156", state.customData)
          console.log("custom data payload in chat interface line no 157", payload.customData)
        }
        payload.customData = state.customData
        if(state?.enableDebugging){
          console.log("custom data payload in chat interface line no 157", payload.customData)
        }
      }

		let qId = null;
		if(arg?.multiIntentExecution){
			qId = constructQuestionInitial({...arg?.params, ...params, ...arg?.payload, multiIntentExecution : true})
		}else{
			qId = constructQuestionInitial({...params, ...payload, replaceExistingQsn})
		}

		if(arg?.multiIntentExecution){
			// params.qId = arg?.params?.stepId;
		}else {
			if (!isEmpty(selectedContext?.data)) {
				let _agents = cloneDeep(enabledAgents);
				let isAgentSetAsSource = _agents.find(
					(ag) =>
						ag.id === selectedContext?.data?.sources?.[0]?.source
				);
				let isAgent = isAgentSetAsSource ? "agent" : null;
				if (isAgent) {
					// when setted context is an agent
					payload.context = {
            agentType: isAgentSetAsSource?.type,
            title: isAgentSetAsSource?.name,
						sources: [
							selectedContext?.data?.context ||
							selectedContext?.data?.sources?.[0],
						],
					};
					if (selectedContext?.data?.messageId) {
						payload.contextParams = {
							messageId: selectedContext?.data?.messageId,
						};
					}
					/*writing especially for botAgent, will remove this once search session api gives the context data, when we click on askFollowup after bot completion */
					if (selectedContext?.data?.sessionId) {
						payload.context.sessionId =
							selectedContext?.data?.sessionId;
					}
				} else {
					// when setted context is an attachment
					payload.context = {
						sessionId: selectedContext?.data?.sessionId,
					};
				}
			}
		}

    if(arg?.from === 'mcpAgent'){
      delete payload.context
    }
    if(state?.enableDebugging){
      console.log("custom data payload in chat interface line no 206", payload.customData)
    }

		const Res = await store.dispatch(advanceSearch({ params, payload, userId: state?.profile?.data?.id, multiIntentExecution: arg?.multiIntentExecution }))

    if(state?.enableDebugging){
      console.log("payload in chat interface line no 210", payload)
    }
		/*
	  below condition triggers when templatetype is gpt_form_template and user doesnt have any input fields to enter, so application needs to make advancesearch api call with {} formData, as per EVA
	  */
    /* the response actually used for this turn — returned to the caller below */
    let settledRes = Res
    if (Res?.payload?.templateType === "gpt_form_template" && Res?.payload?.content?.formFields?.inputFields?.length === 0){
      delete payload.context
      payload.formData = {}
      const newRes = await store.dispatch(advanceSearch({ params, payload, userId: state?.profile?.data?.id }))
      settledRes = newRes
      constructQuestionPostCall(newRes, qId)
    }else{
      constructQuestionPostCall(Res, qId)
    }

    if(arg?.callback) {
      arg.callback()
    }
    resIndexRef = 0
    /*
    Returned so callers that need the server's identifiers for this turn
    (boardId / messageId) can read them — e.g. a notification postback stamps
    the created thread back onto the notification. Existing callers ignore it.
    */
    return settledRes
	}

    const invokeGptAgentTemplate = (arg) => {
      const item = arg.item
      if (!item?.templateInfo?.suggestions?.[0]?.comingSoon) {
          let payload = {};
          let context =  arg?.item?.context
          /*for autonomous agent, the context should contain only sources */
          if(item?.context?.agentType === "aAAgent"){
            let _sources = cloneDeep(item?.sources)
            _sources[0].isAgent = true
            payload.context = { "sources": _sources, type:"commonAgent"}
          }else{
            payload.context = { ...context, "sources": item?.sources }
          }          
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

    const enableContextByFollowupContext = (payload) => {
      store.dispatch(setEnableContextByFollowupContext(payload))
    }

    const storeCustomData = (payload) => {
      store.dispatch(setCustomData(payload))
    }

    const getCustomData = () => {
      if(state?.enableDebugging){
        console.log("custom data in chat interface line 267", state.customData)
        console.log("custom data in chat interface line 268", state.customData)
      }
      return state.customData;
    }

    const contentStreaming = (detail) => {
      // if contentStreaming set to false by client than it will not stream the content
      if(state.chatInterfaceOptions?.contentStreaming === false) return;

      /*route the event to its owner thread: visible chat or background partition*/
      const { ownerThreadKey, isForeground, sourceQuestions } = resolveStreamTarget(state, detail?.data?.reqId);

      // questionsRef.current - because questions state updates not coming in eventBuzz
      const questions = cloneDeep(sourceQuestions);
      if(Object.keys(questions).length === 0) {
        return;
      }
      /*when resuming the conversation from history, the history data is structured using uuid, so using redId, we can extract the question to be resumed, so need to target the id, present in question with the help of reqId */
      /*function to check the questions are from history */
      const isHistoryAccessed = checkHistoryAccessed(questions)
      let reqId = detail?.data?.reqId
      if(isHistoryAccessed){
        /*function to fetch the questio id based on the  requestId*/
        reqId = Object.entries(questions).find(([key, value]) => value?.reqId === detail?.data?.reqId)?.[0]
      }
      let question = cloneDeep(questions[reqId])
      if(!question){
        /*check whether the question is a task, by looping over existing questions and checking the reqId*/
        question = Object.values(questions)?.find(ques => ques.reqId === detail?.data?.reqId)
        /*as we dont find any question for the reqId, checking for a match in agentic flow executionPipleline */
        if(question){
          /*as we have found a match in agentic flow, so its messageId is the one we should target as questions object for agenticFlow is architected using messageId */
          reqId = question?.id || question?._id
        }
      }

      if(['error', 'terminated', 'completed'].includes(question?.status)){        
        return;
      }

      if (question?.apiSuccess && question?.viewType !== "threadView") return; // Means adv search call success now no need to take socket updates, added condition for threadView

      if (detail?.data?.status === 'in-progress') {

        if (detail?.data?.templateType === 'multi_responses') {
          const resIndex = detail?.data?.respId


          if (!question.hasOwnProperty('responses')) {
            question.responses = []
          }
          if (!question?.responses?.[resIndex]) {
            question.responses[resIndex] = { answer: '' }
          }

          question.responses[resIndex].answer = question?.responses?.[resIndex]?.answer?.concat(detail?.data?.chunk)

          if (resIndexRef !== resIndex) {
            question.responses[resIndexRef].status = 'completed'
          }

          // One old index for comparing
          resIndexRef = resIndex;

        } else {
          /*adding streaming for autonomous agent */
          if(question?.viewType === "threadView"){
            /*while autonomous agent is streaming, need to add the chunked data to the outputId present in botConversation */
            if(!question?.botConversation) {
              question.botConversation = {}
            }
            if(detail?.data?.outputMessageId) {
              if(Object.values(question.botConversation)?.find(conv => conv?.outputMessageId === detail?.data?.outputMessageId)){
                delete question?.botConversation?.[detail?.data?.outputMessageId]                                
              }else{
                question.botConversation[detail?.data?.outputMessageId] = {                    
                        question: (question?.botConversation?.[detail?.data?.outputMessageId]?.question || "").concat(detail?.data?.chunk),
                        status: detail?.data?.status,
                        templateType: detail?.data?.templateType,
                        "thoughts": question.botConversation[detail?.data?.outputMessageId]?.thoughts || [],
                    }
              }
              questions[reqId] = question
              writeStreamQuestions(isForeground, ownerThreadKey, questions)
              return;               
            }
            
          }
          try{
            question.answer = question?.answer?.concat(detail?.data?.chunk)
          }catch(error){
            console.error("error in concatenating the answer", error, `details are ${reqId} questions are ${questions}`)
          }
          
        }

        question.templateType = detail?.data?.templateType || "search_answer"
        question.streamingStatus = 'in-progress'

        if (question?.loading) {
          delete question?.loading
        }
        
        questions[reqId] = question
        writeStreamQuestions(isForeground, ownerThreadKey, questions)
      }

      if (detail?.data?.status === 'completed' || detail?.data?.status === 'aborted') {
        question.streamingStatus = detail?.data?.status // 'completed' or 'aborted'
        question.apiSuccess = true // apiSuccess is set to true when the advanceSearchApi is completed and also once the streaming is turned to completed
        question.status = detail?.data?.status
        const questions = cloneDeep(sourceQuestions)
        questions[reqId] = question
        console.log(`apiStatus of the question ${reqId} is ${question?.apiSuccess}`)
        writeStreamQuestions(isForeground, ownerThreadKey, questions)

        resIndexRef = 0

        // setTimeout(() => {
        //   let dottt = document.querySelector('.dottt')
        //   if (dottt) {
        //     document.querySelector('.dottt').remove()
        //   }
        // }, 250);
      }
    }

    const agentThoughts = (detail) => {
      /*route the event to its owner thread: visible chat or background partition*/
      const { ownerThreadKey, isForeground, sourceQuestions } = resolveStreamTarget(state, detail?.data?.reqId);
      let _questions = cloneDeep(sourceQuestions)
      let reqId = detail?.data?.reqId
      if(isEmpty(_questions[reqId])){
        return;
      }
      /*when resuming the conversation from history, the history data is structured using uuid, so using redId, we can extract the question to be resumed, so need to target the id, present in question with the help of reqId */
      const isHistoryAccessed = checkHistoryAccessed(_questions)
      if(isHistoryAccessed){
        reqId = Object.entries(_questions).find(([key, value]) => value?.reqId === detail?.data?.reqId)?.[0]
      }
      let currentQuestion = _questions[reqId]
      if(['error', 'terminated', 'completed'].includes(currentQuestion?.status)){
        return;
      }
      if(state?.enableDebugging){
        console.log("currentQuestion in agent thoughts function before thoughts", currentQuestion)
      }
      if(currentQuestion.viewType === 'threadView'){
        if(detail?.data?.answerMeta?.hasOwnProperty('messageId')) {
          currentQuestion = {...currentQuestion, ...detail?.data?.answerMeta}      
          currentQuestion.botConversation = {}  
        }
        /*we have to create botConversation with the outputMessageId add thoughts to it, once the advanceSearchApi is completed, need to replace that outputMessageId with the response of advSearch API */
        if(detail?.data?.answerMeta?.hasOwnProperty('outputMessageId')){
          if(!currentQuestion?.botConversation) {
                currentQuestion.botConversation = {}
          }
          currentQuestion.botConversation[detail?.data?.answerMeta?.outputMessageId] = {
              "suggestion":detail?.data?.suggestion,
              "thoughts":detail?.data?.answerMeta?.thoughts,
              "templateType": detail?.data?.templateType || "search_answer",
          }
        }  
      }else{
        if(detail?.data?.answerMeta?.viewType === 'reasoningView' || detail?.data?.answerMeta?.thoughtViewType === 'reasoningView'){
          currentQuestion = {...currentQuestion, ...detail?.data?.answerMeta, thoughtViewType: 'reasoningView', thoughts:getThoghtsWhileStreaming(detail?.data?.answerMeta, currentQuestion?.thoughts)} 
        }else{
        currentQuestion = {...currentQuestion, ...detail?.data?.answerMeta} 
        }     
      }
      if(state?.enableDebugging){
        console.log("currentQuestion in agent thoughts function before thoughts", currentQuestion)
      }              
      _questions[reqId] = currentQuestion      
      writeStreamQuestions(isForeground, ownerThreadKey, _questions)
      if(state?.enableDebugging){
        console.log("currentQuestion in agent thoughts function after thoughts", currentQuestion)
      }
    }

    const getThoghtsWhileStreaming = (answerMeta, thoughts) => {
      if(!thoughts){
          return [answerMeta?.thought];
      }
      /*find out the though inside thoughts using toolCallId */
      const thoughtIndex = thoughts.findIndex(t => t?.toolCallId === answerMeta?.thought?.toolCallId);
      if(thoughtIndex !== -1){
        thoughts[thoughtIndex].state = answerMeta?.thought?.state;
          if(answerMeta?.thought?.state === 'in-progress'){
              try{
                  thoughts[thoughtIndex][answerMeta?.thought?.streamType] = thoughts[thoughtIndex][answerMeta?.thought?.streamType]?.concat(answerMeta?.thought?.[answerMeta?.thought?.streamType]) || answerMeta?.thought?.[answerMeta?.thought?.streamType];                  
              }catch(error){
                  console.error("error", error)
              }
          }   
          if(answerMeta?.thought?.state === 'completed'){
            if(state?.enableDebugging){
              console.log(`the thought ${answerMeta?.thought?.toolCallId} is completed`)
            }
            thoughts[thoughtIndex].state = answerMeta?.thought?.state;
          }
      }else{
          thoughts.push(answerMeta?.thought);
      }
      return thoughts;
  }

    const options = (_options) => {
      const chatOptions = cloneDeep(state.chatInterfaceOptions)
      store.dispatch(setChatInterfaceOptions({...chatOptions, ..._options}))
    }

    const clearErrorState = () => {
      // The current function can be used to clear all the error states that are stored whenever an API call fails.
      store.dispatch(setErrorState([]))
    }

    const storeUserSelectedLLMModel = (model) => {
      store.dispatch(setUserSelectedLLMModel(model))
    }

    /**
     * Sends a message to either a bot conversation or initiates a regular chat message
     * 
     * @param {Object} question - The question object containing conversation details
     * @param {Object} conversation - The conversation object containing message details
     * @param {string} input - The user's input message to be sent
     * 
     * @description
     * This function handles two types of message sending:
     * 1. Bot Conversation: If the question has botConversation flag set, it sends the message
     *    to the bot conversation system with the required context and identifiers
     * 2. Regular Chat: If not a bot conversation, it uses the standard sendMessageAction
     *    to process the message through the regular chat flow
     */
    const sendMessage = (input, question) => {
      // Check if this is a bot conversation
      if(question?.botConversation) {
        // Get the conversation which is in-progress
      const conversation = Object.values(question?.botConversation)?.find(c => c?.status === 'in-progress')

        // Prepare payload for bot conversation
        const payload = {
          "cId": question?.cId || question?.reqId, // Use conversation ID or request ID
          "input": input, // User's input message
          "context": question?.context, // Conversation context
          "messageId": conversation?.messageId, // Message identifier
        }
        // Submit the response to the bot conversation system
        BotConversation().submitBotResponse(payload)
      } else {
        // Handle as a regular chat message
        sendMessageAction(input)
      }
    }

    const fetchSignedMediaURL = async ({ msgId, fileId, source }) => {
      const userId = store.getState().global?.profile?.data?.id;
      // aAAgent sources have sourceFileId; regular sources use docId/fileId/contentId
      const resolvedFileId = source?.sourceFileId
        ? source.sourceFileId
        : (source?.docId || source?.fileId || source?.contentId || fileId);
      if (!userId || !msgId || !resolvedFileId) {
        return { error: true, message: "Missing required params: userId, msgId, or fileId" };
      }
      try {
        const result = await store.dispatch(getSignedMediaURL({ userId, msgId, fileId: resolvedFileId })).unwrap();
        return result;
      } catch(error) {
        return { error: true, message: error?.errors?.[0]?.msg || "Unable to fetch signed media URL" };
      }
    };

    const setAgentContext = (agent) => {
      const agentDetails = {
			name: agent?.name,
			docId: agent?.id,
			source: agent?.id,
			title: agent?.name,
			icon: agent?.icon,
			isAgent: true,
		};
		sessionItemHandler({
			item: agentDetails,
			invokeAgent: true,
			type: "agent",
      })
    }

    const addFileToAutonomousAgent = async ({ fileId, messageId, advanceSearchRes, fileName, fileExtension }) => {
      const boardId = store.getState().global?.activeBoardId;
      const currentQuestion = store.getState().global?.currentQuestion;
      const resolveMessageId = (q) => {
        if (!q?.session) return null;
        return q.session.isFirstMsg ? q.messageId : q.session.fMsgId;
      };
      const resolvedMessageId = messageId
        || resolveMessageId(advanceSearchRes)
        || resolveMessageId(currentQuestion);
      if (!fileId) {
        return { error: true, message: "Missing required params: fileId" };
      }
      if (!resolvedMessageId) {
        return { error: true, message: "Unable to resolve messageId. Provide messageId or advanceSearchRes" };
      }
      try {
        const result = await store
          .dispatch(addFileToAutonomousAgentAction({ boardId, messageId: resolvedMessageId, fileId }))
          .unwrap();
        if (fileName) {
          const rawExt = fileExtension || '';
          agentFilesRegistry.add({
            fileId,
            title: fileName,
            fileName,
            extension: rawExt.replace(/^\./, '').toLowerCase(),
            extName: rawExt.replace(/^\./, '').toLowerCase(),
            source: 'attachment',
          });
        }
        return result;
      } catch (error) {
        return { error: true, message: error?.errors?.[0]?.msg || "Unable to add file to autonomous agent" };
      }
    }

    const removeFileFromAutonomousAgent = async ({ fileIds, messageId }) => {
      const boardId = store.getState().global?.activeBoardId;
      const normalizedFileIds = Array.isArray(fileIds) ? fileIds : (fileIds ? [fileIds] : []);
      if (normalizedFileIds.length === 0) {
        return { error: true, message: "Missing required params: fileIds" };
      }
      if (!messageId) {
        return { error: true, message: "Missing required params: messageId" };
      }
      try {
        const result = await store
          .dispatch(removeFileFromAutonomousAgentAction({ boardId, messageId, fileIds: normalizedFileIds }))
          .unwrap();
        return result;
      } catch (error) {
        return { error: true, message: error?.errors?.[0]?.msg || "Unable to remove file from autonomous agent" };
      }
    }

    /**
     * Returns the user question text for a turn (markdown / plain as stored). Reads from the Redux store.
     * Pass the server `messageId`. For `threadView`, the id is resolved inside that question's `botConversation`.
     * @param {string} messageId
     * @returns {string} Question string, or empty string if not found.
     */
    const copyQuestion = (messageId) => {
      const resolved = resolveMessageForCopy(messageId);
      if (!resolved) return "";

      const { parent, botMessage } = resolved;
      if (botMessage) {
        const raw =
          botMessage.question ??
          botMessage.content ??
          botMessage.input ??
          "";
        return normalizeCopyNewlines(raw);
      }
      return normalizeCopyNewlines(parent?.question ?? "");
    };

    const updateQuestionWithAgentContext = (messageId, agentContext) => {
      const questions = cloneDeep(store.getState().global?.questions)
      /*get the question using the messageId */
      const qId = Object.values(questions).find(question => question?.messageId === messageId)?.reqId
      if(!qId){
        return { error: true, message: "Question not found" };
      }
      questions[qId] = {
        ...questions[qId],
        agentContext: agentContext
      }        
      store.dispatch(updateChatData(questions))
      if(state?.enableDebugging){
        console.log("after updating question with agentContext, questions[qId], questions", questions[qId], questions)
      }
      return questions[qId];      
    }

    /**
     * Returns the assistant answer markdown/text as stored (escaped `\\n` normalized like Kora-React copy).
     * Reads from the Redux store. Pass the server `messageId`. For `threadView`, resolves via `botConversation`.
     * For `multi_responses`, non-empty `responses[].answer` values are joined with blank lines.
     * @param {string} messageId
     * @returns {string} Answer string, or empty string if not found.
     */
    const copyAnswer = (messageId) => {
      const resolved = resolveMessageForCopy(messageId);
      if (!resolved) return "";

      const { parent, botMessage } = resolved;
      if (botMessage) {
        const raw =
          botMessage.answer ??
          botMessage.content ??
          "";
        return normalizeCopyNewlines(raw);
      }

      let raw = parent?.answer;
      if (raw == null || raw === "") {
        raw = buildMultiResponseAnswer(parent);
      }
      return normalizeCopyNewlines(raw ?? "");
    };

    const appendAnswerContext = (detail) => {
      /*route the event to its owner thread: visible chat or background partition*/
      const { ownerThreadKey, isForeground, sourceQuestions } = resolveStreamTarget(store.getState().global, detail?.data?.reqId);
      let _questions = cloneDeep(sourceQuestions)
      let reqId = detail?.data?.reqId
      if(isEmpty(_questions[reqId])){
        return;
      }
      /*a settled turn must not be reopened by a late socket event - same guard contentStreaming and agentThoughts apply*/
      if(['error', 'terminated', 'completed'].includes(_questions[reqId]?.status)){
        return;
      }
      _questions[reqId] = {..._questions[reqId], ...detail?.data?.answerMeta}      
      writeStreamQuestions(isForeground, ownerThreadKey, _questions)
      if(state?.enableDebugging){
        console.log("after appending answerContext, _questions[reqId], _questions", _questions[reqId], _questions)
      }
    }

    const onAttachmentChipClick = (callback) => {
      if (typeof callback !== 'function') return () => {};
      _attachmentChipCallbacks.add(callback);
      return () => _attachmentChipCallbacks.delete(callback);
    };

    return {
        subscribe,
        sendMessageAction,
        initiateChatConversationAction,
        cancelMessageReqAction,
        invokeGptAgentTemplate,
        askQuickActions,
        enableCustomTemplate,
        storeCustomData,
        getCustomData,
        contentStreaming,
        agentThoughts,
        options,
        enableContextByFollowupContext,
        clearErrorState,
        sendMessage,
        setAgentContext,
        stopBotAnswer,
        fetchSignedMediaURL,
        addFileToAutonomousAgent,
        removeFileFromAutonomousAgent,
        onAttachmentChipClick,
        storeUserSelectedLLMModel,
        copyQuestion,
        copyAnswer,
        appendAnswerContext
    }
}

export default ChatInterface;