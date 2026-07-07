import React, { useRef, useEffect, useMemo } from "react";
import { NewChat } from "../../chat";
import { UploadFile } from "../../files";
import { orderBy } from "lodash";

const Composebar = ({quickActions, chatInterface, input, setInput, messages}) => {
  const fileInputRef = useRef();
  const sortedMessages = useMemo(() => orderBy(Object.values(messages || {}), 'cOn', 'asc'), [messages]);
  const latestQuestion = sortedMessages[sortedMessages.length - 1];

  const onChange = async (event) => {
		if (event.keyCode === 13 && !event.shiftKey) {
			event.preventDefault();
			const message = Object.values(messages);
			await chatInterface.current.sendMessage(
				input,
				message?.[message?.length - 1]
			);
			setInput("");
		}
	};

  const getUploadedFileId = (uploadResponse) => {
    const data = uploadResponse?.data;
    return data?.fileId || data?.fileUrl?.fileId || data?.fileUrl?.id || data?.id;
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const canAddToAutonomousAgent =
      latestQuestion?.context?.agentType === 'aAAgent' &&
      latestQuestion?.agentContext?.canUploadFile === true;

    for (const file of files) {
      const uploadResponse = await UploadFile({
        file,
        onProgress: (progress) => {
          console.log("file upload progress", file.name, progress);
        },
      });
      console.log("file upload response", uploadResponse);

      if (uploadResponse?.status === "success" && canAddToAutonomousAgent) {
        const fileId = getUploadedFileId(uploadResponse);
        if (fileId) {
          const addFileResponse = await chatInterface.current.addFileToAutonomousAgent({
            fileId,
            advanceSearchRes: latestQuestion,
            fileName: file.name,
            fileExtension: file.name.split('.').pop() || '',
          });
          console.log("addFileToAutonomousAgent response", addFileResponse);
        }
      }
    }

    event.target.value = "";
  };

  const triggerFileUpload = () => {
    console.log('triggered file upload')
    fileInputRef.current?.click();
  };

  const canUploadFile = latestQuestion?.agentContext?.canUploadFile === true;

  return (
    <div className="composebar-parent">
      <div className="composebar-area">
        <div className="guick-reply-container">
          {quickActions?.map((item) => {
            return (
              <div
                className="quick-reply-chip"
                key={item?.id}
                onClick={() => {
                  chatInterface.current.askQuickActions(item);
                }}
              >
                {item?.label}
              </div>
            );
          })}
        </div>
        <textarea
          id="composeBar"
          onKeyDown={onChange}
          onInput={(event) => setInput(event.target.value)}
          value={input}
          placeholder="Ask question..."
        />
      </div>

      <div className="composebar-buttons">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          multiple
          accept="*/*"
        />
        <button
          type="button"
          className="file-upload-btn"
          onClick={triggerFileUpload}
          title="Upload files"          
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M21.44 11.05L12.25 20.24C9.92 22.57 6.14 22.57 3.81 20.24C1.48 17.91 1.48 14.13 3.81 11.8L13.35 2.26C14.91 0.7 17.44 0.7 19 2.26C20.56 3.82 20.56 6.35 19 7.91L9.46 17.45C8.68 18.23 7.42 18.23 6.64 17.45C5.86 16.67 5.86 15.4 6.64 14.62L15.48 5.78"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() =>
          chatInterface.current.sendMessage(input, latestQuestion)
          }
        >
          Send
        </button>
        <button type="button" onClick={() => NewChat()}>+New</button>
        <button type="button" onClick={() => chatInterface.current.cancelMessageReqAction()}>
          Stop
        </button>
        
      </div>
    </div>
  );
};

export default Composebar;
