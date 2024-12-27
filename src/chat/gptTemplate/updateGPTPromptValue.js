import MultiResponse from "./MultiResponse"

const UpdateGPTPromptValue = (item, subIndex, value, defaultTemplate) => {
    return MultiResponse().updatePrompt(item, subIndex, value, defaultTemplate)
}

export default UpdateGPTPromptValue;