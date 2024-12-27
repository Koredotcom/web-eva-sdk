import MultiResponse from "./MultiResponse"

const AddAdditionalGPTResponse = (item, defaultTemplate) => {
    return MultiResponse().addAdditionalResponse(item, defaultTemplate)
}

export default AddAdditionalGPTResponse;