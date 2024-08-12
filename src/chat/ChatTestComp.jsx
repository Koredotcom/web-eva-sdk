import React, { useEffect, useRef, useState } from 'react'
import ChatInterface from './ChatInterface'
import NewChat from './NewChat'

const ChatTestComp = () => {
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
        });

        // Cleanup on component unmount
        return () => {
            // Unsubscribe from store updates
            unsubscribe();
        };
    }, []);

    return (
        <div>
            <div id="composeBar" className="composeBar"></div>
            <button onClick={()=> chatInterface.current.sendMessageAction()}>Send</button>
            <button onClick={()=> NewChat()}>+New</button>
        </div>
    )
}

export default ChatTestComp