import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = 'fUId9prjQBbba9OcYXo9Ca9Q4E6l88lcsmykJf7qo9EdwswVxdNJxghXs7j1SM5h'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/1.1/',
    userId: 'u-f3abd2ad-4b0f-51ae-894e-5e8f45fb881a'
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

