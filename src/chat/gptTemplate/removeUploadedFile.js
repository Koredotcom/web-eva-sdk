import MultiResponse from "./MultiResponse"

const RemoveUploadedFile = (item, index) => {
    return MultiResponse().removeFile(item, index)
}

export default RemoveUploadedFile;