import ChatInterface from "../../chat/ChatInterface";

const CustomWelcomeButtons = (item) => {
  item?.customButtons?.forEach((button, index) => {
    const buttonElement = document.getElementById(`custom-welcome-button-${item?.id}-${index}`);
    if (!buttonElement) return;

    buttonElement.onclick = () => {
      const value = button?.value || button?.payload || button?.label;
      if (!value) return;

      ChatInterface().initiateChatConversationAction({
        payload: { question: value },
      });
    };
  });
};

export default CustomWelcomeButtons;
