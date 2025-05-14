import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeSDK } from "./index"; // Adjust the import according to your SDK setup

const getAccessToken =
	"rH8ewRMpoIH609SymBjhFwU28FQOAhI3QXuOuPTOYXWZ1I8LkJ0a23L_G2P3Q3MK";
initializeSDK({
	accessToken: getAccessToken,
	api_url: "https://eva-qa.kore.ai/api/",
	presence_url: "https://eva-qa.kore.ai/",
	userId: "u-f3abd2ad-4b0f-51ae-894e-5e8f45fb881a",
	initializeBotSDK: {
		name: "ProcureBot",
		streamId: "st-b6012ef2-810d-5240-b33e-5404d68b680e",
		webhook: {
			clientId: "cs-79a89a6f-b0ab-5e2f-b912-8dd1e2f95da0",
			clientSecret: "VJNwkfbPcMZl4bOa1Qn3XtYRz6rqigwtTgOlaYX25Xs=",
		},
	},
});

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
