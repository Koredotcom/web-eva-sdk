import { v4 as uuid } from 'uuid';
import { updateChatData, setActiveBoardId, setCurrentQuestion } from '../redux/globalSlice';
import store from '../redux/store';
import { cloneDeep } from 'lodash';
import constructGptForm from './gptTemplate/gptTemplateBody';
import gptFormFunctionality from './gptTemplate/gptTemplateFunc';
import { getCidByMessageId } from '../utils/helpers';

export const constructQuestionInitial = (args) => {
    let uniqueMsgId;
    const questions = cloneDeep(store.getState().global.questions)

    if(args?.replaceExistingQsn){
        uniqueMsgId = getCidByMessageId(questions, args?.messageId)
    }else{
        uniqueMsgId = uuid();
    }
    
    let question = args?.question
    let obj = {
        cId: uniqueMsgId,
        question,
        answer: "",
        loading: true,
        type: "search",
        reqId: args?.reqId
    }

    questions[uniqueMsgId] = obj

    store.dispatch(updateChatData(questions))
    store.dispatch(setCurrentQuestion(obj))

    return uniqueMsgId
}

export const constructQuestionPostCall = (data, qId) => {

    // data.payload = contains api response
    // data.meta.arg = contains passed params and payload

    const state = store.getState().global
    const questions = cloneDeep(state.questions)
    const activeBoardId = state.activeBoardId

    // let followupFromSuggestionModal = data?.params?.suggestionContext;
    let question = questions?.[qId]
    delete question?.loading;


    if(data?.payload?.history?.status !== 'terminated' && data?.payload?.templateType === 'gpt_form_template') {
        const gptFormConstructedData = constructGptForm(data?.payload)
        // constructGptForm(data?.payload)
        question.template_html = gptFormConstructedData.outerHTML
        setTimeout(() => {
            gptFormFunctionality(data?.payload);
        }, 1000);
    
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
        // question = { ...question, error: data?.error, errInfo: data?.errInfo};
        // if(data?.errInfo?.errors[0]?.code === 'MaximumPointsExceeded'){
        //     _limitExhausted = data?.errInfo?.errors[0]
        // }
    }
    else if(data?.params?.multiIntentExecution) {
        // const stepIndex = question?.stepIndex;
        // question = { ...question, ...data?.res, showResponse: true};
        // updatedQuestions[question?.parentMsgId].executingActionId = question?.id
        // if(stepIndex === 0) {
        //     updatedQuestions[question?.parentMsgId].status = 'in-progress'
        // }
    }
    else if(data?.payload?.history?.status === 'terminated'){
        question = { ...question, ...data?.payload?.history};
    }
    else {
        question = { ...question, ...data?.payload};
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
    // if (data?.res?.thread) {
    //     //rename the answer to question and include botConversation object.
    //     // question.question = data?.res?.thread?.previousMessage?.question

    //     if (!question?.botConversation) {
    //         question.botConversation = {}
    //         data?.res?.thread?.messages?.map(message => {
    //             question.botConversation[message?.messageId] = message
    //         })
    //         question.collapseBotConversation = false
    //         updateState({
    //             isBotRunning: true
    //         })
    //         console.log("is bot running", isBotRunning)
    //     }
    //     if (data?.res?.thread && data?.res?.thread?.nextMessages && data?.res?.thread?.nextMessages?.length) {
    //         question = updatedQuestions?.[currentQuestion]
    //         question.botConversation[data?.res?.messageId].status = data?.res?.status
    //         question.botConversation[data?.res?.messageId].answer = data?.res?.answer
    //         data?.res?.thread?.nextMessages?.map(message => {
    //             question.botConversation[message?.messageId] = message
    //         })
    //         if (data?.res?.thread?.nextMessages[0]?.status === "completed" && data?.res?.thread?.parentMessage?.status === "completed") {
    //             question.parentMessage = data?.res?.thread?.parentMessage
    //             question.collapseBotConversation = true
    //             updateState({
    //                 isBotRunning: false
    //             })
    //         }
    //     }
    //     question.question = data?.res?.question
    // }

    // if(data?.res?.viewType === "threadView"){
    //     if(!question.hasOwnProperty("botConversation")){
    //         question.parentMessage = data.res  
    //         question.botConversation = {}
    //         updateState({
    //             isBotRunning: true
    //         })
    //     }
    // }

    questions[qId] = question;

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

    if(!activeBoardId) {
        if(data?.payload?.history?.status === 'terminated'){    
            store.dispatch(setActiveBoardId(data?.payload?.history?.bId))
        }else{
            store.dispatch(setActiveBoardId(data?.payload?.boardId))
        } 
    }
    store.dispatch(updateChatData(questions))

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
