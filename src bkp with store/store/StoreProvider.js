import React from 'react';
import { Provider } from 'react-redux';
import store from './index';

const StoreProvider = ({ children }) => (
  <Provider store={store}>
    {children}
  </Provider>
);

export default StoreProvider;
