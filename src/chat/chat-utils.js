import { v4 as uuid } from 'uuid';
import { updateChatData, setActiveBoardId, setCurrentQuestion, setSelectedContext, setErrorState, setAllHistory, setQuickActions, setActiveThreadKey, setBoardQuestions, migrateThreadKey, markThreadGenerationStart, markThreadGenerationSettled, removeThreadPartition } from '../redux/globalSlice';
import { registerRequestThread, resolveRequestThread, migrateRequestThread, releaseRequestThread, threadHasActiveRequests, isTempThreadKey } from './threadRegistry';
import store from '../redux/store';
import { cloneDeep, isEmpty } from 'lodash';
import constructGptForm from './gptTemplate/gptTemplateBody';
import gptFormFunctionality from './gptTemplate/gptTemplateFunc';
import { getCidByMessageId, generateShortUUID } from '../utils/helpers';
import AnswerFromChip from './AnswerFromChip';
import { chatTemplateTypes, msgStatus } from '../utils/constants';
import MultiResponse from './gptTemplate/MultiResponse';
import moment from "moment";
import { fetchHistory, advanceSearch } from "../redux/actions/global.action";
import MultiIntentExecution from '../multiIntentExecution/multiIntentExecution';
import ChatInterface from './ChatInterface';

const _pendingAgentFiles = [];
export const agentFilesRegistry = {
    add: (file) => { _pendingAgentFiles.push(file); },
    getAll: () => [..._pendingAgentFiles],
    clear: () => { _pendingAgentFiles.length = 0; },
};

/**
 * Settle a request's runtime state: drop its reqId from the owner thread's
 * `activeReqIds`, raise the red dot for background completions, and free the
 * partition once the thread has no more in-flight requests (a later open of a
 * settled thread re-fetches fresh data through the history flow).
 */
const settleThreadRequest = ({ threadKey, reqId, background }) => {
    releaseRequestThread(reqId);
    if (!threadKey) return;
    store.dispatch(markThreadGenerationSettled({ threadKey, reqId, background: !!background }));
    if (background && !threadHasActiveRequests(threadKey)) {
        store.dispatch(removeThreadPartition(threadKey));
    }
};

/* Same advance guard runNextTask applies before firing the next task. */
const BLOCKED_TASK_ADVANCE_STATUSES = [undefined, null, '', 'draft', 'in-progress', 'threadRunning'];

/**
 * Background counterpart of the foreground step chain
 * `constructQuestionPostCall -> MultiIntentExecution().runNextTask -> runTask
 * -> InitiateChatConversationAction`. Those are foreground-coupled (they read
 * and write `state.questions` / `activeBoardId`), so a backgrounded agentic
 * flow would stall on its current step. This mirrors the same bookkeeping on
 * the thread's partition copy and dispatches the next step's advanceSearch
 * directly — the flow advances exactly as far as it would have in foreground.
 *
 * Mutates `questions` (the partition copy) in place; the caller dispatches it
 * via setBoardQuestions right after.
 */
