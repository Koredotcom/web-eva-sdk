import { orderBy } from "lodash";
import { getSearchHistory } from "../redux/actions/global.action";
import store from "../redux/store";

/*
 * Mirrors the Work app's HistoryMessageView: on hover of a history item / search result
 * the app shows the messages of that thread shaped like the `questions` object the chat
 * renderer consumes.
 * - regular history items use the messages already on the boards response when present,
 *   otherwise the thread preview is fetched (limit 20)
 * - conversation search results never carry messages, so the preview is always fetched:
 *   board hits load the first page (limit 10); message hits center the fetch on the
 *   matched message (`refMsgId` + offset -10, limit 21)
 * - previews are cached per board/message so re-hovering doesn't refetch
 */
const BOARD_PREVIEW_HISTORY_LIMIT = 10;
const THREAD_PREVIEW_HISTORY_LIMIT = 20;
const MESSAGE_PREVIEW_HISTORY_LIMIT = 21;

const previewCache = {};

const isMessageSearchResult = (result) => {
    const docType = result?.docType || result?.type || result?.raw?._source?.docType || result?.raw?._source?.type;
    const boardId = result?.boardId || result?.raw?._source?.boardId || result?.raw?._source?.bId;
    return docType === 'message'
        || !!(result?.messageId || result?.msgId || result?.raw?._source?.message)
        || (!!result?.docId && !!boardId && String(result.docId) !== String(boardId));
};

const getPreviewBoardId = (result) => (
    result?.boardId
    || result?.raw?._source?.boardId
    || result?.raw?._source?.bId
    || result?.id
    || result?.docId
);

const getSearchResultMessageId = (result) => (
    result?.messageId
    || result?.msgId
    || result?.raw?._source?.messageId
    || result?.raw?._source?.msgId
    || result?.raw?._source?.message?.id
    || result?.raw?._source?.message?._id
    || result?.docId
    || result?.reqId
    || result?._id
    || result?.id
);

const getPreviewCacheKey = (result) => {
    const boardId = getPreviewBoardId(result);
    if (!boardId) return null;
    if (isMessageSearchResult(result)) {
        return `${boardId}:${getSearchResultMessageId(result) || result?.id || 'message'}`;
    }
    return `${boardId}:board`;
};

const getMessageId = (msg) => msg?.id || msg?.docId || msg?.messageId || msg?._id || msg?.msgId || msg?.reqId;

const mapHistoryToQuestions = (history = []) => {
    const questionsObj = {};
    const orderedHistory = orderBy(history, 'cOn', 'asc');
    orderedHistory.forEach((msg) => {
        const id = getMessageId(msg);
        if (!id) return;
        questionsObj[id] = {
            ...msg,
            id,
            messageId: id,
            apiSuccess: true,
            historicalData: true,
            type: msg?.type || (msg?.postType === 'follow-up' ? 'followup' : 'search'),
            templateType: 'search_answer',
            viewType: msg?.viewType === 'threadView' ? undefined : msg?.viewType,
            botConversation: undefined,
        };
    });
    return questionsObj;
};

const fetchPreviewHistory = async (boardId, params) => {
    const res = await store.dispatch(getSearchHistory({ boardId, params }));
    if (res?.error) return null;
    return res?.payload?.history || [];
};

/**
 * Returns the data shown when a history item / search result is hovered.
 * Accepts either a boardId string (regular history list) or a normalized
 * conversation search result object.
 * Resolves with `{ boardId, board, matchedMessageId, questions }`.
 */
const getHistoryThreadPreview = async (target) => {
    if (!target) {
        return { boardId: null, board: null, matchedMessageId: null, questions: {} };
    }

    const state = store.getState().global;
    const allHistoryBoards = state.AllHistory?.data || [];

    /*regular history item — hovered by boardId*/
    if (typeof target === 'string') {
        const boardId = target;
        const board = allHistoryBoards.find(b => b?.id === boardId) || null;

        if (board?.messages?.length) {
            /*messages come latest-first on the boards response, reversing them to chronological order*/
            return { boardId, board, matchedMessageId: null, questions: mapHistoryToQuestions([...board.messages].reverse()) };
        }

        const cacheKey = `${boardId}:thread`;
        if (!previewCache[cacheKey]) {
            previewCache[cacheKey] = await fetchPreviewHistory(boardId, {
                limit: THREAD_PREVIEW_HISTORY_LIMIT,
                showdata: false,
            });
        }
        return { boardId, board, matchedMessageId: null, questions: mapHistoryToQuestions(previewCache[cacheKey] || []) };
    }

    /*conversation search result — board or message hit*/
    const result = target;
    const boardId = getPreviewBoardId(result);
    if (!boardId) {
        return { boardId: null, board: null, matchedMessageId: null, questions: {} };
    }

    const isMessageResult = isMessageSearchResult(result);
    const messageId = isMessageResult ? getSearchResultMessageId(result) : null;
    const cacheKey = getPreviewCacheKey(result);

    if (!previewCache[cacheKey]) {
        previewCache[cacheKey] = await fetchPreviewHistory(boardId, {
            limit: isMessageResult ? MESSAGE_PREVIEW_HISTORY_LIMIT : BOARD_PREVIEW_HISTORY_LIMIT,
            showdata: false,
            ...(isMessageResult && messageId ? { refMsgId: messageId, offset: -10 } : {}),
        });
    }

    const board = allHistoryBoards.find(b => b?.id === boardId) || null;
    return {
        boardId,
        board,
        matchedMessageId: messageId,
        questions: mapHistoryToQuestions(previewCache[cacheKey] || []),
    };
};

export default getHistoryThreadPreview;
