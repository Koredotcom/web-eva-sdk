import { all } from 'redux-saga/effects';
import historySaga from './history';

export default function* rootSaga() {
  yield all([
    historySaga(),
    // Add more sagas here
  ]);
}
