import { useEffect, useState } from "react"
import store from "../redux/store"
import BotConversation from "../chat/botAgent/getBotConversation.js"
import { isEmpty } from "lodash"


const BotAgentTestComponent = (props) => {
    const state = store.getState().global
    const [input, setInput] = useState()
    let botConversation = props?.question?.botConversation
    useEffect(() => {
        if (!isEmpty(botConversation)) {
            const templateConversations = Object.values(botConversation)?.filter(conversation => conversation?.hasOwnProperty('template_html'))
            if (templateConversations?.length) {
                templateConversations?.map(c => {
                    let templateDiv = document.querySelectorAll(`.botTemplate-${c?.messageId}`)
                    if (templateDiv) {
                        templateDiv?.[0]?.appendChild(c?.template_html)
                    }
                })
            }
        }
    }, [botConversation])

    console.log("bot conversation: ", botConversation)
    const changeInput = (event) => {
        setInput(event?.target?.value)
    }

    const sendAnswer = (conversation) => {
        /**
         * needed payload
         payload = {
         "question": "nothing but used entered answer",
         "context": "current question's context",
         "messageId": "current bot question's messageId"
         "source": "bot"
         }
         */        
        const payload = {
            "cId": props?.question?.cId || props?.question?.reqId, //reqId in case of botAgent from history
            "input": input,
            "context": props?.question?.context,
            "messageId": conversation?.messageId,
        }
        BotConversation().submitBotResponse(payload)
    }

    const onChange = async (event, conversation) => {
        if (event.keyCode === 13 && !event.shiftKey) {
            event.preventDefault()
            sendAnswer(conversation)
            setInput('')
        }
    }

    if (Object?.values(botConversation || {})?.length) {
        return (
            <>
                {Object.values(botConversation)?.map((conversation) => {

                    if (conversation?.hasOwnProperty('template_html') || conversation?.templateType === "hold_conversation") {
                        return (
                            <div className={`botTemplate-${conversation?.messageId}`}
                            // dangerouslySetInnerHTML={{__html: conversation?.template_html?.outerHTML}}
                            >
                            </div>
                        )
                    }
                    if (conversation?.templateType === "search_answer") {
                        if (conversation?.status === "completed") {
                            return (
                                <div>
                                    {conversation?.question}
                                    <br></br>
                                    <div>
                                        <input
                                            type="text"
                                            value={conversation?.answer}
                                        >
                                        </input>
                                    </div>
                                </div>

                            )
                        }
                        return (
                            <div>
                                {conversation?.question}
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => changeInput(e)}
                                    onKeyDown={(e)=> onChange(e, conversation)}
                                    // onInput={(e) => changeInput(e)}
                                    placeholder="Enter bot response"
                                >

                                </input>
                                <button onClick={() => { sendAnswer(conversation) }}>
                                    {conversation?.loading ? "Sending..." : "Send"}
                                </button>
                            </div>
                        )
                    }
                    {/* else {
                        return (
                            <div>
                                render your own template for the *{conversation?.content?.payload?.template_type}* template
                                selected option is *{conversation?.renderMsgPayload}*
                                selected option id is *{conversation?.answer}*
                            </div>
                        )
                    } */}
                })}
            </>
        )
    }
}

export default BotAgentTestComponent