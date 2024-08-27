import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = 'jzs1epo5d3Y6BMT8IOj6M96IHouDzy138x1-b3PJj-NVghvwXmmrIa-z7zsWW9vY'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/1.1/',
    userId: 'u-ccdab3b7-4a58-523a-812a-b20c8fccb87d'
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

