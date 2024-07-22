import React from 'react'

// import { useDispatch, useSelector } from 'react-redux';
// import { fetchHistoryRequest } from '../store/actions/history';
import useApi from '../hooks/useApi';
const History = () => {
  const { data, status, error } = useApi('kora/boards?type=history&limit=20');
  // const dispatch = useDispatch();
  // const { data, loading, error } = useSelector(state => state.history);

  // useEffect(() => {
  //   dispatch(fetchHistoryRequest());
  // }, [dispatch]);

  // return { data, loading, error }
  // return <div>History</div>

  if (status === 'loading') return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>History</h2>
      {data?.boards?.length > 0 ? (
        data?.boards?.map((item, index) => (
          <p key={index}>{item.name}</p>
        ))
      ) : (
        <p>No history items found.</p>
      )}
    </div>
  );
};

export default History