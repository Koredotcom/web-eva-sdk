import React, { useEffect, useRef, useState } from "react";
import { FileUpload } from "../Attachments";
import { ChatInterface } from "../chat";

const SelectedContext = () => {

    const [selectedContext, setSelectedContext] = useState(null)
    const [quickActions, setQuickActions] = useState(null)
    const [errorMessages, setErrorMessages] = useState(null)
    const uploadFile = useRef()
    const chatInterface = useRef()

    useEffect(() => {
        uploadFile.current = FileUpload();
        chatInterface.current = ChatInterface();
        uploadFile.current.showUploadChip('composeBar')

        const unsubscribe = uploadFile.current.subscribe((context, sessionId, quickActions, errorFiles) => {
            console.log("Selected Context", context, "Session ID", sessionId, quickActions, errorFiles)
            setSelectedContext(context)
            setQuickActions(quickActions)
            setErrorMessages(errorFiles)
        })

        return () => {
            // Unsubscribe from store updates
            unsubscribe();
            // unsubscribe2();
        };
    },[])

    // const showError = () => {
    //     setTimeout(() => {
    //         return (
    //             <div>{`Unable to add ${errorFiles.title}`}</div>
    //         )
    //     }, 3000);
    // }

    return (
        <div>
            <h1>Selected Context</h1>
            {quickActions?.length > 0 && quickActions?.map((item) => (
                <div onClick={(e) => chatInterface.current.askQuickActions(item)}>{item?.label}</div>
            ))}
            {errorMessages?.length > 0 && errorMessages?.map((item) => (
                <div>{`Error While Uploading ${item?.title}.${item?.message}`}</div>
            ))}
            {selectedContext?.length > 0 && selectedContext?.map((item) => (
                <div key={item?.title}>
                    <div>{item?.title}</div>
                    <button onClick={() => uploadFile.current.removeSelectedFile(item)}>Remove</button>
                </div>
            ))}
        </div>
    );
};

export default SelectedContext;
