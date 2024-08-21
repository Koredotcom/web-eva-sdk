import React, { useEffect, useState } from 'react';
import { HistoryData } from './history';
import { RecentFiles } from './recent';
import { HistoryWidget, PossibilitiesWidget } from './widgets';
// import { User, Counter, Chat, Menu } from './components';

import { increment, decrement } from './redux/globalSlice';
import store from './redux/store';
import RecentAgents from './agents/RecentAgents';
import EnabledAgents from './agents/EnabledAgents';
import AllAgents from './agents/AllAgents';
import ChatTestComp from './chat/ChatTestComp';
import InitiateChatConversationAction from './chat/InitiateChatConversationAction';


const App = () => {

  const [agents, setAgents] = useState(null)

  // const res = HistoryData()
  //   console.log(res)
  useEffect(() => {
    // fetchHistoryData()
    // fetchHistoryWidgetData()
    // fetchPossiblitiesWidgetData()
    fetchRecentAgentsData()
    // fetchEnabledAgentsData()
    // fetchAllAgentsData()
    fetchRecentFilesWidget()

    // Initial render
    // render();

    // Subscribe to store updates
    // store.subscribe(render);
  }, [])

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
  const fetchRecentAgentsData = async () => {
    const res = await RecentAgents()
    console.log(res)
    setAgents(res)
  }
  const fetchEnabledAgentsData = async () => {
    const res = await EnabledAgents()
    console.log(res)
  }
  const fetchAllAgentsData = async () => {
    const res = await AllAgents()
    console.log(res)
  }
  const fetchRecentFilesWidget  = async () => {
    const res = await RecentFiles()
    console.log('Recent Files', res)
  }

  const agentHandler = (agent) => {
    const payload = {
      intent: "welcome",
      question: "How can the \"Summarizer\" agent assist me",
      source: agent?.id
    }
    InitiateChatConversationAction({payload})
  }
  
  return (
    <div>
      {/* <h1>Hello, Vite with React!</h1>
      <div className="Counter">
        <h1>Count: <span id="count">0</span></h1>
        <button id="increment" onClick={()=> store.dispatch(increment('4444'))}>Increment</button>
        <button id="decrement" onClick={()=> store.dispatch(decrement())}>Decrement</button>
      </div> */}
      <ChatTestComp />
      <ul>
        {agents && agents.data.map(agent => {
          return (
            <li key={agent.id} onClick={()=> agentHandler(agent)}>{agent.name}</li>
          )
        })}
      </ul>
    </div>
  )
}

export default App;
