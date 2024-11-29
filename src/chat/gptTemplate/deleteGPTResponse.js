import MultiResponse from "./MultiResponse"

const DeleteGPTResponse = (item, subIndex) => {
    return MultiResponse().deleteAdditionalResponse(item, subIndex)
}

export default DeleteGPTResponse;