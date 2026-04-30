import React, { useEffect } from 'react';
import { HistoryWidget, PossibilitiesWidget } from './widgets';
import ChatTestComp from './test-comp/ChatTestComp';
import File from './test-comp/File';
import Agents from './test-comp/agents';
import SelectedContext from './test-comp/selectedContext';
import TestComp from "./test-comp/testComp";
import ChatInterfaceDemo from './test-comp/ChatInterfaceDemo/ChatInterface';
import { renderParentComponent } from './master-component/ParentComponent';


const App = () => {

  useEffect(() => {
    fetchHistoryWidgetData()
    fetchPossiblitiesWidgetData()
    // renderParentComponent('master-component')
    // if (typeof window !== 'undefined' && window.EvaSDK?.chatBot?.init) {
    //   EvaSDK.chatBot.init({
    //     // accessToken: "43NPDeg9AImcrzoVnJsyX8l-6zK0rMSxL22m7vx7MU-gDC3_ppFgbGYRMD6TpTOb",
    //     // api_url: "https://eva-qa.kore.ai/api/",
    //     // userId: "u-38c92791-2849-51d6-9453-1fe1fc6b90ef",
    //     title: "AI4W ChatInterface"
    //   });
    //   EvaSDK.chatInterface.configure({ disableAppAvatar: true });
    // }
  }, [])

  const fetchHistoryWidgetData = async () => {
    const res = await HistoryWidget({limit: 3, unsorted: true})    
  }
  const fetchPossiblitiesWidgetData = async () => {
    const res = await PossibilitiesWidget()    
  }

  
  
  return (
    <div className='aiforwork-app-container'>
      {/* <div id='master-component' className='master-component'></div>  */}
      {/* <ChatInterfaceDemo /> */}
      {/* <ChatTestComp/> */}
      {/* <TestComp /> */}
      {/* <Agents /> */}
      {/* <File /> */}
      {/* <SelectedContext/> */}
    </div>
  )
}

export default App;