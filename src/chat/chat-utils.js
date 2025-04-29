import { v4 as uuid } from 'uuid';
import { updateChatData, setActiveBoardId, setCurrentQuestion, setSelectedContext, setErrorState } from '../redux/globalSlice';
import store from '../redux/store';
import { cloneDeep, isEmpty } from 'lodash';
import constructGptForm from './gptTemplate/gptTemplateBody';
import gptFormFunctionality from './gptTemplate/gptTemplateFunc';
import { getCidByMessageId } from '../utils/helpers';
import AnswerFromChip from './AnswerFromChip';
import { chatTemplateTypes, msgStatus } from '../utils/constants';
import MultiResponse from './gptTemplate/MultiResponse';

export const constructQuestionInitial = (args) => {
    let uniqueMsgId = args?.reqId;
    const questions = cloneDeep(store.getState().global.questions)

    if(args?.replaceExistingQsn){
        uniqueMsgId = getCidByMessageId(questions, args?.messageId)
    }
    
    let question = args?.question
    let obj = {
        cId: uniqueMsgId,
        question,
        answer: "",
        loading: true,
        type: "search",
        reqId: uniqueMsgId
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
            question.template_html = gptFormConstructedData.outerHTML
            setTimeout(() => {
                gptFormFunctionality(multiResponseData, data?.payload);
            }, 1000);
        }
    }

    if((data?.payload?.templateType === chatTemplateTypes.SEARCH_ANSWER) && (isEmpty(data?.payload?.thread))){
        if(data?.payload?.sources?.length > 0 ){
            const ansFromChipData = AnswerFromChip({item : data?.payload})
            question.answerFrom_html = ansFromChipData.outerHTML
            // setTimeout(() => {
            //     MenuOptions(data?.payload)
            // }, 1000);
        }
    }

    if(data?.payload?.queryExhaustionInfo?.queryLimitExhausted){
        question.queryExhaustionInfo = data?.payload?.queryExhaustionInfo;
        store.dispatch(setErrorState(data?.payload?.queryExhaustionInfo))
    }
    
    //for synchronous task
    // if(Object.keys(data?.payload?.thread || {})?.length){
    //         if (!question?.botConversation) {
    //         question.botConversation = {}
    //         data?.payload?.thread?.messages?.map(message => {
    //             question.botConversation[message?.messageId] = message
    //         })            
    //     }
    //     if (data?.payload?.thread && data?.payload?.thread?.nextMessages && data?.payload?.thread?.nextMessages?.length) {            
    //         question.botConversation[data?.payload?.messageId].status = data?.payload?.status
    //         question.botConversation[data?.payload?.messageId].answer = data?.payload?.answer
    //         data?.payload?.thread?.nextMessages?.map(message => {
    //             question.botConversation[message?.messageId] = message
    //         })
    //         if (data?.payload?.thread?.parentMessage?.status === "completed") {
    //             question.parentMessage = data?.payload?.thread?.parentMessage                        
    //         }
    //     }        
    // }

    
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
    else if(data?.payload?.history?.status === msgStatus.TERMINATED){
        if(data?.payload?.history?.templateType === chatTemplateTypes.GPT_FORM_TEMPLATE){
            delete question.template_html
        }
            let terminatedAnswerResponse = "I see you interrupted the answer generation. Please feel free to provide more details or let me know how can I assist you further"
            question = { ...question,  ...data?.payload?.history, answer : terminatedAnswerResponse};
    }
    else {      
        if(!question?.hasOwnProperty('botConversation')) {
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

        if (!question?.botConversation) {
            question.botConversation = {}
            data?.payload?.thread?.messages?.map(message => {
                question.botConversation[message?.messageId] = message
            })                        
        }
        if (data?.payload?.thread && data?.payload?.thread?.nextMessages && data?.payload?.thread?.nextMessages?.length) {            
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

    // if(data?.res?.viewType === "threadView"){
    //     if(!question.hasOwnProperty("botConversation")){
    //         question.parentMessage = data.res  
    //         question.botConversation = {}
    //         updateState({
    //             isBotRunning: true
    //         })
    //     }
    // }

    questions[qId] = {...question, apiSuccess: true};

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
        if(data?.payload?.history?.status === msgStatus.TERMINATED){    
            store.dispatch(setActiveBoardId(data?.payload?.history?.bId))
        }else{
            store.dispatch(setActiveBoardId(data?.payload?.boardId))
        } 
    }
    if (data?.payload?.followUpContext && state.enableContextByFollowupContext) {
        // console.log("data?.payload?.followUpContext", { ...data?.payload?.followUpContext, messageId: data?.payload?.messageId })
        let context = {
            context: data?.payload?.followUpContext,
            messageId: data?.payload?.messageId,
            sources: data?.payload?.sources,
            viewType: data?.payload?.viewType,
            type: "agent",
            'isAgent': true,
            sessionId: data?.payload?.followUpContext?.sessionId
        }
        store.dispatch(setSelectedContext({data: context}))
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
