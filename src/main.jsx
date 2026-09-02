import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup
import { authenticateApp } from './Authorization';



const getAccessToken = 'bgKlPSpWIdHeyvFEeCTTDYFLgeBzFQaogc6sEVvLNt8HKvvbJG0dgbGt9H4lbT3s'; 
// initializeSDK({
//     accessToken: getAccessToken,
//     api_url: 'https://eva-qa.kore.ai/api/1.1/',
//     presence_url: 'https://eva-qa.kore.ai/',
//     userId: "u-c9d2b051-ca8c-53cf-a808-a1becbc4d981",
//     initializeBotSDK:{
//         "name": "ProcureBot",
//         "streamId": "st-b6012ef2-810d-5240-b33e-5404d68b680e",
//         "webhook": {            
//             "clientId": "cs-79a89a6f-b0ab-5e2f-b912-8dd1e2f95da0",
//             "clientSecret": "VJNwkfbPcMZl4bOa1Qn3XtYRz6rqigwtTgOlaYX25Xs="
//         },
//     },
//     enableDebugging: true,
//     autoRemoveWebSearchFromContext: false // this flag helps to set the context after advancedSearch
// });

authenticateApp({
  id_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJrYXJ0aGlrLnByYXR1cmlAa29yZS5jb20iLCJmaXJzdE5hbWUiOiJrYXJ0aGlrIiwibGFzdE5hbWUiOiJwcmF0dXJpIiwiYXBwSWQiOiJjcy1hOTY4NTQwMy04NDBkLTU3NGItOGM2Ny1mMjA5YzMyZWFkNDIiLCJpYXQiOjE3ODgyNjcwMDIsImV4cCI6MTgxOTgwMzAwMn0.7lHuvZQkQwxh_zXsZ2jCSIVJI6TfhAQM2QCt72H-y1A",
}).then((res) => {
  console.log(res);
});


ReactDOM.createRoot(document.getElementById('root')).render(<App />)
