import React, { useEffect, useRef, useState } from "react";
import { BotConversation, ChatInterface } from "../../chat";
import store from "../../redux/store";

import '../../styles/chat-interface.scss'

import Announcements from "../announcements";
import Composebar from "./Composebar";
import { AnnouncementsInterface } from "../../Announcements";
import Agents from "../agents";
import History from "../history";
import { SchedulersView } from "../../schedulers";
import { ExecuteFormThroughURL } from "../../chat/gptTemplate/submitGPTForm";
import Profile from "./profile";
import { useChatMessageRenderer } from "./renderer";
import NewChat from "../../chat/NewChat";
import RecentAgentsFunc from "../../LandingPageRecentAgents/RecentAgents";

const { unHideRecentAgentsDiv } = RecentAgentsFunc();


const ChatInterfaceDemo = () => {
  const [quickActions, setQuickActions] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(null);
  const [showSchedulers, setShowSchedulers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const chatInterface = useRef();
  const announcementInterface = useRef();
  const messagesContainerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const { onSubscribe } = useChatMessageRenderer({
    containerRef: messagesContainerRef,
    scrollContainerRef,
    loadingText: "Analyzing",
  });

  useEffect(() => {
    chatInterface.current = ChatInterface();
    chatInterface.current.options({ contentStreaming: true });

    let botInstance = BotConversation();
    botInstance.initializeBotSDK({
      "name": "ProcureBot",
      "streamId": "st-b6012ef2-810d-5240-b33e-5404d68b680e",
      "webhook": {
        "clientId": "cs-79a89a6f-b0ab-5e2f-b912-8dd1e2f95da0",
        "clientSecret": "VJNwkfbPcMZl4bOa1Qn3XtYRz6rqigwtTgOlaYX25Xs="
      }
    });
    botInstance.enableEVABotSdk(true);

    announcementInterface.current = AnnouncementsInterface();
    announcementInterface.current.subscribe((announcements) => {
      if (store.getState().global?.enableDebugging) {
        console.log("Announcements:", announcements);
      }
    });

    const unsubscribe = chatInterface.current.subscribe(
      (question, searchResponse, moreAvailable, errorStates, qa) => {
        if (store.getState().global?.enableDebugging) {
          console.log(
            "Received data from chat API:",
            question,
            searchResponse,
            moreAvailable,
            errorStates,
            qa
          );
        }
        setMessages(question);
        setQuickActions(qa);
        onSubscribe(question, searchResponse, moreAvailable, errorStates, qa);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [onSubscribe]);

  return (
    <div className="chatInterfaceDemo">
      <div className="sidebar">
        <div className="historySec">
          <div className="sidebar-header">
            <div className="sidebar-title">AI for Work</div>
            <div className="new-btn" title="New" onClick={() => {
              unHideRecentAgentsDiv('recent-agents-container');
              NewChat();
              const botHeaderContainer = document.querySelector('.composebar-bot-input-wrapper');
              if (botHeaderContainer) {
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
            <div className="chatSec" ref={scrollContainerRef}>
              <div className="chatSec-inner" ref={messagesContainerRef} />
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
              const formData = { content: "cube root of 27", prompts: '699f29cd8e37c7ffb9bff9bf' };
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
