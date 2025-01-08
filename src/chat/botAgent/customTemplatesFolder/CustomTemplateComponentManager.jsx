import React from "react"
import ReactDOM from 'react-dom/client'
const CustomTemplateComponentManager = () => {
    const renderMessage = (data) => {
        const e = React.createElement;
        const domContainer = document.createElement('div');
        const root = ReactDOM.createRoot(domContainer);
        if (data && data?.message && data?.message?.[0]?.component && data?.message?.[0]?.component?.payload && data?.message?.[0]?.component?.payload?.template_type === 'custom_weather_template'){
            root.render(
                <div style={{ background: "#c1c172" }}>
                    <div>
                        <img src="https://ssl.gstatic.com/onebox/weather/64/partly_cloudy.png" />
                        <h1>Temp {data.message[0].component.payload.temparature}</h1>
                        <p>weather-template works! msgId-{data?.messageId}</p>
                        <p>weather-template works! msgId-{data?.messageId}</p>
                        <button onClick={console.log("on click worked")}>Test</button>
                    </div>
                </div>
            );
            return domContainer
        }else{
            return false;
        }
    }
    return { renderMessage };
}

export default CustomTemplateComponentManager