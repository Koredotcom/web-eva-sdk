import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup



const getAccessToken = 'JoObqq-qlcNXuc4CCA_SwGi85gMXVcaYK9NKe9QaldOsJscIwnPps3jwuyAHzncu'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/',
    presence_url: 'https://eva-qa.kore.ai/',
    userId: "u-c1cef8d6-6c10-5350-9dea-426b2d20c316",
    initializeBotSDK:{
        "name": "ProcureBot",
        "streamId": "st-b6012ef2-810d-5240-b33e-5404d68b680e",
        "webhook": {            
            "clientId": "cs-79a89a6f-b0ab-5e2f-b912-8dd1e2f95da0",
            "clientSecret": "VJNwkfbPcMZl4bOa1Qn3XtYRz6rqigwtTgOlaYX25Xs="
        },
    },
    enableDebugging: false
});



ReactDOM.createRoot(document.getElementById('root')).render(<App />)

