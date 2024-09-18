import React, { useEffect } from 'react';
import { HistoryWidget, PossibilitiesWidget } from './widgets';
import ChatTestComp from './test-comp/ChatTestComp';
import File from './test-comp/File';
import Agents from './test-comp/agents';


const App = () => {

  useEffect(() => {
    fetchHistoryWidgetData()
    fetchPossiblitiesWidgetData()
  }, [])

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
      <ChatTestComp/>
      <Agents />
      <File />
    </div>
  )
}

export default App;
