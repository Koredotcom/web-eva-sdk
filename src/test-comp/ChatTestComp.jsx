import React, { useEffect, useRef, useState } from 'react'
import ChatInterface from '../chat/ChatInterface'
import NewChat from '../chat/NewChat'
import AgentWelcomeTemplate from './WelcomeTemplate'

const ChatTestComp = () => {
    const [questions, setQuestions] = useState(null)
    const chatInterface = useRef()
    useEffect(() => {
        // Create an instance of ChatInterface
        chatInterface.current = ChatInterface();

        // Show the input bar in a specific DOM element
        chatInterface.current.showComposeBar('composeBar');

        // Subscribe to updates
        const unsubscribe = chatInterface.current.subscribe((question, searchResponse) => {
            // Handle the API response data
            console.log('Received data from chat API:', question, searchResponse);
            setQuestions(question)
        });

        // Cleanup on component unmount
        return () => {
            // Unsubscribe from store updates
            unsubscribe();
        };
    }, []);

    return (
        <div>
            <div>
                {questions && Object.values(questions).map(item => {
                    if(item?.templateType === 'agent_welcome_template') {
                        return <AgentWelcomeTemplate item={item} />
                    }
                    if (item.templateType === 'gpt_form_template') {
                        return (
                            <div dangerouslySetInnerHTML={{ __html: item.template_html }}></div>
                        );
                    }
                    if(item?.templateType === 'search_answer'){
                        return item?.answer
                    }
                    return null;
                })}
            </div>
            <div id="composeBar" className="composeBar"></div>
            <button onClick={()=> chatInterface.current.sendMessageAction()}>Send</button>
            <button onClick={()=> NewChat()}>+New</button>
            <button onClick={()=> chatInterface.current.cancelMessageReqAction()}>Stop</button>
        </div>
    )
}

export default ChatTestComp