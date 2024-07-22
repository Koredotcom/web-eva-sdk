import {
    FETCH_HISTORY_REQUEST,
    FETCH_HISTORY_SUCCESS,
    FETCH_HISTORY_FAILURE
  } from '../constants/history';
  
  const initialState = {
    loading: false,
    data: [],
    error: null,
  };
  
  const historyReducer = (state = initialState, action) => {
    switch (action.type) {
      case FETCH_HISTORY_REQUEST:
        return { ...state, loading: true };
      case FETCH_HISTORY_SUCCESS:
        return { ...state, loading: false, data: action.payload };
      case FETCH_HISTORY_FAILURE:
        return { ...state, loading: false, error: action.payload };
      default:
        return state;
    }
  };
  
  export default historyReducer;
  