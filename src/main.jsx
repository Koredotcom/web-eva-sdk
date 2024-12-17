import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = 'OM2E8kTERGXB61ChT8H8WOPlcPufKQM1TDwWe_twnZtXP9rXWNj-MEDMxAPpEQd4'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/',
    userId: 'u-ccdab3b7-4a58-523a-812a-b20c8fccb87d'
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

