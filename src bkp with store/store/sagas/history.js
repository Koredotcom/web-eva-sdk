import { call, put, takeLatest } from 'redux-saga/effects';
import axiosInstance from '../../api/axiosInstance';
import {
  FETCH_HISTORY_REQUEST,
  fetchHistorySuccess,
  fetchHistoryFailure
} from '../actions/history';

function* fetchHistorySaga() {
  try {
    const response = yield call(axiosInstance.get, 'kora/boards?type=history&limit=20');
    yield put(fetchHistorySuccess(response.data));
  } catch (error) {
    yield put(fetchHistoryFailure(error.message));
  }
}

export default function* historySaga() {
  yield takeLatest(FETCH_HISTORY_REQUEST, fetchHistorySaga);
}