const continueBackgroundAgenticFlow = ({ questions, question, ownerThreadKey, settledStatus, fallbackBoardId }) => {
    /* click-gated / still-running steps must not auto-fire the next one */
    if (BLOCKED_TASK_ADVANCE_STATUSES.includes(settledStatus)) return;

    const stepIndex = question?.stepIndex;
    if (!Number.isFinite(stepIndex)) return;

    const parent = questions?.[question?.parentMsgId];
    if (!parent?.executionPipeline?.length) return;

    /* pipeline bookkeeping runTask does on advance: settled step completed;
    whole flow completed once every task is */
    const executionPipeline = cloneDeep(parent.executionPipeline);
    if (executionPipeline[stepIndex]) {
        executionPipeline[stepIndex].status = 'completed';
    }
    const isFlowCompleted = executionPipeline.every(task => task?.status === 'completed');
    questions[question?.parentMsgId] = {
        ...parent,
        executionPipeline,
        status: isFlowCompleted ? 'completed' : (parent?.status || 'in-progress')
    };

    const nextTask = executionPipeline[stepIndex + 1];
    if (isFlowCompleted || !nextTask) return;

    /* next step object — same shape constructQuestionInitial's
    multiIntentExecution branch builds for the foreground dispatch */
    const nextReqId = generateShortUUID();
    questions[nextTask?._id] = {
        ...nextTask,
        stepIndex: stepIndex + 1,
        id: nextTask?._id,
        question: nextTask?.utterance,
        answer: "",
        loading: true,
        type: "search",
        isTask: true,
        parentMsgId: parent?.reqId,
        cId: nextTask?._id,
        reqId: nextReqId,
        showResponse: true
    };

    /*
    Ordering is load-bearing: the next request must be registered BEFORE the
    caller runs settleThreadRequest for the step that just finished. Otherwise
    activeReqIds momentarily empties — the history spinner flickers off, a red
    dot is raised mid-flow, and the partition is garbage-collected while steps
    are still pending. (Also why this path can't reuse the foreground's
    setTimeout(1000) before advancing.)
    */
    registerRequestThread(nextReqId, ownerThreadKey);
    store.dispatch(markThreadGenerationStart({
        threadKey: ownerThreadKey,
        reqId: nextReqId,
        title: nextTask?.utterance
    }));

    /*
    Dispatch advanceSearch directly instead of routing through runTask /
    InitiateChatConversationAction, which would inject this flow's steps into
    whatever chat is currently on screen. Params/payload mirror exactly what
    runTask -> initiateChatConversationAction sends for a step. The settle
    re-enters constructQuestionPostCall, so steps N+2, N+3, … chain through
    this same helper (or hand back to the foreground path if the user reopens
    the thread in the meantime).
    */
    const boardId = parent?.boardId
        || fallbackBoardId
        || (!isTempThreadKey(ownerThreadKey) ? ownerThreadKey : undefined);
    store.dispatch(advanceSearch({
        params: { reqId: nextReqId },
        payload: {
            question: nextTask?.utterance,
            boardId,
            parentId: parent?.messageId,
            context: {
                intentId: nextTask?.intents?.[0]?.id,
                agentId: nextTask?.intents?.[0]?.agentId,
                stepId: nextTask?._id
            }
        },
        userId: store.getState().global?.profile?.data?.id,
        multiIntentExecution: true
    })).then((res) => constructQuestionPostCall(res, nextTask?._id));
};

