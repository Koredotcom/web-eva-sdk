import { Timedifference } from '../utils/helpers';
import moment from 'moment';
import axiosInstance from '../api/axiosInstance';

const HistoryData = async (props) => {
  let sortedObj = {}, hasMore = false, status = '', error = null;

  const dataStructuring = (el) => {
    return {
      id: el?.id,
      name: el.name,
      messageCount: `${el?.messageCount} ${el?.messageCount > 1 ? "Conversations" : "Conversation"}`,
      time: moment(el?.lastModified).format("h:mm A"),
      lastModified: el?.lastModified
    }
  }

  const postCallMethod = (error, data) => {
    if (error) {
      // console.error('API call failed:', error);
    } else {
      // console.log('API call succeeded:', data);
      data?.boards?.map(el => {
        let dayscnt = Timedifference(el?.lastModified);
        if (sortedObj[dayscnt]) {
          sortedObj[dayscnt].push(dataStructuring(el));
        }
        else {
          sortedObj[dayscnt] = [];
          sortedObj[dayscnt].push(dataStructuring(el));
        }
      })
      hasMore = data.moreAvailable
    }
  };

  try {
    const params = {
      limit: props?.limit || 20,
    }
    const response = await axiosInstance({
      url: 'kora/boards?type=history',
      method: 'GET',
      params,
    });
    status = 'success'
    postCallMethod(null, response.data)
  } catch (error) {
    status = 'error'
    error = error
    postCallMethod(error)
  }

  return { data: sortedObj, hasMore, status, error }
};

export default HistoryData;
