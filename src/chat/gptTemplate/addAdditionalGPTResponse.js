import MultiResponse from "./MultiResponse"

const AddAdditionalGPTResponse = (item) => {
    return MultiResponse().addAdditionalResponse(item)
}

export default AddAdditionalGPTResponse;