import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup



const getAccessToken = 'QXBti2TGjZL4IkxTwkZI3oxVM7JQk29SRb1QHPW9-4yx1otvR25gLFpAGn-Kegh-'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/',
    presence_url: 'https://eva-qa.kore.ai/',
    userId: "u-debac131-eacb-54b9-8461-c393ece88ba8",
    initializeBotSDK:{
        "name": "ProcureBot",
        "streamId": "st-b6012ef2-810d-5240-b33e-5404d68b680e",
        "webhook": {
            "clientId": "cs-79a89a6f-b0ab-5e2f-b912-8dd1e2f95da0",
            "clientSecret": "VJNwkfbPcMZl4bOa1Qn3XtYRz6rqigwtTgOlaYX25Xs="
        }
    },
    enableDebugging: false
});



ReactDOM.createRoot(document.getElementById('root')).render(<App />)

