import React, { useEffect, useRef, useState } from "react";
import { FileUpload } from "../Attachments";

const DemoComp = () => {
    const uploadFile = useRef(null);
    const [sources, setSources] = useState([]);
    const [errorFiles, setErrorFiles] = useState([]);

    useEffect(() => {
        uploadFile.current = FileUpload();
        const unsubscribe = uploadFile.current.subscribe((context, _sessionId, _quickActions, errors) => {
            setSources(context || []);
            setErrorFiles(errors || []);
        });

        return unsubscribe;
    }, []);

    const handleFileChange = (event) => {
        uploadFile.current?.uploadFile(event);
        // Allow selecting the same file again after an upload attempt.
        event.target.value = "";
    };

    const isUploading = sources.some((source) => source?.loading);

    return (
        <section style={{ maxWidth: 640, margin: "24px auto", padding: 20, border: "1px solid #d8dde5", borderRadius: 8 }}>
            <h2 style={{ marginTop: 0 }}>Upload files</h2>
            <p>Select one or more files to upload them as context.</p>
            <label style={{ display: "inline-block", padding: "10px 14px", border: "1px solid #8a94a6", borderRadius: 6, cursor: "pointer" }}>
                Choose files
                <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: "block", marginTop: 8 }}
                />
            </label>

            {isUploading && <p role="status">Uploading files…</p>}

            {sources.length > 0 && (
                <div aria-live="polite">
                    <h3>Selected files</h3>
                    <ul>
                        {sources.map((file, index) => (
                            <li key={file?.uID || file?.componentId || `${file?.title}-${index}`}>
                                {file?.fileName || file?.title || "Untitled file"}
                                {file?.loading ? " — Uploading" : file?.error ? " — Failed" : " — Uploaded"}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {errorFiles.length > 0 && (
                <div role="alert">
                    <h3>Files that could not be uploaded</h3>
                    <ul>
                        {errorFiles.map((file, index) => (
                            <li key={file?.uID || `${file?.title}-${index}`}>
                                {file?.fileName || file?.title || "Untitled file"}: {file?.message || file?.error || "Upload failed"}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
};

export default DemoComp;
