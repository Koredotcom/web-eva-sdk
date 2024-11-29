import MultiResponse from "./MultiResponse"

const DeleteResponse = (item, subIndex) => {
    return MultiResponse().deleteAdditionalResponse(item, subIndex)
}

export default DeleteResponse;