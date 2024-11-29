import React from "react";
import MultiResponse from "../chat/gptTemplate/MultiResponse";
import { GptFileUpload } from "../chat";

const MultiResponseTestComp = ({ item }) => {

    let forms = item?.gpt_forms;
    return (
        <>
            <div>
                {forms?.contextFields?.length > 0 && forms?.contextFields?.map((contextField, index) => {
                    return (
                        <>
                            <div className='contextFiledHeader'>Context</div>
                            {(contextField?.value?.type === "longText") && (
                                <>
                                    <div contentEditable="true" placeholder={contextField?.placeholder} value={contextField?.value} id={`inputValue-${contextField?.key}`}></div>
                                </>
                            )}
                            {(contextField?.value?.type === "simpleText") && (
                                <div contentEditable="true" placeholder={contextField?.value?.placeholder} value={contextField?.value} id={`inputValue-${contextField?.key}`}></div>
                            )}

                            {(contextField?.value?.type === "file") && (
                                <>
                                    <input type="file" id={`fileUpload-${contextField?.key}`} onChange={(e) => GptFileUpload(e, `${contextField?.key}`)}/>
                                    <button onClick={(e) => MultiResponse().removeFile(e, `${contextField?.key}`)} id = {`removeButton-${contextField?.key}`}style={{display: "none"}}>Remove</button>
                                </>
                            )}

                            {contextField?.value?.canUploadFile && (
                                <>  
                                    <input type="file" id={`fileUpload-${contextField?.key}`} onChange={(e) => GptFileUpload(e, `${contextField?.key}`)}/>
                                    <button onClick={(e) => MultiResponse().removeFile(e, `${contextField?.key}`)} id = {`removeButton-${contextField?.key}`}style={{display: "none"}}>Remove</button>
                                </>
                            )}
                        </>
                    )
                })}
                {forms?.fieldValues?.map((fieldValue, subIndex) => {
                    return (
                        <>
                            {subIndex > 0 && <button onClick={() => { MultiResponse().deleteAdditionalResponse(item, subIndex) }}>Delete</button>}
                            {fieldValue?.map((subItem, anotherIndex) => {
                                return (
                                    <>
                                        {(subItem?.value?.type === "dropdown" && subItem?.value?.multi) && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <select id={`dropdownValue-${subItem?.key}-${subIndex}`} multiple>
                                                    {subItem?.value?.choices?.map((choice, choiceIndex) => {
                                                        return <option value={choice?.id}>{choice?.label}</option>
                                                    })}
                                                </select>
                                            </>
                                        )}
                                        {(subItem?.value?.type === "dropdown" && !subItem?.value?.multi) && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <select id={`dropdownValue-${subItem?.key}-${subIndex}`} onChange={(e) => {if(subItem?.key === 'prompts'){MultiResponse().updatePrompt(item,subIndex, e.target.value)}}}>
                                                    {subItem?.value?.choices?.map((choice, choiceIndex) => {
                                                        return <option value={choice?.id}>{choice?.label}</option>
                                                    })}
                                                </select>
                                            </>
                                        )}
                                        {(subItem?.value?.type === "simpleText") && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <div key={subIndex} value={subItem?.value} contentEditable="true" id={`inputValue-${subItem?.key}-${subIndex}`} />
                                            </>
                                        )}
                                        {(subItem?.value?.type === "number") && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <input type="number" id={`inputValue-${subItem?.key}-${subIndex}`} />
                                            </>
                                        )}
                                        {(subItem?.value?.type === "longText") && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <div key={subIndex} value={subItem?.value} contentEditable="true" id={`inputValue-${subItem?.key}-${subIndex}`} />
                                            </>
                                        )}
                                        {(subItem?.value?.canUploadFile) && (
                                            <>  
                                                <input type="file" id={`fileUpload-${subItem?.key}-${subIndex}`} onChange={(e) => GptFileUpload(e, `${subItem?.key}-${subIndex}`)}/>
                                                <button onClick={(e) => MultiResponse().removeFile(e, `${subItem?.key}-${subIndex}`)} id = {`removeButton-${subItem?.key}-${subIndex}`} style={{display: "none"}}>Remove</button>
                                            </>
                                        )}
                                        {(subItem?.key === "prompt") && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <div id={`inputValue-${subItem?.key}-${subIndex}`} contentEditable={subItem?.value?.readOnly ? false : true}>{subItem?.value?.default}</div>
                                            </>
                                        )}
                                        {subItem?.value?.nested?.key === "prompt" && (
                                            <>  
                                                <div>{subItem?.value?.nested?.label}</div>
                                                <div id={`inputValue-${subItem?.key}-${subIndex}`} contentEditable={subItem?.value?.nested?.readOnly ? false : true}>{subItem?.value?.nested?.value}</div>
                                            </>
                                        )}
                                    </>
                                )
                            })}
                        </>
                    )
                })}
            </div>

            <button onClick={() => {
                MultiResponse().addAdditionalResponse(item)
            }}>Add</button>
            <button onClick={(e) => {
                MultiResponse().submitGPTForm(e, item)
            }}>Submit</button>
        </>
    )
}
export default MultiResponseTestComp;