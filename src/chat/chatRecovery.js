import { fetchHistory } from "../redux/actions/global.action";
import { updateChatData } from "../redux/globalSlice";
import store from "../redux/store";
import JoinChatThread from "./JoinChatThread";
import {
  getSavedChatBoardId,
  readChatStreamSnapshots,
  saveActiveChatBoardId,
} from "./chatRecoveryStorage";

const getLatestBoardId = (historyResponse) => {
  const latestBoard = historyResponse?.payload?.data?.boards?.[0]
    || historyResponse?.payload?.boards?.[0];
  return latestBoard?.id || latestBoard?.boardId || latestBoard?.bId || null;
};

const restoreCachedQuestionState = () => {
  const questions = { ...store.getState().global.questions };
  const snapshots = readChatStreamSnapshots();
  let restoredAnswer = false;
  let restoredThoughts = false;

  Object.entries(questions).forEach(([questionKey, question]) => {
    if (question?.status !== "in-progress") return;

    const reqId = question?.reqId || questionKey;
    const snapshot = snapshots[reqId];
    if (!snapshot) return;

    let restoredQuestion = question;
    const answerMissing = question?.answer === undefined
      || question?.answer === null
      || question?.answer === "";
    if (answerMissing && typeof snapshot.answer === "string") {
      restoredQuestion = { ...restoredQuestion, answer: snapshot.answer };
      restoredAnswer = true;
    }

    const questionThoughtsMissing = !Array.isArray(question?.thoughts) || question.thoughts.length === 0;
    if (questionThoughtsMissing && Array.isArray(snapshot.thoughts) && snapshot.thoughts.length > 0) {
      restoredQuestion = {
        ...restoredQuestion,
        thoughts: snapshot.thoughts,
        ...(snapshot.thoughtViewType ? { thoughtViewType: snapshot.thoughtViewType } : {}),
      };
      restoredThoughts = true;
    }

    if (snapshot.botConversation && typeof snapshot.botConversation === "object") {
      const botConversation = { ...(restoredQuestion.botConversation || {}) };
      let nestedThoughtsRestored = false;

      Object.entries(snapshot.botConversation).forEach(([outputId, cachedConversation]) => {
        if (!Array.isArray(cachedConversation?.thoughts) || cachedConversation.thoughts.length === 0) return;

        const existingConversation = botConversation[outputId] || {};
        const existingThoughts = existingConversation.thoughts;
        if (Array.isArray(existingThoughts) && existingThoughts.length > 0) return;

        botConversation[outputId] = {
          ...existingConversation,
          thoughts: cachedConversation.thoughts,
          templateType: existingConversation.templateType || cachedConversation.templateType || "search_answer",
        };
        nestedThoughtsRestored = true;
      });

      if (nestedThoughtsRestored) {
        restoredQuestion = { ...restoredQuestion, botConversation };
        restoredThoughts = true;
      }
    }

    if (restoredQuestion !== question) questions[questionKey] = restoredQuestion;
  });

  if (restoredAnswer || restoredThoughts) store.dispatch(updateChatData(questions));
  return { restoredAnswer, restoredThoughts };
};

/**
 * Restore the conversation for this tab after SDK initialization. The saved
 * board is preferred; when none is saved, the newest history board is joined.
 * Cached stream state is merged into in-progress questions when the history
 * response does not contain the corresponding answer or thought data.
 *
 * @returns {Promise<{boardId: string|null, restored: boolean, answerRestored: boolean, thoughtsRestored: boolean, questions: object}>}
 */
const restoreChatSession = async () => {
  if (typeof window === "undefined" || !window.sdkConfig?.userId) {
    throw new Error("Call initializeSDK before restoreChatSession.");
  }

  let boardId = getSavedChatBoardId();
  if (!boardId) {
    const historyResponse = await store.dispatch(fetchHistory({ params: { limit: 1 } }));
    if (historyResponse?.meta?.requestStatus === "rejected") {
      throw historyResponse.payload || new Error("Unable to fetch the latest chat history.");
    }
    boardId = getLatestBoardId(historyResponse);
  }

  if (!boardId) {
    return {
      boardId: null,
      restored: false,
      answerRestored: false,
      thoughtsRestored: false,
      questions: store.getState().global.questions,
    };
  }

  await JoinChatThread({ boardId });
  saveActiveChatBoardId(boardId);
  const { restoredAnswer: answerRestored, restoredThoughts: thoughtsRestored } = restoreCachedQuestionState();
  return {
    boardId,
    restored: true,
    answerRestored,
    thoughtsRestored,
    questions: store.getState().global.questions,
  };
};

export default restoreChatSession;
