import store from "../../redux/store";
import { getSignedMediaURL } from "../../redux/actions/global.action";

/**
 * Resolve the actual signed URL key from the API response.
 * The backend may return any of these keys depending on context.
 */
const resolveSignedUrl = (res) =>
    res?.mediaUrl || res?.url || res?.downloadUrl || null;

/**
 * Triggers a browser "Save As" download for a file referenced by `messageId` + `fileId`.
 *
 * Flow:
 *  1. Calls signed media URL API (`getSignedMediaURL` thunk).
 *  2. Fetches the file as a Blob from the signed URL.
 *  3. Creates an in-memory blob URL and clicks a hidden anchor to download it.
 *  4. Cleans up the anchor and revokes the blob URL.
 *
 * Accepts either an `artifact` object (with `uploadedFileId`/`filename`)
 * or explicit `messageId` / `fileId` / `filename` keys.
 *
 * @param {object} args
 * @param {string} [args.messageId]    Server messageId for the question/turn.
 * @param {string} [args.fileId]       Uploaded file id to download.
 * @param {string} [args.filename]     Optional preferred filename.
 * @param {object} [args.artifact]     Optional Kora-style artifact ({ uploadedFileId, filename }).
 * @returns {Promise<{status: "success", filename: string} | {error: true, message: string}>}
 */
const DownloadFile = async (artifact) => {
    
    const messageId = artifact?.messageId;
    const fileId = artifact?.uploadedFileId || artifact?.fileId;
    const overrideFilename = artifact?.filename;

    const userId = store.getState()?.global?.profile?.data?.id;

    if (!userId) {
        return { error: true, message: "SDK not initialized. userId is required" };
    }
    if (!messageId) {
        return { error: true, message: "Missing required param: messageId" };
    }
    if (!fileId) {
        return { error: true, message: "Missing required param: fileId" };
    }

    let signedUrlRes;
    try {
        signedUrlRes = await store
            .dispatch(getSignedMediaURL({ userId, msgId: messageId, fileId }))
            .unwrap();
    } catch (error) {
        return {
            error: true,
            message: error?.errors?.[0]?.msg || "Unable to fetch signed media URL",
        };
    }

    const signedUrl = resolveSignedUrl(signedUrlRes);
    if (!signedUrl) {
        return { error: true, message: "Signed URL missing in response" };
    }

    try {
        const response = await fetch(signedUrl);
        if (!response.ok) {
            return {
                error: true,
                message: `Failed to fetch file. Status: ${response.status}`,
            };
        }

        const blob = await response.blob();
        const filename = overrideFilename || signedUrlRes?.filename || "download";
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);

        return { status: "success", filename };
    } catch (error) {
        return {
            error: true,
            message: error?.message || "File download failed",
        };
    }
};

export default DownloadFile;