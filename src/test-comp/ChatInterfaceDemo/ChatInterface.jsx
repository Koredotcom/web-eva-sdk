import React, { useEffect, useRef, useState } from "react";
import { TemplateRenderer } from "../../templateRenderer";
import { BotConversation, ChatInterface} from "../../chat";
import store from "../../redux/store";
import { feedback_V2, feedbackDislikeCategories } from "../../Feedback";

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
  const handleMessageFeedback = async (item, feedbackType) => {
    const state = store.getState().global;
    const boardId = state.activeBoardId;
    const messageId = item?.messageId;
    /*console log feedbackDislikeCategories */
    console.log("feedbackDislikeCategories", feedbackDislikeCategories());
    const cId = item?.cId;
    if (!boardId || !messageId) {
      if (state?.enableDebugging) {
        console.warn("feedback_V2 skipped: missing boardId or messageId", {
          boardId,
          messageId,
        });
      }
      return;
    }
    const latest = store.getState().global.questions[cId] || item;
    const currentFeedback =
      latest?.userFeedback?.type ?? latest?.feedback;
    const isUndo =
      (feedbackType === "like" && currentFeedback === "like") ||
      (feedbackType === "dislike" && currentFeedback === "dislike");
    try {
      if (isUndo) {
        await feedback_V2({
          boardId,
          messageId,
          cId,
          action: "undo",
        });
      } else if (feedbackType === "like") {
        await feedback_V2({
          boardId,
          messageId,
          cId,
          feedback: "like",
          category: [],
          comment: "",
        });
      } else {
        await feedback_V2({
          boardId,
          messageId,
          cId,
          feedback: "dislike",
          category: ["demo"],
          comment: "",
        });
      }
    } catch (err) {
      if (store.getState().global?.enableDebugging) {
        console.error("feedback_V2 failed", err);
      }
    }
  };

  const [messages, setMessages] = useState(null);
  const [quickActions, setQuickActions] = useState(null);
  const [input, setInput] = useState("");
  const [showSchedulers, setShowSchedulers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [filePreview, setFilePreview] = useState(null); // { fileName, fileExtension, fileId, signedUrl, originalSignedUrl, loading, error }

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
      (question, searchResponse, moreAvailable, errorStates, quickActions) => {
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
        onSubscribe(question, searchResponse, moreAvailable, errorStates, quickActions);
      }
    );

    const unsubscribeChipClick = chatInterface.current.onAttachmentChipClick(async (fileData) => {
      const { fileName, fileExtension } = fileData;
      console.log('[EVA-SDK Demo] Attachment chip clicked:', fileData);

      setFilePreview({ fileData, fileName, fileExtension, signedUrl: null, originalSignedUrl: null, loading: true, error: null });

      const { fileId, messageId } = fileData;
      const result = await chatInterface.current.fetchSignedMediaURL({ msgId: messageId, fileId });

      if (result?.error) {
        setFilePreview((prev) => ({ ...prev, loading: false, error: 'Failed to load file preview.' }));
      } else {
        const originalSignedUrl = result?.mediaUrl || result?.url || result?.downloadUrl || result?.res?.mediaUrl || result?.res?.url || result?.res?.downloadUrl;
        try {
          const resp = await fetch(originalSignedUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            setFilePreview((prev) => ({ ...prev, loading: false, signedUrl: blobUrl, originalSignedUrl, _blobUrl: blobUrl }));
          } else {
            setFilePreview((prev) => ({ ...prev, loading: false, signedUrl: originalSignedUrl, originalSignedUrl }));
          }
        } catch {
          setFilePreview((prev) => ({ ...prev, loading: false, signedUrl: originalSignedUrl, originalSignedUrl }));
        }
      }
    });

    return () => {
      unsubscribe();
      unsubscribeChipClick();
    };
  }, [onSubscribe]);

  const handleDownload = async () => {
    const { fileData, originalSignedUrl, fileName } = filePreview || {};
    if (!fileData || !originalSignedUrl) return;
    try {
      const resp = await fetch(originalSignedUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } else {
        window.open(originalSignedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(originalSignedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const renderFilePreviewSidebar = () => {
    if (!filePreview) return null;
    const { fileName, fileExtension, signedUrl, originalSignedUrl, loading, error } = filePreview;
    const ext = (fileExtension || '').toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
    const isPdf = ext === 'pdf';
    // Images/PDFs use blob URL; Office docs need the original signed URL (blob URLs are not externally accessible)
    const previewUrl = isPdf || isImage
      ? signedUrl
      : originalSignedUrl ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(originalSignedUrl)}` : null;

    return (
      <div style={{ position: 'fixed', top: 0, right: 0, width: '420px', height: '100vh', background: '#fff', boxShadow: '-4px 0 16px rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0, gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={fileName}>{fileName}</span>
          <button
            onClick={handleDownload}
            disabled={!filePreview?.originalSignedUrl}
            title="Download file"
            style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
          >
            ⬇ Download
          </button>
          <button onClick={() => {
            if (filePreview?._blobUrl) URL.revokeObjectURL(filePreview._blobUrl);
            setFilePreview(null);
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {loading && <span style={{ color: '#6b7280', fontSize: '14px' }}>Loading preview…</span>}
          {error && <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>}
          {!loading && !error && previewUrl && isImage && (
            <img src={previewUrl} alt={fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
          {!loading && !error && previewUrl && !isImage && (
            <iframe src={previewUrl} title={fileName} style={{ width: '100%', height: '100%', border: 'none' }} />
          )}
          {!loading && !error && !previewUrl && (
            <span style={{ color: '#6b7280', fontSize: '14px' }}>No preview available.</span>
          )}
        </div>
      </div>
    );
  };

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
          <div className="sidebar-nav-item" onClick={() => {
            setShowAgents(prev => !prev);
          }} role="button" tabIndex={0}>Get Agents</div>
          {/* {showAgents ? <Agents /> : null} */}
          {/* <div className="sidebar-nav-item" onClick={() => {
            setShowSchedulers(true);
            setShowAgents(false);
            setShowProfile(false);
          }} role="button" tabIndex={0}>Schedulers</div> */}
          {/* <div className="sidebar-nav-item" onClick={() => {
            setShowProfile(true);
            setShowAgents(false);
            setShowSchedulers(false);
          }} role="button" tabIndex={0}>Profile</div> */}
          {/* <Announcements /> */}
          <History />
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
            <div ref={messagesContainerRef} />
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
      {renderFilePreviewSidebar()}
    </div>
  );
};

export default ChatInterfaceDemo;
