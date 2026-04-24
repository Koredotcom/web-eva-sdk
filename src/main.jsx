import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { authenticateApp } from "./index";

/**
 * Dev entry: SSO then mount the bottom-right floating chat (CDN pattern).
 * Pass `skipInitializeSDK: true` so `initializeSDK` runs once inside `chatBot.init`
 * with `containerId: eva-sdk-chatbot-container`.
 */
authenticateApp({
  id_token:
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzYWkudmFuZ2F2ZXRpQGtvcmUuY29tIiwiZmlyc3ROYW1lIjoic2FpIiwibGFzdE5hbWUiOiJzYW50aG9zaCIsImFwcElkIjoiY3MtNGE2MjZhYmEtMWU3ZS01NzQ2LTg0ZjMtYWVjZThkNzFkYTc5IiwiaWF0IjoxNzc2NzU1NTMwMjQ4LCJleHAiOjE3NzY3NTU2NTY5MTl9.PnFek9nZPwA2_SEyRqNE1YsLkKyhw8weD3QG2ihPsU0",
  skipInitializeSDK: true,
}).then((res) => {
  if (res.status === "success" && typeof window !== "undefined" && window.EvaSDK?.chatBot) {
    window.EvaSDK.chatBot.init({
      accessToken: res.accessToken,
      userId: res.userId,
      api_url: res.api_url,
      presence_url: res.presence_url,
      enableDebugging: true,
      autoRemoveWebSearchFromContext: false,
    });
  } else {
    console.error("Eva auth or chatbot unavailable", res);
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
