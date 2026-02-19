import React, { useEffect, useState } from "react";
import { GptFileUpload } from "../chat";
import DeleteGPTResponse from "../chat/gptTemplate/deleteGPTResponse";
import UpdateGPTPromptValue from "../chat/gptTemplate/updateGPTPromptValue";
import AddAdditionalGPTResponse from "../chat/gptTemplate/addAdditionalGPTResponse";
import SubmitGPTForm from "../chat/gptTemplate/submitGPTForm";
import RemoveUploadedGPTFile from "../chat/gptTemplate/removeUploadedGPTFile";
import store from "../redux/store";
import { use } from "marked";
import { cloneDeep, set } from "lodash";

const MultiResponseTestComp = ({ item }) => {        
    let _forms = cloneDeep(item?.gpt_forms);
    const [files, setFiles] = useState({})
    const [forms, setForms] = useState(_forms);
    const [selectedPrompt, setSelectedPrompt] = useState(null);

    useEffect(() => {
        console.log("_forms", _forms);
        const _prompts = _forms?.fieldValues?.find(field => field?.key === "prompts");
        /*check whether prompts is having nested key or not */
        if(_prompts?.value?.nested){
            setSelectedPrompt(_prompts?.choices?.[0]);
        }
        console.log("selectedPrompt", selectedPrompt);
    }, []);

    /** Read the selected option from a dropdown in the DOM using id dropdownValue-${key}-${messageId}-${subIndex} */
    const getDropdownSelectedValue = (subItem, subIndex) => {
        const id = `dropdownValue-${subItem?.key}-${item?.messageId}-${subIndex}`;
        const selectEl = document.getElementById(id);
        if (!selectEl) return null;
        return selectEl.value; // value of the selected <option> (e.g. choice.label)
    };

    /** Same as above but returns the selected option element (for .textContent, .value, etc.) */
    const getDropdownSelectedOption = (subItem, subIndex) => {
        const id = `dropdownValue-${subItem?.key}-${item?.messageId}-${subIndex}`;
        const selectEl = document.getElementById(id);
        if (!selectEl || selectEl.selectedIndex < 0) return null;
        return selectEl.options[selectEl.selectedIndex];
    };

    return (
        <>
            <div>
                {forms?.contextFields?.length > 0 && forms?.contextFields?.map((contextField, index) => {
                    return (
                        <>
                            <div className='contextFiledHeader'>Context</div>
                            {((contextField?.value?.type === "longText" || contextField?.value?.type === "richText") && (!selectedPrompt || (selectedPrompt?.variables?.includes(contextField?.key)))) && (
                                <>
                                    <div contentEditable="true" placeholder={contextField?.placeholder} value={contextField?.value} id={`inputValue-${contextField?.key}-${item?.messageId}`}></div>
                                </>
                            )}
                            {((contextField?.value?.type === "simpleText") && (!selectedPrompt || (selectedPrompt?.variables?.includes(contextField?.key)))) && (
                                <div contentEditable="true" placeholder={contextField?.value?.placeholder} value={contextField?.value} id={`inputValue-${contextField?.key}-${item?.messageId}`}></div>
                            )}

                            {((contextField?.value?.type === "file" || contextField?.value?.canUploadFile) && (!selectedPrompt || (selectedPrompt?.variables?.includes(contextField?.key)))) && (
                                <>
                                    <input type="file" id={`fileUpload-${contextField?.key}-${item?.messageId}`} multiple onChange={
                                        async (e) => {
                                            try {
                                                const res = await GptFileUpload(e, `${contextField?.key}-${item?.messageId}`)
                                                setFiles(res)
                                            }    catch(err){
                                                console.log("error", err)
                                            }                                 
                                        
                                    }
                                        }/>                                    
                                    {files?.[`${contextField?.key}-${item?.messageId}`]?.map((file, fileIndex) => {
                                        return (
                                            <div key={fileIndex}>
                                                <span>{file.title}</span>
                                                <button onClick={(e) => RemoveUploadedGPTFile(e, `${contextField?.key}-${item?.messageId}`, file?.mediaName)} id = {`removeButton-${contextField?.key}-${item?.messageId}-${file?.value}`}>Remove</button>
                                            </div>
                                        )
                                    })}
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
                                        {((subItem?.value?.type === "dropdown" && subItem?.value?.multi) && (!selectedPrompt || (selectedPrompt?.variables?.includes(subItem?.key)))) && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <select id={`dropdownValue-${subItem?.key}-${item?.messageId}-${subIndex}`} multiple>
                                                    {subItem?.value?.choices?.map((choice, choiceIndex) => {
                                                        return <option value={choice?.id}>{choice?.label}</option>
                                                    })}
                                                </select>
                                            </>
                                        )}
                                        {((subItem?.value?.type === "dropdown" && !subItem?.value?.multi && subItem?.key !== "prompts") && (!selectedPrompt || (selectedPrompt?.variables?.includes(subItem?.key)))) && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <select id={`dropdownValue-${subItem?.key}-${item?.messageId}-${subIndex}`} >
                                                    {subItem?.value?.choices?.map((choice, choiceIndex) => {
                                                        return <option value={choice?.label}>{choice?.label}</option>
                                                    })}
                                                </select>
                                            </>
                                        )}
                                        {(subItem?.value?.type === "simpleText" && (!selectedPrompt || (selectedPrompt?.variables?.includes(subItem?.key)))) && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <div key={subIndex} value={subItem?.value} contentEditable="true" id={`inputValue-${subItem?.key}-${item?.messageId}-${subIndex}`} />
                                            </>
                                        )}
                                        {(subItem?.value?.type === "number" && (!selectedPrompt || (selectedPrompt?.variables?.includes(subItem?.key)))) && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <input type="number" id={`inputValue-${subItem?.key}-${item?.messageId}-${subIndex}`} />
                                            </>
                                        )}
                                        {(subItem?.value?.type === "longText" && (!selectedPrompt || (selectedPrompt?.variables?.includes(subItem?.key)))) && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <div key={subIndex} value={subItem?.value} contentEditable="true" id={`inputValue-${subItem?.key}-${item?.messageId}-${subIndex}`} />
                                            </>
                                        )}
                                        {((subItem?.value?.canUploadFile || subItem?.value?.type === 'file') && (!selectedPrompt || (selectedPrompt?.variables?.includes(subItem?.key)))) && (
                                            <>  
                                                <input type="file" id={`fileUpload-${subItem?.key}-${item?.messageId}-${subIndex}`} multiple onChange={
                                                    async(e) => {
                                                        try{
                                                          const res =  await GptFileUpload(e, `${subItem?.key}-${item?.messageId}-${subIndex}`)
                                                          setFiles(res)
                                                        }catch(err){
                                                            console.log("error", err)
                                                        }
                                                    }}/>
                                                {files?.[`${subItem?.key}-${item?.messageId}-${subIndex}`]?.map((file, fileIndex) =>{
                                                    return(
                                                        <div key={fileIndex}>
                                                            <span>{file.title}</span>
                                                             <button onClick={(e) => RemoveUploadedGPTFile(e, `${subItem?.key}-${item?.messageId}-${subIndex}`, file?.mediaName)} id = {`removeButton-${subItem?.key}-${item?.messageId}-${subIndex}`}>Remove</button>
                                                        </div>
                                                    )
                                                })}                                               
                                            </>
                                        )}
                                        {(subItem?.key === "prompt") && (
                                            <>
                                                <div>{subItem?.label}</div>
                                                <div id={`inputValue-${subItem?.key}-${item?.messageId}-${subIndex}`} contentEditable={subItem?.value?.readOnly ? false : true}>{subItem?.value?.default}</div>
                                            </>
                                        )}
                                        {subItem?.value?.nested?.key === "prompt" && (
                                            // <>  
                                            //     <div>{subItem?.value?.nested?.label}</div>
                                            //     <div id={`inputValue-${subItem?.key}-${item?.messageId}-${subIndex}`} contentEditable={subItem?.value?.nested?.readOnly ? false : true}>{subItem?.value?.nested?.value}</div>
                                            // </>
                                            <select
                                                id={`dropdownValue-${subItem?.key}-${item?.messageId}-${subIndex}`}
                                                value={selectedPrompt ? String(selectedPrompt?.label ?? "") : ""}
                                                onChange={(e) => {
                                                    const selectedLabel = e.target.value;
                                                    const selectedChoice = subItem?.value?.choices?.find(
                                                        (c) =>  c?.label === selectedLabel
                                                    );
                                                    if (selectedChoice) {
                                                        setSelectedPrompt(selectedChoice);
                                                    }
                                                }}
                                            >
                                                {subItem?.value?.choices?.map((choice, choiceIndex) => (
                                                    <option key={choice?.id ?? choiceIndex} value={String(choice?.label ?? "")}>
                                                        {choice?.label}
                                                    </option>
                                                ))}

                                            </select>
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