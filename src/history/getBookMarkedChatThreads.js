import HistoryInterface from './historyInterface';

const getBookMarkedChatThreads = (props) => {
    return HistoryInterface().fetchBookMarkedChatThread(props)
}

export default getBookMarkedChatThreads;