export const constructQuestionInitial = (args) => {
	let uniqueMsgId = args?.reqId;
	const questions = cloneDeep(store.getState().global.questions);

	if (args?.replaceExistingQsn && !args?.reqId) {
		uniqueMsgId = getCidByMessageId(questions, args?.messageId);
	}

	const activeBoardId = store.getState().global.activeBoardId;

	let question = args?.question;

	let obj = {};

	let isTask = questions[args?.reqId]?.isTask;
	let stepIndex = isTask ? questions[args?.reqId]?.stepIndex : null;

	if(args?.multiIntentExecution){

		obj = {
			...args?.task,
			id: args?.stepId,
			question: args?.task?.utterance,
			answer: "",
			loading: true,
			type: "search",
			isTask: true,
            parentMsgId: args?.parentMsgId,
			cId: args?.stepId,
			reqId: args?.reqId,
			showResponse: true,
		}

		questions[args?.stepId] = obj;
		uniqueMsgId = args?.stepId;
		
	}
	else if(isTask){
		obj = {
			cId: uniqueMsgId,
			question,
			answer: "",
			loading: true,
			type: "search",
			reqId: uniqueMsgId,
			showResponse: true,
			isTask: true,
            parentMsgId: args?.parentMsgId,
			isMultiIntentExecution: true,
			stepIndex: stepIndex,
		};

		questions[uniqueMsgId] = obj;
	}
	else{
		const selectedContextSources = store.getState().global.selectedContext?.data?.sources;
		const attachmentSources = selectedContextSources?.filter((s) => s?.source === 'attachment') || [];
		const agentPendingFiles = agentFilesRegistry.getAll();
		agentFilesRegistry.clear();
		const allContextSources = [...attachmentSources, ...agentPendingFiles];

		obj = {
			cId: uniqueMsgId,
			question,
			answer: "",
			loading: true,
			type: "search",
			reqId: uniqueMsgId,
			...(allContextSources.length > 0 ? { context: { sources: allContextSources } } : {}),
		};

		questions[uniqueMsgId] = obj;
	}

	/*
	Multi-thread: resolve the thread this request belongs to and register
	per-request ownership so async callbacks (settle, socket streaming) can
	route to the right thread even after the user navigates away.
	A boardless new chat uses the first question's reqId (already
	`#`-prefixed) as its temp thread key until the server returns a boardId.
	*/
	let threadKey = store.getState().global.activeThreadKey || activeBoardId || uniqueMsgId;
	if (store.getState().global.activeThreadKey !== threadKey) {
		store.dispatch(setActiveThreadKey(threadKey));
	}
	const requestReqId = args?.reqId || uniqueMsgId;
	registerRequestThread(requestReqId, threadKey);
	store.dispatch(markThreadGenerationStart({
		threadKey,
		reqId: requestReqId,
		title: question || args?.task?.utterance
	}));

	store.dispatch(updateChatData(questions));
	store.dispatch(setCurrentQuestion(obj));

	// if (!activeBoardId) {
	// 	let arr = store.getState().global?.history?.data?.boards || [];
	// 	let threadObj = {
	// 		createdOn: moment().valueOf(),
	// 		name: "loader",
	// 		loading: true,
	// 	};
	// 	store.dispatch(
	// 		setAllHistory({
	// 			...store.getState().global?.AllHistory,
	// 			data: [threadObj, ...arr],
	// 		})
	// 	);
	// }

	return uniqueMsgId;
};

