import React, { useEffect } from 'react';
import { HistoryWidget, PossibilitiesWidget } from './widgets';


const App = () => {

  useEffect(() => {
    fetchHistoryWidgetData()
    fetchPossiblitiesWidgetData()
  }, [])

  const fetchHistoryWidgetData = async () => {
    const res = await HistoryWidget({limit: 3, unsorted: true})    
  }
  const fetchPossiblitiesWidgetData = async () => {
    const res = await PossibilitiesWidget()    
  }

  
  
  return (
    <div className="eva-sdk-demo-app-root" style={{ minHeight: '100vh' }}>
      <p style={{ padding: '1rem', fontFamily: 'var(--sdk-font-family, system-ui)' }}>
        Floating chat opens from the bottom-right (see <code>EvaSDK.chatBot</code> in <code>main.jsx</code>).
      </p>
    </div>
  )
}

export default App;
