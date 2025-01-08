import React from "react"
import ReactDOM from 'react-dom/client'
import './HoldConversation.scss'
const HoldConversationTemplateManager = () => {
    const renderMessage = (data) => {
        const e = React.createElement;
        const domContainer = document.createElement('div');
        const root = ReactDOM.createRoot(domContainer);
        if (data && data?.message && data?.message?.[0]?.component && data?.message?.[0]?.component?.payload && data?.message?.[0]?.component?.payload?.template_type === 'hold_conversation'){
            root.render(
                <div className='holdConversation'>
                    <div className='iconLeft'>
                        {/* <Away size={22} /> */}
                    </div>
                    <div className='contentRight'>
                        <div className='title'>{data?.message?.[0]?.component?.payload?.title}</div>
                        <div className='description'>{data?.message?.[0]?.component?.payload.description}</div>
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

export default HoldConversationTemplateManager