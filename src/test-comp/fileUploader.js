import axios from 'axios';

const fileUploader = ({
    file, 
    userInfoId, 
    fileContext, 
    userAccessToken, 
    mediaName,
    source 
}) => {
    const app = window.sdkConfig.api_url;
    const baseUrl = app;
    const CHUNK_SIZE = 2048 * 2048;
    const CHUNK_SIZE_INITIAL = 1024 * 1024;
    let onSuccess = null;
    let onError = null;
    let fileInfo = {};
    const allowedFileTypes = [
        "aac",
        "amr",
        "m4a",
        "mp3",
        "ogg",
        "oga",
        "opus",
        "wav",
        "weba",
        "3gp",
        "flv",
        "m4v",
        "mkv",
        "mov",
        "mp4",
        "mpeg",
        "mpg",
        "webm",
        "wmv",
        "bmp",
        "gif",
        "ico",
        "jfif",
        "jpeg",
        "jpg",
        "png",
        "svg",
        "tiff",
        "webp"
    ]; 

const filetypes = {
    "audio": [
        "aac",
        "amr",
        "m4a",
        "mp3",
        "ogg",
        "oga",
        "opus",
        "wav",
        "weba"
    ],
    "video": [
        "3gp",
        "flv",
        "m4v",
        "mkv",
        "mov",
        "mp4",
        "mpeg",
        "mpg",
        "webm",
        "wmv"
    ],
    "image": [
        "bmp",
        "gif",
        "ico",
        "jfif",
        "jpeg",
        "jpg",
        "png",
        "svg",
        "tiff",
        "webp"
    ]
};

    const initiateFileUpload = (callbackFunc) => {
        onSuccess = callbackFunc
        console.log(onSuccess)
        validateFile()
    }

    const validateFile = () => {
    
        if (file.type === 'paste' && file?.clipboardData?.files?.[0]) {
            file = file.clipboardData.files[0];
        }
    
        if (file && file.name) {
            fileInfo.fileName = file.name;
            fileInfo.mediaName = mediaName;
            fileInfo.fileType = file.name.split('.').pop().toLowerCase();
            fileInfo.fileSize = file.size;
    
            if (allowedFileTypes?.indexOf(fileInfo.fileType) !== -1) {
                fileInfo.isChunkUpload = fileInfo.fileSize > CHUNK_SIZE_INITIAL;
                fileInfo.totalChunks = fileInfo.isChunkUpload 
                    ? Math.floor(fileInfo.fileSize / CHUNK_SIZE) + 1 
                    : 1;
    
                if (filetypes?.audio?.indexOf(fileInfo.fileType) !== -1) {
                    fileInfo.type = 'audio';
                    fileInfo.isThumbnail = false;
                } else if (filetypes?.video?.indexOf(fileInfo.fileType) !== -1) {
                    fileInfo.type = 'video';
                    fileInfo.isThumbnail = true;
                } else if (filetypes?.image?.indexOf(fileInfo.fileType) !== -1) {
                    fileInfo.type = 'image';
                    fileInfo.isThumbnail = true;
                } else {
                    fileInfo.type = 'attachment';
                    fileInfo.isThumbnail = false;
                }
                getFileToken();
            } else {
                console.log('INVALID_FILE_FORMAT');
            }
        } else {
            console.log('FILE_NAME_MISSING');
        }
    };

    const getFileToken = () => {
        const payload = {
            "fileContext": fileContext, 
            "filename": file.name,
            "fileContentType": file.type,
            "fileType": fileInfo.type,
            "fileExtension": "png",
            "fileSize": file.size,
        };

        axios.post(`${baseUrl}users/${userInfoId}/file/token`, payload, {
            headers: {
                Authorization: `bearer ${userAccessToken}`
            },
            cancelToken: source?.token
        })
        .then((data) => {
            readyForUpload();
        })
        .catch((error) => {
            console.log(error)
        });
    };

    const readyForUpload = () => {
        let formData = new FormData();
        formData.append('file', file);
        formData.append('fileExtension', fileInfo.fileType);
        formData.append('fileType', fileInfo.type);
        formData.append('filename', fileInfo.fileName);
        formData.append('fileContext', fileContext);
        
            axios.post(baseUrl + "users/" + userInfoId + "/file", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': "bearer " + userAccessToken
                },
                cancelToken : source?.token
            })
            .then((data) => {
                    const response ={type: fileInfo.type, fileName: fileInfo.fileName, filesize: fileInfo.fileSize, fileUrl: data.data, mediaName: fileInfo.mediaName}
                    if (onSuccess) onSuccess(response);
                }
            );
        }
     
    return {
        file,
        userInfoId,
        fileContext,
        userAccessToken,
        mediaName,
        source,
        baseUrl,
        initiateFileUpload,
        CHUNK_SIZE,
        CHUNK_SIZE_INITIAL,
        onSuccess,
        onError
    }
}

export default fileUploader;
