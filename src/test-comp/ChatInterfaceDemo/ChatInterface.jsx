import React, { useEffect, useRef, useState } from "react";
import { TemplateRenderer } from "../../templateRenderer";
import { BotConversation, ChatInterface } from "../../chat";
import store from "../../redux/store";

import "./ChatInterface.scss"

import Announcements from "../announcements";
import Composebar from "./Composebar";
import { AnnouncementsInterface } from "../../Announcements";
import Agents from "../agents";
import MultiIntentExecutionDemo from "./MultiIntentExecutionDemo";
import History from "../history";
import { SchedulersView } from "../../schedulers";
import { ExecuteFormThroughURL } from "../../chat/gptTemplate/submitGPTForm";
import Profile from "./profile";



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
  const [showSchedulers, setShowSchedulers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

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
      if (store.getState().global?.enableDebugging) {
        console.log("Announcements:", announcements);
      }
    });

    // Subscribe to updates
    const unsubscribe = chatInterface.current.subscribe(
      (question, searchResponse, moreAvailable, errorStates, quickActions) => {
        if (store.getState().global?.enableDebugging) {
          console.log(
            "Received data from chat API:",
            question,
            searchResponse,
            moreAvailable,
            errorStates,
            quickActions
          );
        }
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
      <div className="sidebar">
        <div className="historySec">
          <div className="sidebar-header">
            <div className="sidebar-title">AI for Work</div>
            <div className="new-btn" title="New" onClick={() => {
              unHideRecentAgentsDiv('recent-agents-container');
              NewChat()
              const botHeaderContainer = document.querySelector('.composebar-bot-input-wrapper');
              if(botHeaderContainer){
                botHeaderContainer.style.display = 'none';
              }
            }}>+</div>
          </div>
          
          {/* <Notifications /> */}
          <Agents />
          <div>---------------------------------------------------------------</div>
          <div className="sidebar-nav-item" onClick={() => setShowSchedulers(true)} role="button" tabIndex={0}>Schedulers</div>
          <div>---------------------------------------------------------------</div>
          <div className="sidebar-nav-item" onClick={() => setShowProfile(true)} role="button" tabIndex={0}>Profile</div>
          <div>---------------------------------------------------------------</div>
          {/* <Announcements /> */}
          {/* <History /> */}
        </div>
      </div>
      <div className="chatInterfaceSec">
        {showProfile ? (
          <div className="chatSec schedulers-full-width">
            <Profile onClose={() => setShowProfile(false)} />
          </div>
        ) : showSchedulers ? (
          <div className="chatSec schedulers-full-width">
            <button type="button" className="back-from-schedulers" onClick={() => setShowSchedulers(false)}>← Back to Chat</button>
            <SchedulersView />
          </div>
        ) : (
        <>
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
          <a href="#" onClick={(e) => {
            e.preventDefault();
            const formData = { content: "cube root of 27", prompts:'699f29cd8e37c7ffb9bff9bf',  };
            const question = "Find the cube root of 27.";
            const agentId = "ag-b0b6c3b6-df0a-5316-8a9f-35bf43babd1e";
            ExecuteFormThroughURL(formData, question, agentId);
          }}>Review peggy's plan and risk information</a>
        </>
        )}
      </div>
    </div>
  );
};

export default ChatInterfaceDemo;
