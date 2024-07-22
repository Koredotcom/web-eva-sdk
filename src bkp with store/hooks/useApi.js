import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const useApi = (endpoint, method = 'GET', options = {}) => {
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
      } catch (error) {
        setError(error);
        setStatus('error');
      }
    };

    fetchData();
  }, [endpoint, method, options]);

  return { data, status, error };
};

export default useApi;
