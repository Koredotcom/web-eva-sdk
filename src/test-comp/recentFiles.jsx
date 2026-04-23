import { useEffect, useState } from "react";
import { LoadMoreRecentFiles, GetDownloadUrl } from "../files";

const RecentFilesDemo = () => {
    const [recentFiles, setRecentFiles] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetch initial 10 recent files
        fetchInitialFiles();
    }, []);

    const fetchInitialFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await LoadMoreRecentFiles({ limit: 20, initialData: true });
            if (res.status === "success") {
                setRecentFiles(res.data);
                setHasMore(res.hasMore);
            } else {
                setError(res.error || "Failed to fetch recent files");
            }
        } catch (err) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const loadMoreFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await LoadMoreRecentFiles({ limit: 20 });
            if (res.status === "success") {
                setRecentFiles(res.data);
                setHasMore(res.hasMore);
            } else {
                setError(res.error || "Failed to load more files");
            }
        } catch (err) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (file) => {
        try {
            const res = await GetDownloadUrl(file);
            if (res.status === "succeeded" && res.data?.downloadUrl) {
                window.open(res.data.downloadUrl, "_blank");
            }
        } catch (err) {
            console.error("Failed to get download URL:", err);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "N/A";
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="recentFilesDemo">
            <h3>Recent Files</h3>
            
            {error && <div className="errorMsg">{error}</div>}
            
            <div className="filesList">
                {recentFiles.length > 0 ? (
                    recentFiles.map((file) => (
                        <div 
                            key={file.id} 
                            className="fileItem"
                            onClick={() => handleDownload(file)}
                        >
                            <div className="fileIcon">
                                {file.fileExtension?.toUpperCase() || "FILE"}
                            </div>
                            <div className="fileInfo">
                                <span className="fileName">{file.fileName}</span>
                                <span className="fileMeta">
                                    {formatFileSize(file.size)} • {formatDate(file.createdOn)}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    !loading && <div className="noFiles">No recent files found</div>
                )}
            </div>

            {loading && <div className="loadingMsg">Loading...</div>}

            {hasMore && !loading && (
                <button 
                    className="loadMoreBtn" 
                    onClick={loadMoreFiles}
                >
                    Load More Files
                </button>
            )}
        </div>
    );
};

export default RecentFilesDemo;

