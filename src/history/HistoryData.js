import { Timedifference } from '../utils/helpers';
import moment from 'moment';
import store from "../redux/store";

const HistoryData = async (props) => {
  const dataStructuring = (el) => {
    return {
      id: el?.id,
      name: el.name,
      messageCount: `${el?.messageCount} ${el?.messageCount > 1 ? "Conversations" : "Conversation"}`,
      time: moment(el?.lastModified).format("h:mm A"),
      lastModified: el?.lastModified
    }
  }

  const postCallMethod = (data) => {
    return data.map(el => {
      return dataStructuring(el)
    })
  };

  return new Promise((resolve) => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const { status, error, data } = state.global.history;
      if (status !== 'loading') {
        unsubscribe();
        resolve({
          status,
          error,
          data: postCallMethod(data?.boards || []),
          hasMore: data?.moreAvailable || false
        });
      }
    });
  });
};

export default HistoryData;
