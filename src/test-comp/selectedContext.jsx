import React, { useEffect, useRef } from "react";
import { FileUpload } from "../Attachments";

const SelectedContext = (props) => {
    const { selcontext, errorFiles } = props;
    const uploadFile = useRef()

    useEffect(()=>{
        uploadFile.current = FileUpload();
    })

    // const showError = () => {
    //     setTimeout(() => {
    //         return (
    //             <div>{`Unable to add ${errorFiles.title}`}</div>
    //         )
    //     }, 3000);
    // }

    return (
        <div>
            {/* <div>{errorFiles && showError()}</div> */}
            <button onClick={()=> uploadFile.current.uploadFile()}></button>
            {selcontext?.length > 0 && selcontext?.map((item) => (
                <div key={item?.title}>
                    <div>{item?.title}</div>
                    <button onClick={() => uploadFile.current.removeSelectedFile(item)}>Remove</button>
                </div>
            ))}
        </div>
    );
};

export default SelectedContext;
