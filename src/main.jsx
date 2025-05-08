import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeSDK } from "./index"; // Adjust the import according to your SDK setup

const getAccessToken =
	"6cNKBLJnGtZrXQ0cYQ5EmzBQdkQbg7QY63Q7yGPbYByhly6h2RLfj6-u2EdEDpvS";
initializeSDK({
	accessToken: getAccessToken,
	api_url: "https://inc-eva.kore.ai/api/",
	presence_url: "https://inc-eva.kore.ai/",
	userId: "u-208e413c-befb-5d5d-902f-2ad3e76caddf",
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
