import React, { useEffect, useRef, useState, useCallback } from "react";
import { TemplateRenderer } from "../../templateRenderer";
import { BotConversation, ChatInterface } from "../../chat";
import NewChat from "../../chat/NewChat";

import "../../styles/chat-interface.scss"
import "../../styles/composebar.scss"
import History from "../history";
import Agents from "../agents";
import Notifications from "../Notifications";
import AnnouncementData from "../../Announcements/AnnouncementData";
import { RenderComposeBar } from "../../composebar";
import RecentAgentsFunc from "../../LandingPageRecentAgents/RecentAgents";
import { isUserNearBottom } from "../../utils/helpers";
import { RightArrow } from "../../templateRenderer/icons-library";
import Announcements from "../announcements";
import { cleanupAllAuthChallenges } from "../../templateRenderer/functionality/agent-auth-challenge";
const {renderRecentAgents, unHideRecentAgentsDiv} = RecentAgentsFunc();


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

const deduplicateQuestions = (questions) => {
  const questionList = Object.values(questions);
  const seen = new Set();
  const deduped = [];
  for (let i = 0; i < questionList.length; i++) {
    const item = questionList[i];
    const key =
      (item?.messageId ? `m:${item.messageId}` : null) ||
      (item?.reqId ? `r:${item.reqId}` : null) ||
      (item?.cId ? `c:${item.cId}` : null) ||
      (item?.id ? `i:${item.id}` : `idx:${i}`);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
};

const shouldSkipRender = (container) => {
  if (!container) return false;
  if (container.querySelector('.ts-control input:focus')) return true;
  if (container.querySelector('.slack-search-input:focus, .teams-search-input:focus')) return true;
  if (container.querySelector('.slack-message-editor:focus, .teams-message-editor:focus')) return true;
  if (container.querySelector('.sc-prompt-input:focus')) return true;
  if (container.querySelector('.emailSmartCompose')) return true;
  if (container.querySelector('[data-sending="true"]')) return true;
  return false;
};

const ChatInterfaceDemo = () => {
  const [quickActions, setQuickActions] = useState(null);
  const [input, setInput] = useState("");
  const [announcements, setAnnouncements] = useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [wasScrollToBottomClicked, setWasScrollToBottomClicked] = useState(false);
  const [isComposebarBotInputVisible, setIsComposebarBotInputVisible] = useState(false);
  const [isComposebarBotInputExpanded, setIsComposebarBotInputExpanded] = useState(false);
  const [, forceUpdate] = useState(0);

  const chatInterface = useRef();
  const composeBarRef = useRef();
  const scrollContainerRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const preventScrollRef = useRef(false);
  const getBottomHeight = useRef(0);
  const questionsRef = useRef(null);

  const renderMessages = useCallback((questions) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (shouldSkipRender(container)) return;

    if (!questions || Object.keys(questions).length === 0) {
      container.innerHTML = '';
      return;
    }

    const prevScrollTop = scrollContainerRef.current?.scrollTop || 0;
    const deduped = deduplicateQuestions(questions);

    const botWrapper = document.querySelector('#eva-composebar .composebar-bot-input-wrapper');
    const botVisible = botWrapper && window.getComputedStyle(botWrapper).display !== 'none' && botWrapper.getClientRects().length > 0;
    const botExpanded = botVisible && !botWrapper.classList.contains('details-hidden');
    const extraClasses = [
      botVisible ? 'composebar-bot-input-visible' : '',
      botExpanded ? 'composebar-bot-input-expanded' : '',
    ].filter(Boolean).join(' ');

    const html = deduped.map((item) => {
      if (item?.isTask) return '';
      const el = TemplateRenderer.generateHTMLTemplate(item, {
        loadingText: "Analyzing",
      });
      const cls = `chat-message-container${extraClasses ? ' ' + extraClasses : ''}`;
      return `<div class="${cls}">${el.innerHTML}</div>`;
    }).join('');

    container.innerHTML = html;

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = prevScrollTop;
    }
  }, []);

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

    const unsubscribe = chatInterface.current.subscribe(
      (question, searchResponse, moreAvailable, errorStates, quickActions) => {
        questionsRef.current = question;
        renderMessages(question);
        setQuickActions(quickActions);
        forceUpdate(c => c + 1);
      }
    );

    return () => {
      unsubscribe();
      cleanupAllAuthChallenges();
      if (composeBarRef.current) {
        composeBarRef.current.destroy();
      }
    };
  }, [renderMessages]);

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
      setIsComposebarBotInputExpanded(
        !!(isVisible && el && !el.classList.contains('details-hidden'))
      );
      if (questionsRef.current) {
        renderMessages(questionsRef.current);
      }
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

  // Check on mount/update to show scroll button if needed
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;      
      if (scrollBottom > 0) {
        setShowScrollToBottom(true);
      } else {
        setShowScrollToBottom(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  });


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

          <div className="chatSec-inner" id="chat-sec-container" ref={messagesContainerRef} />
          
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
