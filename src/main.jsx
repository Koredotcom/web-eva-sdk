import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = 'coLMmnNcL11yI-p8XCk-Sa8KF3cbUZgVa9Bpk4W0o9Pen9n8cVHGAkm14bUGMxIu'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-dev.kore.ai/api/1.1/',
    userId: 'u-f4f3cacc-d84d-50e1-a0e1-7196ea7c6a2b'
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

