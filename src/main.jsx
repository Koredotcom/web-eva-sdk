import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = 'UIUANTR-rFQDAxbZis9U_DU1lczKoVS6fftjNVPDFnr_m3leFHUQPejDwSb7c2R6'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/1.1/',
    userId: 'u-f3abd2ad-4b0f-51ae-894e-5e8f45fb881a'
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

