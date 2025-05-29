import React, { useEffect, useRef, useState } from "react";
import { TemplateRenderer } from "../../templateRenderer";
import { ChatInterface } from "../../chat";
import Composebar from "./Composebar";

import "./ChatInterface.scss"

const ChatInterfaceDemo = () => {
  const [messages, setMessages] = useState(null);
  const [quickActions, setQuickActions] = useState(null);
  const [input, setInput] = useState("");

  const chatInterface = useRef();

  useEffect(() => {
    chatInterface.current = ChatInterface();
    chatInterface.current.options({ contentStreaming: true });

    // Subscribe to updates
    const unsubscribe = chatInterface.current.subscribe(
      (question, searchResponse, moreAvailable, errorStates, quickActions) => {
        // Handle the API response data
        console.log(
          "Received data from chat API:",
          question,
          searchResponse,
          moreAvailable,
          errorStates,
          quickActions
        );
        setMessages(question);
        setQuickActions(quickActions);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div>
      <div>
        {messages &&
          Object.values(messages).map((item) => {
            if (item?.isTask) return;
            const assistantIconTemplate = () => {
              return <img src="/public/eva-black-svg.svg" alt="AiForWork" />;
            };

            
            let html = TemplateRenderer.generateHTMLTemplate(item, {
              assistantIconTemplate,
              loadingText: "Analyzing",
            });

            return (
              <div
                dangerouslySetInnerHTML={{
                  __html: html.innerHTML,
                }}
              />
            );

          })}
      </div>
      <Composebar 
        quickActions={quickActions} 
        chatInterface={chatInterface} 
        input={input} 
        setInput={setInput} 
        messages={messages} 
      />
    </div>
  );
};

export default ChatInterfaceDemo;
