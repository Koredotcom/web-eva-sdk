
import store from "../redux/store";
import FileUploader from "../utils/fileUploader";
import axios, { all } from "axios";
import { searchSession } from "../redux/actions/global.action";
import { generateComponentId, generateShortUUID, getFileExtension, getUID } from "../utils/helpers";
import { setSelectedContext } from "../redux/globalSlice";
import uploadFiles from "./uploadFiles";
import removeItem from "./removeItem";
import removeCurentFile from "./removeCurrentFile";

const FileUpload = (props) => {
    let state = store.getState().global;

    // Subscribe to store updates
    const subscribe = (cb) => {
        let callback = cb;
        const unsubscribe = store.subscribe(() => {
            state = store.getState().global;
            // If callback exists and API call is completed, invoke it
            if (state.selectedContext?.status !== 'loading' && callback) {
                callback(state.selectedContext.data?.sources, state.selectedContext.data?.sessionId, state.selectedContext.data?.quickactions, state.selectedContext.data?.error);
            }
        });

        // Return a function to unsubscribe
        return () => {
            unsubscribe();
        };
    };

    const uploadFile = (event) => {
        let files = event.target.files || [];
        let allSources = [];
        let completedFiles = 0;

        if (files && files.length) {

            let allFiles = [];
            allFiles = [...files].map(file => ({
                file,
                title: file.name,
                loading: true, //setting loading as true for initial setting of sources
                uID: getUID(10)
            }));

            let _selectedContext = {};
            _selectedContext.data = {};
            _selectedContext.data.sources = allFiles
            _selectedContext.data.loading = true  //setting loading as true for initial setting of sources

            //If there is already added a SessionID, there are already sources added, adding that with the sources that are to be uploaded
            if (state.selectedContext.data?.sessionId) {
                _selectedContext.data.sources = [
                    ...state.selectedContext.data.sources,
                    ...allFiles
                ];
                _selectedContext.data.sessionId = state.selectedContext.data?.sessionId
                _selectedContext.data.quickactions = state.selectedContext.data?.quickactions
            }
            //Setting Sources Initially in Loading State till the call is successful
            store.dispatch(setSelectedContext(_selectedContext))

            for (let i = 0; i < allFiles.length; i++) {
                let currentFile = allFiles[i];

                uploadFileInitial(currentFile, allSources, () => {
                    completedFiles++;
                    //Checking whether all files have completed token generation to make the searchSession Call
                    if (completedFiles === files.length) {
                        let selectedSources = state.selectedContext.data.sources
                        if (allSources?.length !== selectedSources?.length) {
                            //Checking and uploading the selected sources as context
                            allSources = allSources.filter(source =>
                                selectedSources.some(selected => selected.uID === source.uID)
                            );
                        }
                        //If there are no sources to add, no searchSession call is to be made. 
                        let action = state.selectedContext.data?.sessionId ? "update" : "add"
                        allSources?.length && uploadFiles({attachments : allSources, action});
                    }
                });
            }
        }
    };

    const uploadFileInitial = (file, allSources, onComplete) => {
        let localSize = file.file.size / Math.pow(1024, 2)
        let allowedFileSize = Math.round(state.maxAllowedFileSize / Math.pow(1024, 2));
        //If the file size is greater than Max Allowed File, then returning with a response
        if (localSize > allowedFileSize) {
            let _selectedContext = {};
            _selectedContext.data = {};
            let errorFiles = [...(state.selectedContext.data.error || [])];
            let fileWithError = {
                ...file,
                error : 'size',
                message : `File Size has to be less than ${allowedFileSize} MB`
            }
            errorFiles.push(fileWithError)
            let remainingFiles = state.selectedContext.data.sources.filter(f => f.uID !== file.uID)
            _selectedContext.data.sources = remainingFiles
            _selectedContext.data.sessionId = state.selectedContext?.data?.sessionId
            _selectedContext.data.quickactions = state.selectedContext?.data?.quickactions
            _selectedContext.data.error = errorFiles
            store.dispatch(setSelectedContext(_selectedContext))
            onComplete();
            // Returning as an object with success as false for the client to know that the request could not be completed
            return;
        }

        // If File Size is in the range of Upload
        let userId = window.sdkConfig.userId;
        let userAccessToken = window.sdkConfig.accessToken;
        const source = axios.CancelToken.source();

        let obj = {
            mediaName: getUID(6),
            loading: true,
        };

        const uploadConfig = {
            file: file.file,
            userInfoId: userId,
            fileContext: 'knowledge',
            userAccessToken: userAccessToken,
            mediaName: obj.mediaName,
            source: source,
            uID: file.uID
        };

        const u = new FileUploader(uploadConfig);

        obj.fileName = u?.file?.name;
        obj.title = u?.file?.name;
        obj.source = 'attachment';
        obj.extName = getFileExtension(u?.file?.name);

        u.start(
            (res) => { },
            (file) => {
                let componentId = generateComponentId();
                console.log(file);
                let f = {
                    ...file,
                    loading: false,
                    componentId,
                    extName: getFileExtension(file?.fileName),
                    source: 'attachment',
                    title: file?.fileName,
                    docId: file?.fileUrl?.fileId,
                };

                let sources = allSources || [];

                // Adding all the selected sources to allSources array to make the selected Context Call
                sources.push(f);

                allSources = sources;
                onComplete();
            },
            (msg, data) => {
                //If the file type is not supported, returing with a response that it is not compatible
                fileUploadError(msg, data);
                onComplete();
            }
        );
    };

    const removeSelectedFile = async (args) => {
        if (args.loading) {
            //If the source is loading and user terminated the call in between, we are removing that in selected Context and updating the state
            return removeItem({state, item:args})
        } else if (state.selectedContext.data.loading) {
            //If there is a selectedContext call loading and user wants to remove already added file, returning with no action.
            let resp = {
                success : false,
                message : "File Upload in Progress, Please Wait."
            }
            // Returning as an object with success as false for the client to know that the request could not be completed
            return resp;
        } else {
            removeCurentFile({state, item : args, removingSource : true})
        }
    }

    const fileUploadError = (msg, data) => {
        // console.log(msg, data, allFilesCount)
        let _selectedContext = {};
        _selectedContext.data = {};
        let remainingFiles = state.selectedContext.data.sources.filter(file => file.uID !== data.uniqueID)
        let errorFiles = [...(state.selectedContext.data.error || [])];
        let fileWithError = {
            ...data,
            error : 'type',
            message : `The file type ${data.fileType} is not Compatible`
        }
        errorFiles.push(fileWithError)
        _selectedContext.data.sources = remainingFiles
        _selectedContext.data.sessionId = state.selectedContext?.data?.sessionId
        _selectedContext.data.quickactions = state.selectedContext?.data?.quickactions  
        _selectedContext.data.error = errorFiles
        store.dispatch(setSelectedContext(_selectedContext))
        // Returning as an object with success as false for the client to know that the request could not be completed
        return;
    }

    const uploadFileButton = document.createElement('input')
    uploadFileButton.type = 'file'
    uploadFileButton.innerText = 'Upload'
    uploadFileButton.multiple = true
    uploadFileButton.addEventListener('change', (e) => uploadFile(e))

    return {
        showUploadChip: parentEl => {
            document.getElementById(parentEl).appendChild(uploadFileButton);
        },
        subscribe,
        // uploadSelectedFile,
        removeSelectedFile
    }
}

export default FileUpload;