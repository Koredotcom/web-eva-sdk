import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const useApi = (endpoint, method = 'GET', options = {}, callback) => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const response = await axiosInstance({
          url: endpoint,
          method,
          ...options,
        });
        setData(response.data);
        setStatus('success');
        if(callback) {
          callback(null, response.data)
        }
      } catch (error) {
        setError(error);
        setStatus('error');
        if(callback) {
          callback(error, null)
        }
      }
    };

    fetchData();
  }, []);

  return { data, status, error };
};

export default useApi;
