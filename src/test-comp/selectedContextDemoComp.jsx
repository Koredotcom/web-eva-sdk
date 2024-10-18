import React, { useEffect, useRef, useState } from "react"
import store from "../redux/store"
import { FileUpload } from "../Attachments";

const DemoComp = () => {
    const [recentFiles, setRecentFiles] = useState(null)
    const uploadFile = useRef();
    let state = store.getState().global
    useEffect(() => {
        
        uploadFile.current = FileUpload();
        setTimeout(() => {
            
            setRecentFiles(state?.recentFiles?.data?.files)
        }, 2000);
    }, [state.recentFiles])

    return (
        <>
            {recentFiles?.length > 0 && recentFiles?.map(file => (
                <li key={file.id}>
                    <span onClick={() => downloadHanlder(file)}>{file?.fileName}</span>
                    <button onClick={() => uploadFile.current.setRecentFileAsSource(file)}>Set as Source</button>
                </li>
            ))}

        </>
    )
}

export default DemoComp;