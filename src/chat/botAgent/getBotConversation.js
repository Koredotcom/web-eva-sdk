import { cloneDeep, isEmpty } from "lodash";
import {chatWindow, chatConfig} from "@koredev/kore-web-sdk"
import store from "../../redux/store";
import { checkHistoryAccessed, getReqIdByMessageId, getTaskIdBypId, isTask } from "../../utils/helpers";
import { updateChatData, setBotSDKInstance, setCurrentQuestion, setEnableKoreBotSDK } from "../../redux/globalSlice";
import { advanceSearch } from "../../redux/actions/global.action";
import { constructQuestionPostCall } from "../chat-utils";
import { setBotInstance, getBotInstance } from "./botSDKManager";
import { setupTemplates } from "../../templateRenderer/templates/bot-conversation";
import { MultiIntentExecution } from "..";


const BotConversation = (args) => {
    let state = store.getState().global
    let currentBotSDKInstance = getBotInstance();

    const initializeBotSDK = (botDetails) => {
        let botOptions = chatConfig.botOptions;        
        botOptions.JWTUrl = "https://mk2r2rmj21.execute-api.us-east-1.amazonaws.com/dev/users/sts";
        botOptions.userIdentity = state?.profile?.data?.emailId || botDetails?.userEmailId;// Provide users email id here
        botOptions.botInfo = { name: botDetails?.name, "_id": botDetails?.streamId }; // bot name is case sensitive
        botOptions.clientId = botDetails?.webhook?.clientId;
        botOptions.clientSecret = botDetails?.webhook?.clientSecret;
        let botSDKInstance =  new chatWindow(chatConfig)
        if(state?.enableDebugging){
            console.log("bot sdk initialized: ", botSDKInstance)
        }
        currentBotSDKInstance = botSDKInstance
        // store.dispatch(setBotSDKInstance(botSDKInstance))
        setBotInstance(currentBotSDKInstance)
    }      
    if(currentBotSDKInstance){
        currentBotSDKInstance.sendMessage = (msg, renderTxt) => {
            /*
            msg is the payload to be sent to server,
            renderTxt is the object that cotains the data to be rendered at the client application
            */
            if (msg) {
                if(state?.enableDebugging){
                    console.log(msg, renderTxt)
                }
               const cId = state?.currentQuestion?.cId ?? state?.currentQuestion?.reqId;

                submitBotResponse({
                    input: msg,
                    cId,
                    messageId: Object.values(
                        store.getState().global?.currentQuestion?.botConversation
                    )?.find(
                        c => c.hasOwnProperty("template_html") && c.status === "in-progress"
                    )?.messageId,
                    context: state?.currentQuestion?.context,
                    source: "bot",
                    renderMsgPayload: renderTxt?.renderMsg
                });

            }
        }
    }
    
    const setBotConversation = (detail) => {
        state = store.getState().global
        let question;
        let questions = cloneDeep(state?.questions)
        const resolveQuestionKeyByMessageId = (messageId) => {
            if (!messageId || isEmpty(questions)) {
                return null;
            }
            const keyByMessageId = Object.keys(questions).find(
                (key) => questions[key]?.messageId === messageId
            );
            if (keyByMessageId) {
                return keyByMessageId?.hasOwnProperty('messageId') ? keyByMessageId['messageId']  || messageId :  keyByMessageId;
            }
            return Object.keys(questions).find(
                (key) =>
                    questions[key]?.reqId === messageId ||
                    questions[key]?.id === messageId
            );
        };
        const resolveQuestionKeyByReqId = (reqId) => {
            if (!reqId || isEmpty(questions)) {
                return null;
            }
            return Object.keys(questions).find(
                (key) => questions[key]?.messageId === reqId
            );
        };
        if (isEmpty(questions)) {
            return;
        }     
        if(detail?.action === "create"){
            const questionKey = resolveQuestionKeyByMessageId(detail?.pId)
            question = questions[questionKey]
            if (isEmpty(question)) {
                //corresponding bot question is unavailable
                if(state?.enableDebugging){
                    console.error(`bot question with id: ${detail?.messageId} is unavailable, please check the store`)
                }
                return;
            } else {
                if (!question?.hasOwnProperty('botConversation')) {
                    question.botConversation = {}
                }
                question.botConversation[detail?.messageId] = detail?.message
                if (detail?.message?.templateType === "bot_template" || detail?.message?.templateType === "hold_conversation"){
                    if (state.enableKoreBotSDK){                        
                        const templatePayload = {
                            "type": "bot_response",
                            "from": "bot",
                            "messageId": detail?.message?.messageId,
                            "message": [
                                {
                                    "type": "text",
                                    "component": detail?.message?.content
                                }
                            ]
                        }
                        currentBotSDKInstance.chatEle = document.getElementById("chatTestComp")
                        if(state?.enableDebugging){
                            console.log("template html: ", currentBotSDKInstance.generateMessageDOM(templatePayload))
                        }
                        question.botConversation[detail?.messageId].template_html = currentBotSDKInstance.generateMessageDOM(templatePayload) || new chatWindow().generateMessageDOM(templatePayload)
                    }                    
                }
            }
        }
    //     if(detail?.action === "update"){         
    //         /*reqId only comes when updating the parentMessage clo */   
    //         // if (detail?.message?.hasOwnProperty('reqId') && Object.keys(questions || {}).length > 0) {
    //         //     const currentQuestion = Object.values(questions).find(ques => ques.reqId === detail.message.reqId)
    //         //     if(currentQuestion?.historicalData){
    //         //         question = questions?.[currentQuestion?.id]
    //         //     }else{
    //         //         question = questions?.[currentQuestion?.reqId]
    //         //     }                                
    //         // }else{
                
    //         // }     
    //         if(Object.keys(questions || {}).length === 0){
    //             return;
    //         }            
    //         const questionKey = resolveQuestionKeyByMessageId(detail?.message?.pId)
    //         question = questions[detail?.message?.pId] /*in order to update the already existing messages of botConversation, we will depend on pId */
    //         const check = Object.values(questions)?.find(el => el?.messageId === detail?.message?.pId);
    //         if(question){//found the question with pId, so need to update the conversation present in botConversation
    //             question.botConversation[detail?.message?.messageId] = detail?.message
                
    //         }else if(check){
    //             const currentQuestion = store.getState().global.currentQuestion;
    //            if(currentQuestion?.isTask) {
    //                const stepIndex = currentQuestion?.stepIndex;
    //                setTimeout(() => {
    //                    MultiIntentExecution().runNextTask(stepIndex, detail?.message?.status , currentQuestion)
    //                }, 1000);
    //            }

    //         }
    //         else{
    //             const fallbackKey = resolveQuestionKeyByReqId(detail?.message?.pId)
    //             question = questions[fallbackKey] /*to update the parent message itself, */
    //             if(!question){
    //                 if(state?.enableDebugging){
    //                     console.error(`bot question with reqId: ${detail?.message?.reqId} is unavailable, please check the store`)
    //                 }
    //                 return;
    //             }             
    //             question = {...question, 'answer': detail?.message?.answer, 'status': detail?.message?.status}
    //         }
            
            
    //         /*should retain the id of the question when accessing from history */
    //         // if(question?.historicalData){
    //         //     const questionHistoryId = question.id
    //         //     question = { ...question, ...detail?.message }
    //         //     question.id = questionHistoryId
    //         // }else{
    //         //     // question = { ...question, ...detail?.message }
    //         // }  
    //         if(state?.enableDebugging){
    //             console.log("question after update: ", question)
    //         }         
    //     }       
    //     if(!question){
    //         if(state?.enableDebugging){
    //             console.error(`can't update the question as the question is 'undefined' or 'null' -133`)
    //         }
    //         return;
    //     } 
    //     store.dispatch(setCurrentQuestion(question))
    //     /*In case of history data we need to depend on id of the question */
    //     // if(question?.historicalData){
    //     //     questions[question?.id] = question
    //     // }else{
    //     //     questions[question?.reqId] = question
    //     // }  
    //      const currentQuestion = store.getState().global.currentQuestion;
    //      if(!currentQuestion?.isTask) {    
    //          questions[question?.reqId] = question
    //      }
    //     store.dispatch(updateChatData(questions))        
    //     setupTemplates(question.botConversation);
    // }

    if(detail?.action === "update"){         
        /*reqId only comes when updating the parentMessage clo */   
        // if (detail?.message?.hasOwnProperty('reqId') && Object.keys(questions || {}).length > 0) {
        //     const currentQuestion = Object.values(questions).find(ques => ques.reqId === detail.message.reqId)
        //     if(currentQuestion?.historicalData){
        //         question = questions?.[currentQuestion?.id]
        //     }else{
        //         question = questions?.[currentQuestion?.reqId]
        //     }                                
        // }else{
            
        // }     
        if(Object.keys(questions || {}).length === 0){
            return;
        }            
        question = questions[getReqIdByMessageId(detail?.message?.pId)] /*in order to update the already existing messages of botConversation, we will depend on pId */
        /*need to check whther the pId is a task or not */
        if(isTask(detail?.message?.pId)){
            question = questions[getTaskIdBypId(detail?.message?.pId)]
        }
        if(question){//found the question with pId, so need to update the conversation present in botConversation
            /*if question is a task, update can happen for the parentQuestion or the childQuestion, so first checking for the parentQuestion */
            if(question?.messageId === detail?.message?.messageId){ /*this happens when the agentic flow xo bot conversation step is completed, so need to execute the next step in agentic flow if we have any */            
                question = {...question, 'answer': detail?.message?.answer, 'status': detail?.message?.status}
            }else{
                question.botConversation[detail?.message?.messageId] = detail?.message
            }
        }else{
            question = questions[detail?.message?.reqId] /*to update the parent message itself, */
            if(!question){
                if(state?.enableDebugging){
                    console.error(`bot question with reqId: ${detail?.message?.reqId} is unavailable, please check the store`)
                }
                return;
            }             
            question = {...question, 'answer': detail?.message?.answer, 'status': detail?.message?.status}
        }
        
        
        /*should retain the id of the question when accessing from history */
        // if(question?.historicalData){
        //     const questionHistoryId = question.id
        //     question = { ...question, ...detail?.message }
        //     question.id = questionHistoryId
        // }else{
        //     // question = { ...question, ...detail?.message }
        // }  
        if(state?.enableDebugging){
            console.log("question after update: ", question)
        }         
    }       
    if(!question){
        if(state?.enableDebugging){
            console.error(`can't update the question as the question is 'undefined' or 'null' -133`)
        }
        return;
    }     
    /*In case of history data we need to depend on id of the question */
    // if(question?.historicalData){
    //     questions[question?.id] = question
    // }else{
    //     questions[question?.reqId] = question
    // }     
    store.dispatch(setCurrentQuestion(question))   
    if(question?.isTask){
        questions[question?.cId] = question
        if(question?.status === 'completed'){
            setTimeout(() => {
                MultiIntentExecution().runNextTask(question?.stepIndex, question?.status, question)
            }, 1000);
        }
    }else{        
        questions[question?.reqId] = question        
    }
    store.dispatch(updateChatData(questions))
    setupTemplates(question.botConversation);
}


    const enableEVABotSdk = (payload) => {
        store.dispatch(setEnableKoreBotSDK(payload))
    }


    const submitBotResponse = async (data) => {
        const globalState = store.getState().global;

        const params = {
            reqId: data?.cId,
            from: "botAgent"
        };

        const payload = {
            question: data?.input,
            context: data?.context,
            messageId: data?.messageId,
            source: "bot"
        };

        if (data?.renderMsgPayload) {
            payload.renderMsgPayload = data.renderMsgPayload;
        }

        if (!isEmpty(globalState?.customData)) {
            payload.customData = globalState.customData;
        }

        if (globalState?.enableDebugging) {
            console.log("params:", params);
            console.log("payload:", payload);
        }

        const res = await store.dispatch(
            advanceSearch({
            params,
            payload,
            userId: globalState?.profile?.data?.id || data?.userId
            })
        );

        constructQuestionPostCall(res, data?.cId , 'bot');
};


    const addLoadingStateToCurrentQuestion = (quesReqId, messageId, input) => {
        let reqId = quesReqId
        let questions = cloneDeep(state?.questions)
        const isHistoryAccessed = checkHistoryAccessed(questions)
        if(isHistoryAccessed){
            reqId = Object.entries(questions).find(([key, value]) => value?.reqId === reqId)?.[0]
        }
        let currentQuestion = questions[reqId]
        if (currentQuestion) {
            let botConversation = currentQuestion?.botConversation
            if (botConversation) {
                let currentBotQuestion = botConversation?.[messageId]
                if (currentBotQuestion) {                    
                    currentBotQuestion.loading = true
                    currentBotQuestion.answer = input
                    if(state?.enableDebugging){
                        console.log("added loading state: ", currentBotQuestion)
                    }
                    botConversation[messageId] = currentBotQuestion
                    currentQuestion.botConversation = botConversation
                    questions[reqId] = currentQuestion                    
                    store.dispatch(updateChatData(questions))
                }
            }
        }
    }
    const installOwnTemplate = (templateInstance) => {
        currentBotSDKInstance?.templateManager?.installTemplate(templateInstance) //Here templateInstance should be a component
    }

    const generateHTMLforBotTemplate = (templatePayload) => {        
        const xoTemplatePayload = {
            "type": "bot_response",
            "from": "bot",
            "messageId": templatePayload?.messageId,
            "message": [
                {
                    "type": "text",
                    "component": templatePayload?.content
                }
            ]
        }
        currentBotSDKInstance.chatEle = document.getElementById("chatTestComp")
        return currentBotSDKInstance.generateMessageDOM(xoTemplatePayload)
        
    }
    return{
        setBotConversation,
        submitBotResponse,
        installOwnTemplate,
        initializeBotSDK,
        enableEVABotSdk,
        generateHTMLforBotTemplate
    }
}

export default BotConversation;