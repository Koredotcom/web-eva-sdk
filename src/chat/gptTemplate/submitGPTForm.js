import MultiResponse from "./MultiResponse"

const SubmitGPTForm = (e, item) => {
    return MultiResponse().submitGPTForm(e, item)
}

const ExecuteFormThroughURL = (formData, question, agentId) => {
    return MultiResponse().executeFormThroughURL(formData, question, agentId)
}

export {
    SubmitGPTForm,
    ExecuteFormThroughURL
}