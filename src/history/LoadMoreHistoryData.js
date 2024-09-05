
import moment from 'moment';
import { fetchHistory } from "../redux/actions/global.action";
import { setAllHistory } from "../redux/globalSlice";
import { Timedifference } from '../utils/helpers';
import store from "../redux/store"

let historyOffset = 1

const LoadMoreHistoryData = async (props) => {
  const params = {
    limit: props?.limit || 10,
    offset: props?.initialData ? 0 : null || historyOffset * (props?.limit || 10)
  }

  const state = store.getState();
  store.dispatch(setAllHistory({...state.global.AllHistory, status: 'loading'}))

  store.dispatch(fetchHistory({ loadmore: true, params }))
  historyOffset++

  const dataStructuring = (el) => {
    return {
      id: el?.id,
      name: el.name,
      messageCount: `${el?.messageCount} ${el?.messageCount > 1 ? "Conversations" : "Conversation"}`,
      time: moment(el?.lastModified).format("h:mm A"),
      lastModified: el?.lastModified
    }
  }

  const historyData = (data) => {
    let obj = []
    let sortedObj = {}
    if (props?.sorted) {
      data?.forEach(el => {
        let dayscnt = Timedifference(el?.lastModified);
        if (sortedObj[dayscnt]) {
          sortedObj[dayscnt].push(dataStructuring(el));
        }
        else {
          sortedObj[dayscnt] = [];
          sortedObj[dayscnt].push(dataStructuring(el));
        }
      })
      obj = sortedObj
    } else {
      obj = data.map(el => {
        return dataStructuring(el)
      })
    }
    return obj
  };

  return new Promise((resolve) => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const { status, error, data } = state.global.AllHistory;
      if (status !== 'loading') {
        unsubscribe();
        resolve({
          status,
          error,
          data: historyData(data?.boards || []),
          hasMore: data?.moreAvailable || false
        });
      }
    });
  });
};

export default LoadMoreHistoryData;
