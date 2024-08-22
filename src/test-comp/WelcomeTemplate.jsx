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
                    {/* {item?.templateInfo?.suggestions?.[0]?.utterances?.length} */}
                    <div className='ansdocwrap'>
                        {/* <div className='filenew'>
                            <Filetwo size={22} />
                        </div> */}
                        <div className='chipheadertype'>{item?.templateInfo?.suggestions?.[0]?.title}</div>
                    </div>
                    <div className='mulanschip'>
                        {item?.templateInfo?.suggestions?.[0]?.utterances?.map((utterance, i) => {
                            return (
                                <div className='chipone'
                                    onClick={()=> InvokeGptAgentTemplate({item, utterance})}
                                    // onClick={() => {
                                    //     if (!item?.templateInfo?.suggestions?.[0]?.comingSoon) {

                                            


                                    //         // let question = utterance?.label
                                    //         // // if (utterance?.action === "createSession" && utterance?.source === "attachment") {
                                    //         // //     {<BotConversation />}
                                    //         // // }
                                    //         // // }
                                    //         // // if (utterance?.action === "createSession" && utterance?.source === "text") {
                                    //         // //     return <SummarizeAgent />;
                                    //         // if (utterance?.action === "createSession" && utterance?.source === "attachment") {
                                    //         //     // setOpenUploadComp(true)
                                    //         //     document.querySelector("#kiaasFileAttachment").click()
                                    //         //     return
                                    //         // }

                                    //         // if (utterance?.action === "createSession" && utterance?.source === "text"){
                                    //         //     eventBus.dispatch("displayOverlay")
                                    //         //     return
                                    //         // }
                                    //         // window.universalSearch({ suggestionAfterConnection: true, question, selectedContext })
                                    //         // if (utterance?.action === "createSession" && (utterance?.source === "translate" || utterance?.source === "summarizer")){
                                    //         //     // <TranslateFromView />
                                    //         //     // setTranslateComp(true)
                                    //         //     window.universalSearch({ suggestionAfterConnection: true, question })
                                    //         // }

                                    //         // if (utterance?.action) {
                                    //         //     window.universalSearch({ suggestionAfterConnection: true, question })
                                    //         // }

                                    //     }
                                    // }}
                                    >
                                    <div className='leftBlock'>
                                        {/* <span className='tickmarkicon'>
                                            <TickMark color="#98A2B3" size={13} />
                                        </span> */}
                                        <span className='newtext' key={i}>{utterance?.label}</span>
                                    </div>
                                    {item?.utterances?.isNew &&
                                        <div className='rightBlock'>
                                            {/* <div className='rbIcon'><StarsIcon size={12} color='#12B76A' /></div> */}
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
