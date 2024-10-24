import axios from "axios";
import FileUploader from "../../utils/fileUploader";
import { generateComponentId, getFileExtension, getUID } from "../../utils/helpers";
import store from "../../redux/store";
import { setGptUploadedFiles } from "../../redux/globalSlice";

let gptFileData = null;

const GptFileUpload = (event, id) => {
    return new Promise((resolve, reject) => {
        if (event.target.files.length > 0) {
            uploadFileInitial(event.target.files[0], id, resolve, reject)
        }
    })
    
}

export default GptFileUpload;

const uploadFileInitial = (file, id, resolve, reject) => {
    console.log(window.sdkConfig)
    let userId = window.sdkConfig.userId;
    let userAccessToken = window.sdkConfig.accessToken;
    const source = axios.CancelToken.source();
    let obj = {
        mediaName: getUID(6),
        loading: true,
    };

    const uploadConfig = {
        file,
        userInfoId: userId,
        fileContext: 'knowledge',
        userAccessToken: userAccessToken,
        mediaName: obj.mediaName,
        source: source
    }

    const u = new FileUploader(uploadConfig);

    obj.fileName = u?.file?.name
    obj.title = u?.file?.name
    obj.source = "attachment"
    obj.extName = getFileExtension(u?.file?.name)

    u.start(
        (res) => { }, (file) => {
            let componentId = generateComponentId();
            console.log(file)
            let f = {
                ...file,
                loading: false,
                componentId,
                extName: getFileExtension(file?.fileName),
                source: "attachment",
                title: file?.fileName,
                docId: file?.fileUrl?.fileId
            }

            
            let currentFileData = gptFileData || {}
            currentFileData[id] = {
                type: "file",
                value: file?.fileUrl?.fileId,
                title: file?.title || file?.fileName
            }

            gptFileData = currentFileData;
            store.dispatch(setGptUploadedFiles(currentFileData))

            const reqdTextArea = document.getElementById(`inputValue-${id}`)
            if(reqdTextArea) {
                reqdTextArea.style.display = 'none';
            }

            const reqdButton = document.getElementById(`removeButton-${id}`)
            if(reqdButton) {
                reqdButton.style.display = 'block'
            }

            resolve(currentFileData, f)
        },
        (msg) => {
            console.log(msg);
            const reqdInputField = document.getElementById(`fileUpload-${id}`)
            if(reqdInputField) {
                reqdInputField.value = ''
            }
            gptFileData = null;
            store.dispatch(setGptUploadedFiles(null))
            reject(msg)
        })
}