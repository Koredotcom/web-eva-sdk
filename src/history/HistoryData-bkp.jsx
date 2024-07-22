import { useEffect, useRef, useState } from 'react';
import useApi from '../hooks/useApi';
import { Timedifference } from '../utils/helpers';
import moment from 'moment';

const HistoryData = props => {
  const [sortedData, setSortedData] = useState({});
  const [hasMore, setHasMore] = useState(false);
  const sortedObj = useRef({})

  const postCallMethod = (error, data) => {
    if (error) {
      // console.error('API call failed:', error);
    } else {
      // console.log('API call succeeded:', data);
      data?.boards?.map(el => {
        let dayscnt = Timedifference(el?.lastModified);
        if (sortedObj.current[dayscnt]) {
          sortedObj.current[dayscnt].push(dataStructuring(el));
        }
        else {
          sortedObj.current[dayscnt] = [];
          sortedObj.current[dayscnt].push(dataStructuring(el));
        }
      }
      )
      setSortedData(sortedObj.current);
      setHasMore(data.moreAvailable)
    }
  };

  const dataStructuring = (el) => {
    return {
      id: el?.id,
      name: el.name,
      messageCount: `${el?.messageCount} ${el?.messageCount > 1 ? "Conversations" : "Conversation"}`,
      time: moment(el?.lastModified).format("h:mm A"),
      lastModified: el?.lastModified
    }
  }

  const params = {
    limit: props?.limit || 20,
  }

  const { data, status, error } = useApi('kora/boards?type=history', 'GET', {params}, postCallMethod);

  return { data: sortedData, hasMore, status, error }
};

export default HistoryData;
