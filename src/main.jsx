import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = '5CG788Z8rV-uZZYYceYgcMbqTZwWcfxEAhobGTifximk6S9VinyHbHpuIMh52BYZ'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/1.1/',
    userId: "u-2efc7b68-7bd0-596a-96c1-83ee5d58bfbe"
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

