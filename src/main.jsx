import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = 'SZK4Vu_cgfPNtV7fHiAthVLeqqcnpAOVItm6y5te1Mi9Om3_lntrf_7MF1bANfOR'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/',
    userId: 'u-f3abd2ad-4b0f-51ae-894e-5e8f45fb881a'
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

