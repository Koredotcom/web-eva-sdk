import React, { useEffect, useRef, useState } from "react";
import { TemplateRenderer } from "../../templateRenderer";
import { BotConversation, ChatInterface } from "../../chat";
import Composebar from "./Composebar";

import "./ChatInterface.scss"
import History from "../history";
import Agents from "../agents";
import Notifications from "../Notifications";
import RecentFilesDemo from "../recentFiles";
import { AnnouncementsInterface } from "../../Announcements";
import MultiIntentExecutionDemo from "./MultiIntentExecutionDemo";

const ChatInterfaceDemo = () => {
  const [messages, setMessages] = useState(null);
  const [quickActions, setQuickActions] = useState(null);
  const [input, setInput] = useState("");

  const chatInterface = useRef();
  const announcementInterface = useRef();

  useEffect(() => {
    chatInterface.current = ChatInterface();
    chatInterface.current.options({ contentStreaming: true });
    let botInstance = BotConversation()
        botInstance.initializeBotSDK({
            "name": "ProcureBot",
            "streamId": "st-b6012ef2-810d-5240-b33e-5404d68b680e",
            "webhook": {
                "clientId": "cs-79a89a6f-b0ab-5e2f-b912-8dd1e2f95da0",
                "clientSecret": "VJNwkfbPcMZl4bOa1Qn3XtYRz6rqigwtTgOlaYX25Xs="
            }
        })
    botInstance.enableEVABotSdk(true)
    announcementInterface.current = AnnouncementsInterface();
    announcementInterface.current.subscribe((announcements) => {
      console.log("Announcements:", announcements);
    });

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
    <div className="chatInterfaceDemo">
      <div className="historySec">
        <History />
        {/* <RecentFilesDemo /> */}
        {/* <Notifications /> */}
        <Agents />
      </div>
      <div className="chatInterfaceSec">
        <div className="chatSec">
          {messages &&
            Object.values(messages).map((item, index) => {
              if (item?.isTask) return;
              
              // Handle multi_intent_execution separately (pure React)
              if (item?.templateType === "multi_intent_execution") {
                return <MultiIntentExecutionDemo key={item?.id} data={item} />;
              }

              // For all other templates, use the HTML template renderer
              const assistantIconTemplate = () => {
                return <div className="logo-icon" key={index}><img src="/public/eva-black-svg.svg" alt="AiForWork" /></div>;
              };
              
              let html = TemplateRenderer.generateHTMLTemplate(item, {
                assistantIconTemplate,
                loadingText: "Analyzing",
              });

              return (
                <div
                  key={item?.id}
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
    </div>
  );
};

export default ChatInterfaceDemo;
