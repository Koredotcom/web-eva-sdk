import ChatInterface from './ChatInterface'

const cancelAdvanceSearch = (props) => {
    return ChatInterface().cancelMessageReqAction(props)
}

export default cancelAdvanceSearch;