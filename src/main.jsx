import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = 'aLnFT0nhDkRUr6bJXOQzM7EPUKJPPtb8nBAVveITwMAxQP1PrdVsytycVzy_ABEo'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/1.1/',
    userId: "u-ccdab3b7-4a58-523a-812a-b20c8fccb87d"
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

