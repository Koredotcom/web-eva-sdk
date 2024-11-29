import MultiResponse from "./MultiResponse"

const UpdateGPTPromptValue = (item, subIndex, value) => {
    return MultiResponse().updatePrompt(item, subIndex, value)
}

export default UpdateGPTPromptValue;