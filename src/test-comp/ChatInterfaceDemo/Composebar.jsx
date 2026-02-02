import React, { useRef, useEffect } from "react";
import { NewChat } from "../../chat";
import { FileUpload } from "../../Attachments";

const Composebar = ({quickActions, chatInterface, input, setInput, messages}) => {
  const fileUploadRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    // Initialize FileUpload instance
    if (!fileUploadRef.current) {
      fileUploadRef.current = FileUpload();
    }
  }, []);

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

  const handleFileUpload = (event) => {
    if (fileUploadRef.current && event.target.files.length > 0) {
      fileUploadRef.current.uploadFile(event);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };


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
          className="file-upload-btn"
          onClick={triggerFileUpload}
          title="Upload files"
        >
          📎
        </button>
        <button
          onClick={() =>
          chatInterface.current.sendMessage(input, messages?.[messages?.length - 1])
          }
        >
          Send
        </button>
        <button onClick={() => NewChat()}>+New</button>
        <button onClick={() => chatInterface.current.cancelMessageReqAction()}>
          Stop
        </button>
        
      </div>
    </div>
  );
};

export default Composebar;
