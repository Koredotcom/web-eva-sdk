import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup



const getAccessToken = 'yRkIXUQC-NzjEzZqKwMfKMhQfDu2qzEJE3YKTBZf3XJCR7mrPp-hUlo2kWKuQ0rm'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/',
    presence_url: 'https://eva-qa.kore.ai/',
    userId: 'u-c9d2b051-ca8c-53cf-a808-a1becbc4d981',
    initializeBotSDK:{
        "name": "ProcureBot",
        "streamId": "st-b6012ef2-810d-5240-b33e-5404d68b680e",
        "webhook": {
            "clientId": "cs-79a89a6f-b0ab-5e2f-b912-8dd1e2f95da0",
            "clientSecret": "VJNwkfbPcMZl4bOa1Qn3XtYRz6rqigwtTgOlaYX25Xs="
        }
    }
});



ReactDOM.createRoot(document.getElementById('root')).render(<App />)

