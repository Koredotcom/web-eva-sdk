import React from 'react';

// import { GlobalProvider } from './context/GlobalContext';

// const SDKProvider = ({ children }) => (
//     <GlobalProvider>
//         {children}
//     </GlobalProvider>
// );

// export { SDKProvider };
// Re-export all modules from nested directories
export { initializeSDK } from './config';
export * from './components';
export * from './history';
export * from './widgets';

// Redux store exports
export { default as store } from './redux/store';
export * from './redux/globalSlice';