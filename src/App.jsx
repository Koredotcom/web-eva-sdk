import React, { useEffect } from 'react';
import { HistoryData } from './history';
import { HistoryWidget, PossibilitiesWidget } from './widgets';
// import { User, Counter, Chat, Menu } from './components';

import { increment, decrement } from './redux/globalSlice';
import store from './redux/store';

const App = () => {

  // const res = HistoryData()
  //   console.log(res)
  useEffect(() => {
    // fetchHistoryData()
    // fetchHistoryWidgetData()
    fetchPossiblitiesWidgetData()

    // Initial render
    render();

    // Subscribe to store updates
    store.subscribe(render);

    // Dispatch actions on button clicks
    // document.getElementById('increment').addEventListener('click', () => {
    //   store.dispatch(increment());
    // });

    // document.getElementById('decrement').addEventListener('click', () => {
    //   store.dispatch(decrement());
    // });
  }, [])

  // const countElement = document.getElementById('count');
  // const incrementButton = document.getElementById('increment');
  // const decrementButton = document.getElementById('decrement');

  const render = () => {
    const state = store.getState();
    document.getElementById('count').textContent = state.global.count;
  };

  const fetchHistoryData = async () => {
    const res = await HistoryData()
    console.log(res)
  }
  const fetchHistoryWidgetData = async () => {
    const res = await HistoryWidget({limit: 3, unsorted: true})
    console.log(res)
  }
  const fetchPossiblitiesWidgetData = async () => {
    const res = await PossibilitiesWidget()
    console.log(res)
  }
  
  return (
    <div>
      <h1>Hello, Vite with React!</h1>
      {/* <HistoryWidget /> */}
      {/* <PossibilitiesWidget /> */}

      <div className="Counter">
        <h1>Count: <span id="count">0</span></h1>
        <button id="increment" onClick={()=> store.dispatch(increment('4444'))}>Increment</button>
        <button id="decrement" onClick={()=> store.dispatch(decrement())}>Decrement</button>
      </div>
    </div>
  )
}

export default App;
