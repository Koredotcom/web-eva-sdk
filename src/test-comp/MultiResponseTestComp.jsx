import React from "react";
import { GptFileUpload } from "../chat";
import DeleteGPTResponse from "../chat/gptTemplate/deleteGPTResponse";
import UpdateGPTPromptValue from "../chat/gptTemplate/updateGPTPromptValue";
import AddAdditionalGPTResponse from "../chat/gptTemplate/addAdditionalGPTResponse";
import SubmitGPTForm from "../chat/gptTemplate/submitGPTForm";
import RemoveUploadedGPTFile from "../chat/gptTemplate/removeUploadedGPTFile";

const MultiResponseTestComp = ({ item }) => {

    let forms = item?.gpt_forms;
    return (
        <>
            <div>
                {forms?.contextFields?.length > 0 && forms?.contextFields?.map((contextField, index) => {
                    return (
                        <>
                            <div className='contextFiledHeader'>Context</div>
                            {(contextField?.value?.type === "longText" || contextField?.value?.type === "richText") && (
                                <>
                                    <div contentEditable="true" placeholder={contextField?.placeholder} value={contextField?.value} id={`inputValue-${contextField?.key}-${item?.messageId}`}></div>
                                </>
                            )}
                            {(contextField?.value?.type === "simpleText") && (
                                <div contentEditable="true" placeholder={contextField?.value?.placeholder} value={contextField?.value} id={`inputValue-${contextField?.key}-${item?.messageId}`}></div>
                            )}

                            {(contextField?.value?.type === "file" || contextField?.value?.canUploadFile) && (
                                <>
                                    <input type="file" id={`fileUpload-${contextField?.key}-${item?.messageId}`} onChange={(e) => GptFileUpload(e, `${contextField?.key}-${item?.messageId}`)}/>
                                    <button onClick={(e) => RemoveUploadedGPTFile(e, `${contextField?.key}-${item?.messageId}`)} id = {`removeButton-${contextField?.key}-${item?.messageId}`}style={{display: "none"}}>Remove</button>
                                </>
                            )}

                            {/* {contextField?.value?.canUploadFile && (
                                <>  
                                    <input type="file" id={`fileUpload-${contextField?.key}`} onChange={(e) => GptFileUpload(e, `${contextField?.key}`)}/>
                                    <button onClick={(e) => RemoveUploadedGPTFile(e, `${contextField?.key}`)} id = {`removeButton-${contextField?.key}`}style={{display: "none"}}>Remove</button>
                                </>
                            )} */}
                        </>
                    )
                })}
                {forms?.fieldValues?.map((fieldValue, subIndex) => {
                    return (
                        <>
                            {subIndex > 0 && <button onClick={() => { DeleteGPTResponse(item, subIndex) }}>Delete</button>}
                            {fieldValue?.map((subItem, anotherIndex) => {
                                return (
                                    <>
                                        {(subItem?.value?.type === "dropdown" && subItem?.value?.multi) && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <select id={`dropdownValue-${subItem?.key}-${item?.messageId}-${subIndex}`} multiple>
                                                    {subItem?.value?.choices?.map((choice, choiceIndex) => {
                                                        return <option value={choice?.id}>{choice?.label}</option>
                                                    })}
                                                </select>
                                            </>
                                        )}
                                        {(subItem?.value?.type === "dropdown" && !subItem?.value?.multi) && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <select id={`dropdownValue-${subItem?.key}-${item?.messageId}-${subIndex}`} >
                                                    {subItem?.value?.choices?.map((choice, choiceIndex) => {
                                                        return <option value={choice?.label}>{choice?.label}</option>
                                                    })}
                                                </select>
                                            </>
                                        )}
                                        {(subItem?.value?.type === "simpleText") && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <div key={subIndex} value={subItem?.value} contentEditable="true" id={`inputValue-${subItem?.key}-${item?.messageId}-${subIndex}`} />
                                            </>
                                        )}
                                        {(subItem?.value?.type === "number") && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <input type="number" id={`inputValue-${subItem?.key}-${item?.messageId}-${subIndex}`} />
                                            </>
                                        )}
                                        {(subItem?.value?.type === "longText") && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <div key={subIndex} value={subItem?.value} contentEditable="true" id={`inputValue-${subItem?.key}-${item?.messageId}-${subIndex}`} />
                                            </>
                                        )}
                                        {(subItem?.value?.canUploadFile) && (
                                            <>  
                                                <input type="file" id={`fileUpload-${subItem?.key}-${item?.messageId}-${subIndex}`} onChange={(e) => GptFileUpload(e, `${subItem?.key}-${item?.messageId}-${subIndex}`)}/>
                                                <button onClick={(e) => RemoveUploadedGPTFile(e, `${subItem?.key}-${item?.messageId}-${subIndex}`)} id = {`removeButton-${subItem?.key}-${item?.messageId}-${subIndex}`} style={{display: "none"}}>Remove</button>
                                            </>
                                        )}
                                        {(subItem?.key === "prompt") && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <div id={`inputValue-${subItem?.key}-${item?.messageId}-${subIndex}`} contentEditable={subItem?.value?.readOnly ? false : true}>{subItem?.value?.default}</div>
                                            </>
                                        )}
                                        {subItem?.value?.nested?.key === "prompt" && (
                                            <>  
                                                <div>{subItem?.value?.nested?.label}</div>
                                                <div id={`inputValue-${subItem?.key}-${item?.messageId}-${subIndex}`} contentEditable={subItem?.value?.nested?.readOnly ? false : true}>{subItem?.value?.nested?.value}</div>
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
                AddAdditionalGPTResponse(item)
            }}>Add</button>
            <button onClick={(e) => {
                SubmitGPTForm(e, item)
            }}>Submit</button>
        </>
    )
}
export default MultiResponseTestComp;