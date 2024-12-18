import MultiResponse from "./MultiResponse"

const DeleteGPTResponse = (item, subIndex, defaultTemplate) => {
    return MultiResponse().deleteAdditionalResponse(item, subIndex, defaultTemplate)
}

export default DeleteGPTResponse;