export const constructQuestionPostCall = async (data, qId) => {
    const enableDebugging = store.getState().global?.enableDebugging;

    // data.payload = contains api response
    // data.meta.arg = contains passed params and payload

    const state = store.getState().global

    /*
    Multi-thread routing: resolve which thread this response belongs to at
    settle time. Foreground (owner is the thread on screen) behaves exactly
    as before. Background (user navigated away mid-generation) merges into
    that thread's partition and raises the red-dot indicator, and must never
    touch the visible chat or steal focus (no setActiveBoardId /
    setCurrentQuestion / context / quick-action dispatches).
    */
    const requestReqId = data?.meta?.arg?.params?.reqId || data?.meta?.arg?.reqId || data?.meta?.arg?.params?.id
    const ownerThreadKey = resolveRequestThread(requestReqId) || state.activeThreadKey
    const isForeground = !ownerThreadKey || ownerThreadKey === state.activeThreadKey

    const questions = isForeground ? cloneDeep(state.questions) : cloneDeep(state.questionsByBoard?.[ownerThreadKey] || {})
    const activeBoardId = state.activeBoardId

    if(data?.payload?.cancelled || Object.keys(questions).length === 0) {
        settleThreadRequest({ threadKey: ownerThreadKey, reqId: requestReqId, background: !isForeground && !data?.payload?.cancelled })
        return;
    }

    // let followupFromSuggestionModal = data?.params?.suggestionContext;
    let question = questions?.[qId]
    delete question?.loading;

	if (isForeground && !activeBoardId) {
		store.dispatch(
            fetchHistory({ deleteLoader: true, params: { limit: 1 } })
		);
	}
    if(state.enabledCustomTemplates?.[data?.payload?.templateType]) {
        if(data?.payload?.templateType === chatTemplateTypes.GPT_FORM_TEMPLATE) {
            let multiResponseData = MultiResponse().getInitialFormData(data?.payload)
            question.gpt_forms = multiResponseData
        }
        // If custom template enabled for this data?.payload?.templateType template type
    } else {
        // DEFAULT GPT FORM TEMPLATE
        if(data?.payload?.history?.status !== msgStatus.TERMINATED && data?.payload?.templateType === chatTemplateTypes.GPT_FORM_TEMPLATE) {
            let multiResponseData = MultiResponse().getInitialFormData(data?.payload);
            question.gpt_forms = multiResponseData;
            const gptFormConstructedData = constructGptForm(multiResponseData, data?.payload)
			// question.template_html = gptFormConstructedData.outerHTML;
			// setTimeout(() => {
			// 	gptFormFunctionality(multiResponseData, data?.payload);
			// }, 1000);
		}
	}

    if (data?.payload?.templateType === chatTemplateTypes.SEARCH_ANSWER || data?.payload?.templateType === chatTemplateTypes.SEARCH_RESULTS) {
		if (data?.payload?.sources?.length > 0 ){
			// const ansFromChipData = AnswerFromChip({item: data?.payload });
			// question.answerFrom_html = ansFromChipData.outerHTML;
			// setTimeout(() => {
			//     MenuOptions(data?.payload)
			// }, 1000);
		}
		if (Object.values(data?.payload?.thread || {})?.length > 0) {
			if (!question?.botConversation) {
				question.botConversation = {};
				question.parentMessage = data?.payload;
				data?.payload?.thread?.messages?.map((message) => {
					question.botConversation[message?.messageId] = message;
				});
			} else {
				if (data?.payload?.thread?.nextMessages?.length) {
					// question = updatedQuestions?.[currentQuestion]
					question.botConversation[data?.payload?.messageId].status =
						data?.payload?.status;
					question.botConversation[data?.payload?.messageId].answer =
						data?.payload?.answer;
					data?.payload?.thread?.nextMessages?.map((message) => {
						question.botConversation[message?.messageId] = message;
					});
					if (
						data?.payload?.thread?.parentMessage?.status ===
						"completed"
					) {
						question.parentMessage =
							data?.payload?.thread?.parentMessage;
						question.status = "completed";
						// question.collapseBotConversation = true
						// updateState({
						//     isBotRunning: false
						// })
					}
				}
			}
		}
        /*Clearing the selected context when search results are received */
        if (isForeground && state.autoRemoveWebSearchFromContext) {
            store.dispatch(setSelectedContext(null))
        }
	}

    if(data?.payload?.queryExhaustionInfo?.queryLimitExhausted){
        question.queryExhaustionInfo = data?.payload?.queryExhaustionInfo
        if (isForeground) {
            store.dispatch(setErrorState(data?.payload?.queryExhaustionInfo))
        }
    }

	if (isForeground) {
		if(data?.payload?.quickactions){
			store.dispatch(setQuickActions(data?.payload?.quickactions));
		}else{
			store.dispatch(setQuickActions([]));
		}
	}
    // if(data?.params?.arg?.retry) {
    //     delete question?.error;
    // }

    // if (data?.res?.viewType === "list" || data?.res?.viewType === "table") {
    //     question.showData = true
    //     {showSearchResults && props?.setRelevantQuestions(false)}
    // }

    //for email
    // if(data?.res?.templateType === "action_send_email" && data?.res?.status === "draft") {    
    //     let obj = {
    //         canIncludeSource: data?.res?.canIncludeSource,
    //         emailData: emailData(question, data?.res)
    //     }
    //     question = {...question, ...obj}
    // }

    //for slack and msTeams 
    // if((data?.res?.templateType === "action_send_slack_message" || data?.res?.templateType === "action_send_teams_message" || data?.res?.templateType === "action_send_msteams_message") && data?.res?.status === "draft") {    
    //     question = {...question, ...{externalIntegrationAction : true, skills: `${data?.res?.templateType === "action_send_teams_message" || data?.res?.templateType === "action_send_msteams_message" ? "msteams" : "slack"}`}}
    // }

    // if(data?.res?.templateType === 'resolve_ambiguity' || data?.res?.templateType === 'intent_ambiguity'){
    //     setAmbiguityState(true)
    // }

    //Query Limit Exhaustion Pop-up
    // let _limitExhausted;
    // if(data?.res?.queryExhaustionInfo?.queryLimitExhausted){
    //     _limitExhausted = data?.res?.queryExhaustionInfo
    // }

    // Kiaas form
    // if(data?.res?.templateType === "bulk_action") {
    //     let formFields = {}
    //     data.res.content.formFields.map(f => {
    //         formFields[f.formId] = f
    //     })
    //     data.res.formsLength = data.res.content.formFields?.length;
    //     data.res.content.formFields = formFields;
    // }

    // if(data?.res?.templateType === "connection_provider") {
    //     question.params = data?.params
    // }

    if(data?.error) {
        // if (data?.meta?.arg?.multiIntentExecution || question?.isMultiIntentExecution) {
        //     const stepIndex = question?.stepIndex;
        //     question = { ...question, error : true};
        // }
	} else if (data?.meta?.arg?.multiIntentExecution || question?.isMultiIntentExecution) {
		const stepIndex = question?.stepIndex;
		question = { ...question, ...data?.payload, showResponse: true};
		questions[question?.parentMsgId].executingActionId = question?.stepId
		if(stepIndex === 0) {
		    questions[question?.parentMsgId].status = 'in-progress'
		}
		if(question?.isTask && isForeground) {
				const stepIndex = question?.stepIndex;
				setTimeout(() => {
				    MultiIntentExecution().runNextTask(stepIndex, data?.payload?.status , question)
				}, 1000);
		}
	}
    else if(data?.payload?.history?.status === msgStatus.TERMINATED){
        if(data?.payload?.history?.templateType === chatTemplateTypes.GPT_FORM_TEMPLATE){
            delete question.template_html
        }
        let interruptedNote = "I see you interrupted the answer generation. Please feel free to provide more details or let me know how I can assist you further."
        let historyAnswer = data?.payload?.history?.answer
        let terminatedAnswerResponse = historyAnswer ? `${historyAnswer}<br/><br/>${interruptedNote}` : interruptedNote
        question = { ...question,  ...data?.payload?.history, answer : terminatedAnswerResponse};
        if (question?.isTask && isForeground) {
            const stepIndex = question?.stepIndex;
            setTimeout(() => {
                MultiIntentExecution().runNextTask(stepIndex, data?.payload?.history?.status, question)
            }, 1000);
        }
	} 
    else {      
        if(data?.meta?.arg?.params?.from !== "botAgent") {
            question = { ...question, ...data?.payload}; 
        }
                        
    }
   
    // let context;
    // if(data?.res?.context && data?.res?.context?.hasOwnProperty("enable") && !!data?.res?.context?.enable) {
    //     let type = data?.params?.type || data?.res?.context?.type || data?.res?.context?.agentType//this type is required while removing the context that is set
    //     context = {...data?.res?.context, messageId: data?.res.messageId, sources: (!isEmpty(data?.res?.sources) ? data?.res?.sources : data?.res?.context?.sources), viewType: data?.res?.viewType, type: type}
    // } else if(data?.params?.quickActions) {
    //     if(data?.params?.context?.viewType === "table") {
    //         // record level summarise button
    //         context = selectedContext
    //     } else {
    //         context = data?.params?.context
    //     }
    // } else {
    //     context = null
    // }
    // const _selectedContext = {...selectedContext, messageId: data?.res?.messageId };

    //if the response contains thread intiating the bot conversation
    if (data?.payload?.thread) {
        //rename the answer to question and include botConversation object.
        // question.question = data?.res?.thread?.previousMessage?.question
        question = removeOutputMessageId(question, {res: data?.payload})
        if (!question?.botConversation || isEmpty(question?.botConversation)) {
            question.botConversation = {}
            question.parentMessage = data.payload.res
            data?.payload?.thread?.messages?.map(message => {
                question.botConversation[message?.messageId] = message
            })                        
        }
        if (data?.payload?.thread && data?.payload?.thread?.nextMessages && data?.payload?.thread?.nextMessages?.length) {    
            /*when the advancedSearch resolves for autonomous agents, need to remove the botConversation key that is formed using outputMessageId */        
            question.botConversation[data?.payload?.messageId].status = data?.payload?.status
            question.botConversation[data?.payload?.messageId].answer = data?.payload?.answer
            data?.payload?.thread?.nextMessages?.map(message => {
                question.botConversation[message?.messageId] = message
            })
            if (data?.payload?.thread?.parentMessage?.status === "completed") {
                question.status = "completed"                
                question.parentMessage = data?.payload?.thread?.parentMessage
                
            }
        }
        // question.question = data?.res?.question
    }

    if(data?.payload?.viewType === "threadView" && (!data?.payload?.hasOwnProperty('thread'))){
        question = {...question, ...data?.payload}
    }

    /*cancelrequest / closing the botconversation logic, check for the status as completed and viewType as threadView */
    if(data?.payload?.history?.status === msgStatus.COMPLETED && data?.payload?.history?.viewType === "threadView") {
        question = {
            ...question,
            "status": data?.payload?.history?.status,
            "answer": data?.payload?.history?.answer,

        }
    }

    // if(data?.res?.viewType === "threadView"){
    //     if(!question.hasOwnProperty("botConversation")){
    //         question.parentMessage = data.res  
    //         question.botConversation = {}
    //         updateState({
    //             isBotRunning: true
    //         })
    //     }
    // }    

    if(data?.error){
        questions[qId] = {
            ...question,
            error: question?.status !== 'terminated' // Terminated status is when user interrupted the answer generation. Error is when there is a server driven error.
          };
          
    }else if(question?.isTask && question?.status !== 'completed'){
        /*check if the question is botAgent task */
        if(question?.viewType === 'threadView' && !isEmpty(question?.botConversation)){
            question.botConversation[data?.payload?.messageId] = data?.payload;
        }else{
            questions[qId] = {...question, apiSuccess: data?.payload?.status === 'completed'};
        }
    }else{
        questions[qId] = {...question, apiSuccess: data?.payload?.status === 'completed'};
    }

    // updateState({
    //     searchResultData: data?.res,
    //     showError: false,
    //     selectedContext: followupFromSuggestionModal ? _selectedContext : context,
    //     questions: updatedQuestions,
    //     generatingAnswerMsg: null,
    //     showQuickActions: data?.res?.quickactions,
    //     currentMessageId : data?.res?.messageId,
    //     limitExhausted : _limitExhausted,
    //     searchInput: document.getElementById("search-input")?.innerText,
    // }, () => {
    //     scrollBottom(data?.params?.qId)
    // })

    /* The boardId the server assigned/confirmed for this response. */
    const responseBoardId = data?.payload?.history?.status === msgStatus.TERMINATED
        ? data?.payload?.history?.bId
        : (data?.payload?.boardId || data?.payload?.history?.bId)

    /*
    Strict user-owned focus: only a foreground settle may set the active
    board. A background completion must never hijack the thread on screen.
    */
    if(isForeground && !activeBoardId) {
        store.dispatch(setActiveBoardId(responseBoardId))
    }
    if (isForeground && data?.payload?.followUpContext && state.enableContextByFollowupContext) {
        // console.log("data?.payload?.followUpContext", { ...data?.payload?.followUpContext, messageId: data?.payload?.messageId })
        let context = {
            context: data?.payload?.followUpContext,
            messageId: data?.payload?.messageId,
            sources: data?.payload?.sources,
            viewType: data?.payload?.viewType,
            type: "agent",
            'isAgent': true,
            sessionId: data?.payload?.followUpContext?.sessionId,
            followUpContext: true, 
            source: data?.payload?.followUpContext?.source
        }
        store.dispatch(setSelectedContext({data: context}))
    }

    if(isForeground && data?.payload?.agentContext?.sources?.length > 0){
        /*need to call removeFileFromAutonomousAgent action to remove the files from the autonomous agent */
       const removeFileResponse = await ChatInterface().removeFileFromAutonomousAgent({ fileIds: data?.payload?.agentContext?.sources?.map(source => source?.fileId)?.filter(Boolean), messageId: data?.payload?.followUpContext?.fMsgId })
       if(enableDebugging){
       console.log("removeFileResponse", removeFileResponse)
       }
        
    }

    let settledThreadKey = ownerThreadKey

    if (isForeground) {
        store.dispatch(setCurrentQuestion(questions[qId]))
        store.dispatch(updateChatData(questions))
        /* temp -> real reconcile for a brand-new chat that stayed on screen */
        if (isTempThreadKey(ownerThreadKey) && responseBoardId) {
            migrateRequestThread(ownerThreadKey, responseBoardId)
            store.dispatch(migrateThreadKey({ fromKey: ownerThreadKey, toKey: responseBoardId }))
            settledThreadKey = responseBoardId
        }
    } else {
        /*
        Background agentic flow: chain the next step the same way the
        foreground runNextTask call sites above do (gated there on
        `isForeground`). Status selection mirrors those branches — the
        multiIntentExecution branch passes payload.status, the terminated
        branch passes history.status. Must run before setBoardQuestions (it
        mutates `questions`) and before settleThreadRequest below (it
        registers the next step's request).
        */
        const isMieSettle = data?.meta?.arg?.multiIntentExecution || question?.isMultiIntentExecution
        const isTerminatedSettle = data?.payload?.history?.status === msgStatus.TERMINATED
        if (!data?.error && question?.isTask && (isMieSettle || isTerminatedSettle)) {
            continueBackgroundAgenticFlow({
                questions,
                question,
                ownerThreadKey,
                settledStatus: isMieSettle ? data?.payload?.status : data?.payload?.history?.status,
                fallbackBoardId: responseBoardId
            })
        }
        /* background thread: write into its partition only — never the visible chat */
        store.dispatch(setBoardQuestions({ threadKey: ownerThreadKey, questions }))
        /* temp -> real reconcile for a background new chat */
        if (isTempThreadKey(ownerThreadKey) && responseBoardId) {
            migrateRequestThread(ownerThreadKey, responseBoardId)
            store.dispatch(migrateThreadKey({ fromKey: ownerThreadKey, toKey: responseBoardId }))
            settledThreadKey = responseBoardId
            /* pull the newly created board row into the history list so the
            red dot has a real row to attach to */
            store.dispatch(fetchHistory({ deleteLoader: true, params: { limit: 1 } }))
        }
    }

    /* request finished — drop the spinner; red dot only for background settles */
    settleThreadRequest({ threadKey: settledThreadKey, reqId: requestReqId, background: !isForeground })

    // if(question?.isTask) {
    //     setTimeout(() => {
    //         const stepIndex = question?.stepIndex;
    //         props.MultiIntentExecutionRef.current.runNextTask(stepIndex, data?.res?.status)
    //     }, 1000);
    //     setTimeout(() => {
    //         let getEl = document.querySelector('.taskItem.loading')
    //         getEl?.scrollIntoView({ block: "nearest", behavior: 'smooth' });
    //     }, 1500);
    // }
}

const removeOutputMessageId = (question, apiResponse) => {
        /*check for the outputMessageId's present in either messages / nextMessages array of apiResponse
        if found remove it from question.botConversation object
        */
        if(apiResponse?.res?.thread?.messages && apiResponse?.res?.thread?.messages.length > 0){
            apiResponse?.res?.thread?.messages.map(message => {
                if(Object.keys(question?.botConversation)?.length > 0 && question?.botConversation[message?.outputMessageId]) {
                    delete question?.botConversation[message?.outputMessageId]
                }
            })
        }
        if(apiResponse?.res?.thread?.nextMessages && apiResponse?.res?.thread?.nextMessages.length > 0){
            apiResponse?.res?.thread?.nextMessages.map(message => {
                if(Object.keys(question?.botConversation)?.length > 0 && question?.botConversation[message?.outputMessageId]) {
                    delete question?.botConversation[message?.outputMessageId]
                }
            })
        }

        return question;

    }
