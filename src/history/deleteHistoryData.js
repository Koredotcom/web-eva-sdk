import HistoryInterface from './historyInterface';

const deleteChatThread = (props) => {
    return HistoryInterface().deleteHistoryBoard(props)
}

export default deleteChatThread;