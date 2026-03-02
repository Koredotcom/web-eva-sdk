import React, { useEffect, useRef, useState } from "react";
import { TemplateRenderer } from "../../templateRenderer";
import { BotConversation, ChatInterface } from "../../chat";

import "./ChatInterface.scss"

import Announcements from "../announcements";
import Composebar from "./Composebar";
import { AnnouncementsInterface } from "../../Announcements";
import Agents from "../agents";
import MultiIntentExecutionDemo from "./MultiIntentExecutionDemo";
import History from "../history";
import { RenderComposeBar } from "../../composebar";
import { renderRecentAgents } from "../../UIComponents/RecentAgents";
import { RightArrow } from "../../templateRenderer/icons-library";
  



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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [wasScrollToBottomClicked, setWasScrollToBottomClicked] = useState(false);
  const [isComposebarBotInputVisible, setIsComposebarBotInputVisible] = useState(false);
  const [isComposebarBotInputExpanded, setIsComposebarBotInputExpanded] = useState(false);

  const chatInterface = useRef();
  const composeBarRef = useRef();
  const scrollContainerRef = useRef();
  const preventScrollRef = useRef();
  const getBottomHeight = useRef();
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
      RenderComposeBar('eva-composebar');
      renderRecentAgents('recent-agents-container');
  }, []);

  useEffect(() => {
    let observer = null;
    let rafId = null;
    let cancelled = false;

    const getBotWrapper = () =>
      document.querySelector('#eva-composebar .composebar-bot-input-wrapper');

    const computeVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      // getClientRects catches display:none and detached nodes reliably
      return el.getClientRects().length > 0;
    };

    const sync = () => {
      const el = getBotWrapper();
      const isVisible = computeVisible(el);
      setIsComposebarBotInputVisible(isVisible);
      // Expanded means details are shown (i.e., "Hide Details" state)
      setIsComposebarBotInputExpanded(
        !!(isVisible && el && !el.classList.contains('details-hidden'))
      );
    };

    const start = () => {
      if (cancelled) return;
      const el = getBotWrapper();

      // Wrapper might not exist until RenderComposeBar injects markup
      if (!el) {
        rafId = window.requestAnimationFrame(start);
        return;
      }

      sync();

      observer = new MutationObserver(() => sync());
      observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    };

    start();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
    };
  }, []);

  // Simple one-time check on mount to show scroll button if needed
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = scrollContainerRef.current;
      const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;      
      if (el && scrollBottom > 0) {
        setShowScrollToBottom(true);
      }else{
        setShowScrollToBottom(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [messages]); 


  const fetchAnnouncementData = async () => {
      const res = await AnnouncementData()      
      setAnnouncements(res?.data)      
  }

  const handleScroll = () => {
    const el = scrollContainerRef.current;    
    if (!el) return;

    const nearBottom = isUserNearBottom(el, 50);
    preventScrollRef.current = !nearBottom;
    getBottomHeight.current = nearBottom;

    // Hide scroll to bottom button when user manually scrolls to the very bottom
    const isAtVeryBottom = isUserNearBottom(el, 10); // Very small threshold for exact bottom detection
    if (isAtVeryBottom && showScrollToBottom) {
      setShowScrollToBottom(false);
      setWasScrollToBottomClicked(false); // Reset the clicked flag when manually scrolled to bottom
    }

    // Show scroll to bottom button when user scrolls up and content is hidden below
    const isContentHiddenBelow = !isUserNearBottom(el, 100);
    const hasContentToScroll = el.scrollHeight > el.clientHeight; // Check if there's scrollable content

    // Reset the clicked flag when user scrolls up significantly from bottom
    if (isContentHiddenBelow && wasScrollToBottomClicked) {
      setWasScrollToBottomClicked(false);
    }

    if (isContentHiddenBelow && hasContentToScroll && !showScrollToBottom) {
      setShowScrollToBottom(true);
    }
  };

  return (
    <div className="chatInterfaceDemo">
      <div className="historySec">
        <History />
        {/* <RecentFilesDemo /> */}
        {/* <Notifications /> */}
        {/* <Agents /> */}
      </div>
      
      <div className="chatInterfaceSec">
        
        <div className="chatSec" id="chatSec" onScroll={handleScroll}
          ref={scrollContainerRef}
        >

          <div className="chatSec-inner" id ="chat-sec-container">
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
                  className={[
                    'chat-message-container',
                    isComposebarBotInputVisible ? 'composebar-bot-input-visible' : '',
                    isComposebarBotInputExpanded ? 'composebar-bot-input-expanded' : '',
                  ].filter(Boolean).join(' ')}
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
        {showScrollToBottom && <div className="scrollToBottmBtn" onClick={() => {
            scrollContainerRef.current.scrollTop = scrollContainerRef?.current?.scrollHeight
            setShowScrollToBottom(false)
            setWasScrollToBottomClicked(true)
          }}><div className="scrollToBottmBtn-icon" id="scrollToBottomBtn" dangerouslySetInnerHTML={{ __html: RightArrow({ color: "#737373" }) }} /></div>}          
          <div id="eva-composebar"></div>
          <div id="recent-agents-container"></div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterfaceDemo;
