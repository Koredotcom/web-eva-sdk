import React, { useEffect, useRef, useState } from "react";
import { TemplateRenderer } from "../../templateRenderer";
import { BotConversation, ChatInterface } from "../../chat";
import NewChat from "../../chat/NewChat";
// Removing React Composebar - we'll use the JavaScript version
// import Composebar from "./Composebar";

import "../../styles/chat-interface.scss"
import "../../styles/composebar.scss"
import History from "../history";
import Agents from "../agents";
import Notifications from "../Notifications";
import AnnouncementData from "../../Announcements/AnnouncementData";
import { RenderComposeBar } from "../../composebar";
import { renderRecentAgents } from "../../LandingPageRecentAgents";


// function ShoelaceWrapper({ html }) {
//   const ref = useRef(null);

//   useEffect(() => {
//     if (!ref.current || !html) return;

//     ref.current.innerHTML = '';

//     const fragment = html instanceof Node ? html : document.createRange().createContextualFragment(html);
//     ref.current.appendChild(fragment);

//     // Ensure Shoelace components are defined before any upgrade
//     TemplateRenderer.upgradeCustomElements(ref.current);

//   }, [html]);

//   return <div ref={ref} />;
// }

const ChatInterfaceDemo = () => {
  const [messages, setMessages] = useState(null);
  const [quickActions, setQuickActions] = useState(null);
  const [input, setInput] = useState("");
  const [announcements, setAnnouncements] = useState(null);

  const chatInterface = useRef();
  const composeBarRef = useRef(); // Reference for the ComposeBar instance

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

    fetchAnnouncementData()   

    // Subscribe to updates
    const unsubscribe = chatInterface.current.subscribe(
      (question, searchResponse, moreAvailable, errorStates, quickActions) => {
        setMessages(question);
        setQuickActions(quickActions);
      }
    );

    return () => {
      unsubscribe();
      // Cleanup ComposeBar
      if (composeBarRef.current) {
        composeBarRef.current.destroy();
      }
    };
  }, []);

  // Separate useEffect for ComposeBar initialization
  useEffect(() => {
    // Initialize ComposeBar by passing the div id
    RenderComposeBar('#eva-composebar');
    renderRecentAgents('#recent-agents');
  }, []); 


  const fetchAnnouncementData = async () => {
      const res = await AnnouncementData()      
      setAnnouncements(res?.data)      
  }

  return (
    <div className="chatInterfaceDemo">
      <div className="sidebar">
        <div className="historySec">
          <div className="sidebar-header">
            <div className="sidebar-title">AI for Work</div>
            <div className="new-btn" title="New" onClick={() => {
              NewChat()
            }}>+</div>
          </div>
          <History />
          {/* <Notifications />
          <Agents /> */}
        </div>
      </div>
      
      <div className="chatInterfaceSec">
        <div className="chatSec">
          <div className="chatSec-inner">
          {messages &&
            Object.values(messages).map((item, index) => {
              if (item?.isTask) return;
              const assistantIconTemplate = () => {
                return <div className="logo-icon"><img src="/eva-black-svg.svg" alt="AiForWork" /></div>;
              };

              
              let html = TemplateRenderer.generateHTMLTemplate(item, {
                assistantIconTemplate,
                loadingText: "Analyzing",
              });

              return (
                <div
                  key={index}
                  dangerouslySetInnerHTML={{
                    __html: html.innerHTML,
                  }}
                />
              );

            })}
          </div>
        </div>
        {/* Replace the React Composebar with plain JavaScript ComposeBar container */}
        <div className="compose-section">          
          <div id="eva-composebar"></div>
          <div id="recent-agents"></div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterfaceDemo;
