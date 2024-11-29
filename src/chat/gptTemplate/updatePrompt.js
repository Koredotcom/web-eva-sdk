import MultiResponse from "./MultiResponse"

const UpdatePrompt = (item, subIndex, value) => {
    return MultiResponse().updatePrompt(item, subIndex, value)
}

export default UpdatePrompt;