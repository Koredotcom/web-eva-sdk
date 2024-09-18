import React, { useEffect, useState } from 'react'
import { GetDownloadUrl, LoadMoreRecentFiles, RecentFiles } from '../files'

const File = () => {
    const [files, setFiles] = useState(null)

    useEffect(() => {
        // fetchRecentFiles()
        fetchLoadMoreRecentFiles()
    }, [])

    const fetchRecentFiles = async () => {
        const res = await RecentFiles()
        console.log('Recent Files', res)
    }
    const fetchLoadMoreRecentFiles = async (loadmore) => {
        const res = await LoadMoreRecentFiles({ limit: 10, initialData: loadmore ? false : true })
        console.log('All Recent Files', res)
        setFiles(res)
    }
    const downloadHanlder = async (file) => {
        const res = await GetDownloadUrl(file)
        console.log(res)

        const downloadUrl = res?.data?.downloadUrl;
        // Determine the file extension
        const fileExtension = file?.fileName?.split('.').pop().toLowerCase();
        // Common file extensions that open in browser
        const browserFileExtensions = ['pdf', 'html', 'htm', 'txt'];
        if (browserFileExtensions.includes(fileExtension)) {
            // Open in a new tab for browser-readable files (e.g., PDF)
            window.open(downloadUrl, '_blank');
        } else {
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', file?.fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    return (
        <div>
            <h1>Recent Files</h1>
            <ul>
                {files && files.data.map(file => {
                    return (
                        <li key={file.id} onClick={() => downloadHanlder(file)}>{file?.fileName}</li>
                    )
                })}
            </ul>
            <button onClick={()=> fetchLoadMoreRecentFiles('loadmore')}>Load more recent files</button>
        </div>
    )
}

export default File