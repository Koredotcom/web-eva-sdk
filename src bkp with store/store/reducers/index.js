import { combineReducers } from 'redux';
import historyReducer from './history';

const rootReducer = combineReducers({
  history: historyReducer,
  // Add more reducers here
});

export default rootReducer;
