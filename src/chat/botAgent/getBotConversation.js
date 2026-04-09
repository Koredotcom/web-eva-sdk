import { cloneDeep, isEmpty } from "lodash";
import {chatWindow, chatConfig} from "kore-web-sdk"
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
                const freshState = store.getState().global;
                let activeQuestion = freshState?.currentQuestion;

                if (!activeQuestion?.botConversation) {
                    activeQuestion = Object.values(freshState?.questions || {}).find((question) =>
                        question?.botConversation &&
                        Object.values(question.botConversation || {}).some(
                            (conversation) =>
                                conversation?.status === "in-progress" &&
                                conversation?.hasOwnProperty("template_html")
                        )
                    );
                }

                if(freshState?.enableDebugging){
                    console.log(msg, renderTxt)
                }
                const cId = activeQuestion?.cId ?? activeQuestion?.reqId;
                const messageId = Object.values(activeQuestion?.botConversation || {})?.find(
                    c => c?.hasOwnProperty("template_html") && c?.status === "in-progress"
                )?.messageId;

                if (!cId || !messageId) {
                    return;
                }

                submitBotResponse({
                    input: msg,
                    cId,
                    messageId,
                    context: activeQuestion?.context,
                    source: "bot",
                    renderMsgPayload: renderTxt?.renderMsg
                });

            }
        }
    }
    
    const setBotConversation = (detail) => {
        state = store.getState().global
        currentBotSDKInstance = getBotInstance();
        let question;
        const templateHtmlMap = {};
        Object.entries(state?.questions || {}).forEach(([qKey, q]) => {
            Object.entries(q?.botConversation || {}).forEach(([mId, conv]) => {
                if (conv?.template_html instanceof Node) {
                    templateHtmlMap[`${qKey}::${mId}`] = conv.template_html;
                }
            });
        });
        let questions = cloneDeep(state?.questions)
        Object.entries(templateHtmlMap).forEach(([compositeKey, domNode]) => {
            const [qKey, mId] = compositeKey.split('::');
            if (questions?.[qKey]?.botConversation?.[mId]) {
                questions[qKey].botConversation[mId].template_html = domNode;
            }
        });
        const resolveTaskQuestionKeyByStepId = (message) => {
            const stepId = message?.context?.stepId || message?.stepId;
            if (!stepId || isEmpty(questions)) {
                return null;
            }
            if (questions?.[stepId]?.isTask) {
                return stepId;
            }
            return Object.keys(questions).find(
                (key) => questions[key]?.isTask && (questions[key]?.cId === stepId || questions[key]?.id === stepId)
            ) || null;
        };
        const resolveQuestionKeyByConversationMessageId = (messageId) => {
            if (!messageId || isEmpty(questions)) {
                return null;
            }

            // 1) Root question keyed by server/root message id or req id
            const directQuestionKey = resolveQuestionKeyByMessageId(messageId);
            if (directQuestionKey) {
                return directQuestionKey;
            }

            // 2) Nested bot conversation message under a parent question/task
            return Object.keys(questions).find((key) => {
                const botConversation = questions[key]?.botConversation || {};
                return Object.values(botConversation).some(
                    (conv) =>
                        conv?.messageId === messageId ||
                        conv?.outputMessageId === messageId
                );
            });
        };
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
            const questionKey =
                resolveTaskQuestionKeyByStepId(detail?.message) ||
                resolveQuestionKeyByConversationMessageId(detail?.pId)
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
                question.botConversation[detail?.messageId] = {
                    ...(question.botConversation?.[detail?.messageId] || {}),
                    ...detail?.message
                }
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
        const taskQuestionKey = resolveTaskQuestionKeyByStepId(detail?.message);
        const ownerQuestionKey =
            resolveQuestionKeyByConversationMessageId(detail?.message?.pId) ||
            getReqIdByMessageId(detail?.message?.pId);
        question = questions[taskQuestionKey || ownerQuestionKey] /*in order to update the already existing messages of botConversation, we will depend on pId */
        /*need to check whther the pId is a task or not */
        if(!taskQuestionKey && isTask(detail?.message?.pId)){
            const taskQuestionId = getTaskIdBypId(detail?.message?.pId)
            if(taskQuestionId){
                question = questions[taskQuestionId]
            }
        }
        if(question){//found the question with pId, so need to update the conversation present in botConversation
            /*if question is a task, update can happen for the parentQuestion or the childQuestion, so first checking for the parentQuestion */
            if(question?.messageId === detail?.message?.messageId){ /*this happens when the agentic flow xo bot conversation step is completed, so need to execute the next step in agentic flow if we have any */            
                question = {...question, 'answer': detail?.message?.answer, 'status': detail?.message?.status}
            }else{
                if (!question?.hasOwnProperty('botConversation')) {
                    question.botConversation = {}
                }
                question.botConversation[detail?.message?.messageId] = {
                    ...(question.botConversation?.[detail?.message?.messageId] || {}),
                    ...detail?.message
                }
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
    setupTemplates(question.botConversation, question);
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

        // Optimistically reflect the user's compose-bar reply immediately in the active bot thread.
        addLoadingStateToCurrentQuestion(data?.cId, data?.messageId, data?.input);

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
        state = store.getState().global;
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