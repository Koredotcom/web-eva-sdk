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
import { authorizeApp } from "../../Authorization";
import { initializeSDK } from "../../config";
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

const readAuthFromUrl = () => {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    jwt: params.get("jwt") || params.get("id_token") || "",
    emailId: params.get("emailId") || params.get("email") || "",
    clientId: params.get("clientId") || params.get("client_id") || "",
  };
};

const AuthGate = ({ onAuthorized }) => {
  const initial = readAuthFromUrl();
  const [jwt, setJwt] = useState(initial.jwt);
  const [emailId, setEmailId] = useState(initial.emailId);
  const [clientId, setClientId] = useState(initial.clientId);
  const [status, setStatus] = useState("idle"); // idle | loading | failed
  const [error, setError] = useState("");
  const attemptedRef = useRef(false);

  const runAuth = useCallback(async (jwtVal, emailVal, clientIdVal) => {
    setStatus("loading");
    setError("");

    const res = await authorizeApp({
      jwt: jwtVal,
      emailId: emailVal,
      client_id: clientIdVal || undefined,
    });

    if (res?.status === "success") {
      onAuthorized({ data: res.data, clientId: res.clientId, jwt: jwtVal, emailId: emailVal });
    } else {
      setStatus("failed");
      setError(res?.error?.message || "Authorization failed");
    }
  }, [onAuthorized]);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (initial.jwt && initial.emailId) {
      attemptedRef.current = true;
      runAuth(initial.jwt, initial.emailId, initial.clientId);
    }
  }, [initial.jwt, initial.emailId, initial.clientId, runAuth]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!jwt.trim() || !emailId.trim()) {
      setError("jwt and emailId are required");
      return;
    }
    runAuth(jwt.trim(), emailId.trim(), clientId.trim());
  };

  const formStyles = {
    wrapper: { maxWidth: 480, margin: "60px auto", padding: 24, border: "1px solid #e0e0e0", borderRadius: 8, fontFamily: "system-ui, sans-serif", background: "#fff" },
    title: { margin: "0 0 16px" },
    field: { display: "block", marginBottom: 12 },
    label: { display: "block", fontSize: 13, marginBottom: 4, color: "#444" },
    input: { width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4, fontFamily: "inherit", fontSize: 14, boxSizing: "border-box" },
    textarea: { width: "100%", minHeight: 80, padding: 8, border: "1px solid #ccc", borderRadius: 4, fontFamily: "monospace", fontSize: 12, boxSizing: "border-box", resize: "vertical" },
    btn: { padding: "8px 16px", background: "#2f6feb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 },
    btnDisabled: { opacity: 0.6, cursor: "wait" },
    err: { color: "#c0392b", marginTop: 8, fontSize: 13 },
    info: { color: "#666", marginTop: 8, fontSize: 12 },
  };

  if (status === "loading") {
    return (
      <div style={formStyles.wrapper}>
        <h2 style={formStyles.title}>Authorizing…</h2>
        <div style={formStyles.info}>Calling SSO login.</div>
      </div>
    );
  }

  return (
    <div style={formStyles.wrapper}>
      <h2 style={formStyles.title}>Sign in to ChatInterface</h2>
      <form onSubmit={handleSubmit}>
        <label style={formStyles.field}>
          <span style={formStyles.label}>JWT (id_token)</span>
          <textarea
            style={formStyles.textarea}
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6Ik..."
          />
        </label>
        <label style={formStyles.field}>
          <span style={formStyles.label}>Email ID</span>
          <input
            type="email"
            style={formStyles.input}
            value={emailId}
            onChange={(e) => setEmailId(e.target.value)}
            placeholder="user@example.com"
          />
        </label>
        <label style={formStyles.field}>
          <span style={formStyles.label}>Client ID (optional — derived from JWT.appId if blank)</span>
          <input
            style={formStyles.input}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="cs-xxxxxxxx"
          />
        </label>
        <button
          type="submit"
          style={status === "loading" ? { ...formStyles.btn, ...formStyles.btnDisabled } : formStyles.btn}
          disabled={status === "loading"}
        >
          Authorize
        </button>
        {error && <div style={formStyles.err}>{error}</div>}
        <div style={formStyles.info}>
          Tip: prefill with URL params <code>?jwt=…&amp;emailId=…&amp;clientId=…</code>
        </div>
      </form>
    </div>
  );
};

const ChatInterfaceContent = () => {
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

const ChatInterfaceDemo = () => {
  const [authResult, setAuthResult] = useState(null);

  const handleAuthorized = useCallback(async ({ data, clientId, jwt, emailId }) => {
    const accessToken = data?.authorization?.accessToken;
    const userId = data?.userInfo?.id;

    if (!accessToken || !userId) {
      console.error("[ChatInterfaceDemo] Missing accessToken or userId in SSO response", data);
      return;
    }

    if (typeof window !== "undefined") {
      const existing = window.sdkConfig || {};
      window.sdkConfig = {
        ...existing,
        clientId,
        emailId,
        idToken: jwt,
        userId,
        accessToken,
      };
    }

    await initializeSDK({
      accessToken,
      userId,
      api_url: "https://work-qa.kore.ai/api/",
      presence_url: "https://work-qa.kore.ai/",
      initializeBotSDK: {
        name: "ProcureBot",
        streamId: "st-b6012ef2-810d-5240-b33e-5404d68b680e",
        webhook: {
          clientId: "cs-79a89a6f-b0ab-5e2f-b912-8dd1e2f95da0",
          clientSecret: "VJNwkfbPcMZl4bOa1Qn3XtYRz6rqigwtTgOlaYX25Xs=",
        },
      },
      enableDebugging: false,
      appMetaData: {
        appName: "AI4Work",
        appIcon: "https://ai4web.com/wp-content/uploads/2023/01/cropped-cropped-ai4web-logo-1-180x180.png",
      },
    });

    setAuthResult({ data, clientId });
  }, []);

  if (!authResult) {
    return <AuthGate onAuthorized={handleAuthorized} />;
  }

  return <ChatInterfaceContent />;
};

export default ChatInterfaceDemo;
