import React from 'react';
import InitiateChatConversationAction from '../chat/InitiateChatConversationAction';
import InvokeGptAgentTemplate from '../chat/invokeGptAgentTemplate';

const AgentWelcomeTemplate = (props) => {

    const item = props?.item
    return (
        <>

            <div className='threadName maxLength'>{item?.answer}</div>
            <div className='threadName maxLength'>
                <div className='Answerschip msutteranceChip'>
                    <div className='ansdocwrap'>
                        
                        <div className='chipheadertype'>{item?.templateInfo?.suggestions?.[0]?.title}</div>
                    </div>
                    <div className='mulanschip'>
                        {item?.templateInfo?.suggestions?.[0]?.utterances?.map((utterance, i) => {
                            return (
                                <div className='chipone'
                                    onClick={()=> InvokeGptAgentTemplate({item, utterance})}
                                    >
                                    <div className='leftBlock'>
                                        <span className='newtext' key={i}>{utterance?.label}</span>
                                    </div>
                                    {item?.utterances?.isNew &&
                                        <div className='rightBlock'>
                                            <div className='rbText'>New</div>
                                        </div>
                                    }
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>

        </>
    )
}

export default AgentWelcomeTemplate
