import MultiResponse from "./MultiResponse"

const RemoveUploadedGPTFile = (item, index) => {
    return MultiResponse().removeFile(item, index)
}

export default RemoveUploadedGPTFile;