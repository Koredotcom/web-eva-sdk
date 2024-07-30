import React, { useEffect, useState } from 'react'
import ChatInterface from './ChatInterface'

const ChatTestComp = () => {
    useEffect(() => {
        // Create an instance of ChatInterface
        const chatInterface = ChatInterface();

        // Show the input bar in a specific DOM element
        chatInterface.showComposeBar('composeBar');

        // Subscribe to updates
        const unsubscribe = chatInterface.subscribe((data) => {
            // Handle the API response data
            console.log('Received data from chat API:', data);
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
        </div>
    )
}

export default ChatTestComp