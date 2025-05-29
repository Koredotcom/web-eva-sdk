import React from "react";

const Composebar = ({quickActions, chatInterface, input, setInput, messages}) => {

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


  return (
    <div>
      <div>
        {quickActions?.map((item) => {
          return (
            <div
              key={item?.id}
              onClick={() => {
                chatInterface.current.askQuickActions(item);
              }}
            >
              {item?.label}
            </div>
          );
        })}
        <textarea
          id="composeBar"
          onKeyDown={onChange}
          onInput={(event) => setInput(event.target.value)}
          value={input}
          placeholder="Ask question..."
        />
      </div>
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
  );
};

export default Composebar;
