import React, { useEffect, useState } from 'react';
import { HistoryData, LoadMoreHistoryData } from './history';
import { RecentFiles, LoadMoreRecentFiles } from './files';
import { HistoryWidget, PossibilitiesWidget } from './widgets';
import store from './redux/store';
import RecentAgents from './agents/RecentAgents';
import EnabledAgents from './agents/EnabledAgents';
import AllAgents from './agents/AllAgents';
import ChatTestComp from './test-comp/ChatTestComp';
import InitiateChatConversationAction from './chat/InitiateChatConversationAction';


const App = () => {

  const [agents, setAgents] = useState(null)

  // const res = HistoryData()
  //   console.log(res)
  useEffect(() => {
    fetchHistoryData()
    fetchHistoryWidgetData()
    fetchPossiblitiesWidgetData()
    fetchRecentAgentsData()
    fetchRecentFilesWidget()
    fetchEnabledAgentsData()
    fetchAllAgentsData()
    // fetchLoadMoreRecentFiles()

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
    console.log('history', res)
  }
  const fetchLoadMoreHistory = async () => {
    const res = await LoadMoreHistoryData({limit: 10})
    console.log('All History', res)
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
    // const resMore = await LoadMoreRecentFiles({limit: 12, offset: 2})
    // console.log('Load more -- Recent Files', resMore)
  }
  const fetchLoadMoreRecentFiles = async () => {
    const res = await LoadMoreRecentFiles({limit: 5,})
    console.log('All Recent Files', res)
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
      <button onClick={fetchLoadMoreHistory}>Load more history</button>
      <button onClick={fetchLoadMoreRecentFiles}>Load more recent files</button>
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
