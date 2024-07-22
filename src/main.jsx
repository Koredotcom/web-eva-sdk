import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = 'dEA6G_TDnmu_Vo0cL-ROFXpkmuaqg1W7g5c-GHhwxAKKgZPrLCwGn9YFjZ8c15d8'; 

initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-dev.kore.ai/api/1.1/'
});

import App from "./App";

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

