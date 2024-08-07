import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = 'ph51m2wyswN9qbUefT1-jB5CKn9-ssbY8fds97sAFGfGVa26h-f3iu6TSUEN-TQH'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-dev.kore.ai/api/1.1/',
    userId: 'u-f4f3cacc-d84d-50e1-a0e1-7196ea7c6a2b'
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

