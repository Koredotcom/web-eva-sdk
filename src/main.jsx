import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup
import { authenticateApp } from './authorization';



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
  id_token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzYWkudmFuZ2F2ZXRpQGtvcmUuY29tIiwiZmlyc3ROYW1lIjoic2FpIiwibGFzdE5hbWUiOiJzYW50aG9zaCIsImFwcElkIjoiY3MtNGE2MjZhYmEtMWU3ZS01NzQ2LTg0ZjMtYWVjZThkNzFkYTc5IiwiaWF0IjoxNzc2NzU1NTMwMjQ4LCJleHAiOjE3NzY3NTU2NTY5MTl9.PnFek9nZPwA2_SEyRqNE1YsLkKyhw8weD3QG2ihPsU0",
}).then((res) => {
  console.log(res);
});



ReactDOM.createRoot(document.getElementById('root')).render(<App />)

