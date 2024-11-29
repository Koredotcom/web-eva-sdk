import React, { useEffect, useRef, useState } from 'react'
import ChatInterface from '../chat/ChatInterface'
import NewChat from '../chat/NewChat'
import AgentWelcomeTemplate from './WelcomeTemplate'
import History from './history'
import DemoComp from './selectedContextDemoComp'
import AskFollowup from '../Attachments/askFollowup'
import MultiResponseTestComp from './MultiResponseTestComp'
// import submitUserFeedback from '../Feedback'


const ChatTestComp = (props) => {
    const [questions, setQuestions] = useState(null)
    const [input, setInput] = useState('')
    const [selectedItem, setSelectedItem] = useState(null)
    const [showDislikeMenu, setShowDislikeMenu] = useState(null)
    const chatInterface = useRef()
    useEffect(() => {
        // Create an instance of ChatInterface
        chatInterface.current = ChatInterface();

        // Show the input bar in a specific DOM element
        // chatInterface.current.showComposeBar('composeBar');

        // Subscribe to updates
        const unsubscribe = chatInterface.current.subscribe((question, searchResponse, moreAvailable) => {
            // Handle the API response data
            console.log('Received data from chat API:', question, searchResponse, moreAvailable);
            setQuestions(question)
        });

        // Cleanup on component unmount
        return () => {
            // Unsubscribe from store updates
            unsubscribe();
        };
    }, []);

    const onChange = async (event) => {
        if (event.keyCode === 13 && !event.shiftKey) {
            event.preventDefault()
            await chatInterface.current.sendMessageAction(input)
            console.log('working.....')
            setInput('')
        }
    }

    const handleClick = (label) => {
        setSelectedItem(label)
    }

    return (
        <>
            <div>
                <div>
                    {questions && Object.values(questions).map(item => {
                        if (item?.templateType === 'agent_welcome_template') {
                            return <AgentWelcomeTemplate item={item} />
                        }
                        if (item.templateType === 'gpt_form_template') {
                            return (
                                item.status === 'terminated' ? (
                                    <div>{item?.answer}</div>
                                ) : (
                                    <MultiResponseTestComp item={item} />
                                )
                            );
                        }
                        if (item?.templateType === 'search_answer') {
                            return (
                                <>
                                    <div>{item?.answer}</div>
                                    <div dangerouslySetInnerHTML={{ __html: item.answerFrom_html }}></div>
                                    {item?.answerFrom_html && <div onClick={() => AskFollowup(item)}>Ask followup</div>}
                                    {!item?.disableFeedback && <div>
                                        <button onClick={() => submitUserFeedback("like", item?.cId, null)}>Like</button>
                                        <button onClick={() => 
                                            setShowDislikeMenu(true)
                                            }>Dislike</button>
                                        <input id={`comment-${item?.messageId}`}></input>
                                        {showDislikeMenu &&
                                        <div className='feedBackDislikeGroup'>
                                            <ul className="radio-group">
                                            {[
                                                { id: 1, name: "cat1" },
                                                { id: 2, name: "cat2" },
                                                { id: 3, name: "cat3" },
                                            ].map(item => {
                                                return(
                                                    <li key={item?.id}>
                                                        <label>
                                                            <input
                                                                type="radio"
                                                                name="categories"
                                                                value={item.name}
                                                                checked={selectedItem === item.name}
                                                                onChange={() => handleClick(item.name)}
                                                            />
                                                            {item.name}
                                                        </label>
                                                    </li>
                                                )
                                            })}
                                        </ul>                                                
                                        </div>                                                                                    
                                        }
                                        <div>
                                            <button
                                                onClick={() => {
                                                    submitUserFeedback("dislike", item?.cId, null),
                                                        setShowDislikeMenu(false)
                                                }}>
                                                Submit
                                            </button>
                                        </div>

                                    </div>}
                                </>
                            )
                        }
                        if(item.templateType === "multi_responses"){
                            return (
                                <>
                                {item?.responses?.map((response, index) => {
                                    return (
                                        <>
                                            <div>{`Response ${index + 1}`}</div>
                                            <div>{response?.answer}</div>
                                        </>
                                    )
                                })}
                                </>
                            )
                        }
                        return null;
                    })}
                </div>
                <div>
                    <textarea
                        id="composeBar"
                        onKeyDown={onChange}
                        onInput={(event) => setInput(event.target.value)}
                        value={input}
                        placeholder='Ask question...'
                    />
                </div>
                <button onClick={() => chatInterface.current.sendMessageAction(input)}>Send</button>
                <button onClick={() => NewChat()}>+New</button>
                <button onClick={() => chatInterface.current.cancelMessageReqAction()}>Stop</button>
            </div>
            <div>
                {/* <History history = {props?.history} /> */}
                {/* <DemoComp/> */}
            </div>
        </>
    )
}

export default ChatTestComp