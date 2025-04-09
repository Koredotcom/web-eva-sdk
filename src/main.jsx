import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeSDK } from "./index"; // Adjust the import according to your SDK setup

const getAccessToken =
	"81rfr5nyv7UET6b7irM5m2VWkVH8y22YVJnNNljtEJJsJC4xrwoMfkHbviHXlRWA";
initializeSDK({
	accessToken: getAccessToken,
	api_url: "https://eva-dev.kore.ai/api/",
	presence_url: "https://eva-dev.kore.ai/",
	userId: "u-6ee27e85-216a-5df9-9792-a202f42a00f7",
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
