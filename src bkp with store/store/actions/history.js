import {
    FETCH_HISTORY_REQUEST,
    FETCH_HISTORY_SUCCESS,
    FETCH_HISTORY_FAILURE
  } from '../constants/history';
  
  export const fetchHistoryRequest = () => ({
    type: FETCH_HISTORY_REQUEST,
  });
  
  export const fetchHistorySuccess = (data) => ({
    type: FETCH_HISTORY_SUCCESS,
    payload: data,
  });
  
  export const fetchHistoryFailure = (error) => ({
    type: FETCH_HISTORY_FAILURE,
    payload: error,
  });
  