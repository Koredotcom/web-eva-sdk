import { cloneDeep, isEmpty } from "lodash";
import {chatWindow, chatConfig} from "@koredev/kore-web-sdk"
import store from "../../redux/store";
import { getReqIdByMessageId } from "../../utils/helpers";
import { updateChatData, setBotSDKInstance, setCurrentQuestion, setEnableKoreBotSDK } from "../../redux/globalSlice";
import { advanceSearch } from "../../redux/actions/global.action";

const BotConversation = (args) => {
    let state = store.getState().global
    let currentBotSDKInstance = state.botSDkInstance;

    const initializeBotSDK = (botDetails) => {
        let botOptions = chatConfig.botOptions;        
        botOptions.JWTUrl = "https://mk2r2rmj21.execute-api.us-east-1.amazonaws.com/dev/users/sts";
        botOptions.userIdentity = state?.profile?.data?.emailId;// Provide users email id here
        botOptions.botInfo = { name: botDetails?.name, "_id": botDetails?.streamId }; // bot name is case sensitive
        botOptions.clientId = botDetails?.webhook?.clientId;
        botOptions.clientSecret = botDetails?.webhook?.clientSecret;
        let botSDKInstance =  new chatWindow(chatConfig)
        currentBotSDKInstance = botSDKInstance
        store.dispatch(setBotSDKInstance(botSDKInstance))
    }      
    if(currentBotSDKInstance){
        currentBotSDKInstance.sendMessage = (msg, renderTxt) => {
            if (msg) {
                console.log(msg, renderTxt)
                submitBotResponse({
                    "input": msg,
                    "cId": state?.currentQuestion?.reqId,
                    "messageId": Object.values(store.getState().global?.currentQuestion?.botConversation)?.find(c => c.hasOwnProperty('template_html') && c.status === "in-progress")?.messageId,
                    "context": state?.currentQuestion?.context,
                    "source": "bot"
                })
            }
        }
    }
    
    const setBotConversation = (detail) => {
        let question;
        let questions = cloneDeep(state?.questions)        
        if(detail?.action === "create"){
            question = questions[getReqIdByMessageId(detail?.pId)]
            if (isEmpty(question)) {
                //corresponding bot question is unavailable
                console.error(`bot question with id: ${detail?.messageId} is unavailable, please check the store`)
            } else {
                if (!question?.hasOwnProperty('botConversation')) {
                    question.botConversation = {}
                }
                question.botConversation[detail?.messageId] = detail?.message
                if (detail?.message?.templateType === "bot_template" || detail?.message?.templateType === "hold_conversation"){
                    if (state.enableKoreBotSDK){
                        detail.message.content.payload.inline = true
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
                        console.log("template html: ", currentBotSDKInstance.generateMessageDOM(templatePayload))
                        question.botConversation[detail?.messageId].template_html = currentBotSDKInstance.generateMessageDOM(templatePayload)
                    }                    
                }
            }
        }
        if(detail?.action === "update"){
            question = questions[getReqIdByMessageId(detail?.messageId)]
            question = {...question, ...detail?.message}
            console.log("question after update: ", question)
        }        
        store.dispatch(setCurrentQuestion(question))
        questions[question?.reqId] = question
        store.dispatch(updateChatData(questions))
    }

    const enableEVABotSdk = (payload) => {
        store.dispatch(setEnableKoreBotSDK(payload))
    }


    const submitBotResponse = (data) => {
        /**
         * needed payload
         payload = {
         "question": "nothing but used entered answer",
         "context": "current question's context",
         "messageId": "current bot question's messageId"
         "source": "bot"
         }
         */
        if (!state?.profile?.data?.id){
            let state = store.getState().global
        }
        const params = {
            "reqId": data?.cId //use reqId
        }
        const payload = {
            "question": data?.input,
            "context": data?.context,
            "messageId": data?.messageId,
            "source": "bot"
        }
        store.dispatch(advanceSearch({ params, payload, userId: state?.profile?.data?.id || data?.userId}))
    }
    const installOwnTemplate = (templateInstance) => {
        currentBotSDKInstance?.templateManager?.installTemplate(templateInstance) //Here templateInstance should be a component
    }
    return{
        setBotConversation,
        submitBotResponse,
        installOwnTemplate,
        initializeBotSDK,
        enableEVABotSdk
    }
}

export default BotConversation;