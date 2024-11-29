import MultiResponse from "./MultiResponse"

const AddResponse = (item) => {
    return MultiResponse().addAdditionalResponse(item)
}

export default AddResponse;