import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App";
import { initializeSDK} from './index'; // Adjust the import according to your SDK setup

const getAccessToken = 'VvbYelSwP3CBGYV0rKjWzodoD2l_h_xZ0lc0QEkJj10OuwmqsHTR4iZLVjzR5MHA'; 
initializeSDK({
    accessToken: getAccessToken,
    api_url: 'https://eva-qa.kore.ai/api/',
    userId: 'u-c9d2b051-ca8c-53cf-a808-a1becbc4d981'
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

