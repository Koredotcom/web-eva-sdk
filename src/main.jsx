import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup



const getAccessToken = '67zpv0_OIsu0th5G5n0A3gbMBJ312KfIHKmzmAgZ4xKNow02kX-ZMl06snflv-S-'; 
// initializeSDK({
//     accessToken: getAccessToken,
//     api_url: 'https://work-qa.kore.ai/api/',
//     presence_url: 'https://work-qa.kore.ai/',
//     userId: "u-82f7e419-e905-5a5c-8634-831763a65174",
//     initializeBotSDK:{
//         "name": "ProcureBot",
//         "streamId": "st-b6012ef2-810d-5240-b33e-5404d68b680e",
//         "webhook": {            
//             "clientId": "cs-79a89a6f-b0ab-5e2f-b912-8dd1e2f95da0",
//             "clientSecret": "VJNwkfbPcMZl4bOa1Qn3XtYRz6rqigwtTgOlaYX25Xs="
//         },
//     },
//     enableDebugging: false,
//     appMetaData: {
//         appName: "AI4Work",
//         appIcon: "https://ai4web.com/wp-content/uploads/2023/01/cropped-cropped-ai4web-logo-1-180x180.png"
//     }
// });



ReactDOM.createRoot(document.getElementById('root')).render(<App />)

