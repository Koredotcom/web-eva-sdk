import React, { useEffect } from 'react';
import { HistoryData } from './history';
// import { User, Counter, Chat, Menu } from './components';

const App = () => {
  useEffect(() => {
    fetchHistoryData()
  }, [])

  const fetchHistoryData = async () => {
    const res = await HistoryData()
    console.log(res)
  }
  
  return (
    <div>
      <h1>Hello, Vite with React! EEEEEEE</h1>
    </div>
  )
}

export default App;
