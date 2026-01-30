import { cloneDeep, isEmpty } from "lodash";
import store from "../redux/store";
import InitiateChatConversationAction from "../chat/InitiateChatConversationAction";
import { updateChatData } from "../redux/globalSlice";
import { executionPipelineActions, getSearchHistory } from "../redux/actions/global.action";
import { cancelOngoingCall } from "../templateRenderer/utils/helper";

const MultiIntentExecution = (props) => {
    let state = store.getState().global;

    const resolveQuestionId = (item, questions) => {
        if (!item || !questions) {
            return item?.reqId || item?.id;
        }

        if (item?.reqId && questions[item.reqId]) {
            return item.reqId;
        }
        if (item?.id && questions[item.id]) {
            return item.id;
        }
        if (item?.messageId) {
            const matchedKey = Object.keys(questions).find(
                (key) =>
                    questions[key]?.messageId === item.messageId ||
                    questions[key]?.id === item.messageId
            );
            if (matchedKey) {
                return matchedKey;
            }
        }
        return item?.reqId || item?.id;
    };

    const runTask = (item, index = 0, q) => {
        state = store.getState().global;
        const { activeBoardId } = state;
        if (!!q) {
            let updatedQuestion = cloneDeep(state.questions);
            item = Object.values(updatedQuestion).find(qId => (updatedQuestion[qId?.parentMsgId]?.executingActionId === q?.id))
            item = updatedQuestion[item?.parentMsgId] || updatedQuestion[q?.parentMsgId] || updatedQuestion[state?.questions[q?.id]?.parentMsgId]
        }
        let _item = cloneDeep(item);
        let task = _item?.executionPipeline?.[index];
        task.stepIndex = index;
        store.dispatch(updateChatData({
            ...state.questions,
            [item?.reqId]: {
                ...item,
                status: "in-progress"
            }
        }))

        const params = { cId: _item?.id, type: _item?.type, stepId: task?._id, task, currentRunningQuestion: _item, parentMsgId: _item?.reqId, isTask: true }

        const payload = {
            "question": task?.utterance,
            "boardId": activeBoardId,
            "parentId": _item?.messageId,
            "context": {
                "intentId": task?.intents?.[0]?.id,
                "agentId": task?.intents?.[0]?.agentId,
                "stepId": task?._id
            }
        }

        InitiateChatConversationAction({ params, payload, multiIntentExecution: true })
    }

    const runNextTask = (index, status, question, item) => {
        const nextTaskIndex = index + 1;

        if ([undefined, null, '', 'draft', 'in-progress', 'threadRunning'].includes(status)) {
            return;
        }
        else {
            runTask(item, nextTaskIndex, question)
        }
    }

    const addNewTask = (index, task, item) => {
        const _questions = cloneDeep(state?.questions);
        const questionId = resolveQuestionId(item, _questions);
        const question = _questions[questionId] || {};
        const hasAddTask = question?.executionPipeline?.some(el => el?.type === "addTask")
        let currentExecutionPipeline = question?.executionPipeline?.filter(el => el?.type !== "addTask") || item?.executionPipeline?.filter(el => el?.type !== "addTask") || []
        
        if (isEmpty(question?.savedExecutionPipeline)) {
          _questions[questionId] = {
            ...question,
            savedExecutionPipeline: currentExecutionPipeline
          };
        } else {
          currentExecutionPipeline = question?.savedExecutionPipeline;
        }

        let newTask = {
          _id: index, // temp id, it will get replaced with backend id later
          utterance: '',
          headerMsg: 'Oh, it seems I have missed a step. My apologies. Please describe and add the steps.',
          step: `Step ${hasAddTask ? index : index+1}`,
          type: 'addTask' 
        }

        const updatedPipeline = Array.isArray(currentExecutionPipeline)
          ? [...currentExecutionPipeline]
          : [];
        updatedPipeline.splice(index, 0, newTask);
        
        const updatedQuestions = {
          ..._questions,
          [questionId]: { 
            ..._questions[questionId], 
            executionPipeline: updatedPipeline 
          }
        };
        store.dispatch(updateChatData(updatedQuestions))
      }
    const saveTask = async (index, task, executionPipeline, item, utterance) => {
        state = store.getState().global;
        let _questions = cloneDeep(state?.questions);
        const questionId = resolveQuestionId(item, _questions);

        let payload = {
            utterance: utterance,
            action: task?.type == 'addTask' ? 'add' : 'update',
        }

        if (task?.type === 'addTask' || task?.type === 'modify') {
            payload.index = index;
        }

        if(task?._id > 0 && task?.type === 'addTask'){
            payload.stepId = executionPipeline[task?._id - 1]?._id;
        } else if (task?.type === 'modify') {
            payload.stepId = task?._id;
        }

        let params = {
            messageId: item?.messageId,
            boardId: state?.activeBoardId,
        }

        const response = await store.dispatch(executionPipelineActions({params, payload}))
        
        if(!!response?.payload){
            _questions[questionId].executionPipeline = response?.payload?.executionPipeline;
            _questions[questionId].savedExecutionPipeline = response?.payload?.executionPipeline;
            store.dispatch(updateChatData(_questions))
        }

        return response;
    }

    const deleteNewTask = (item , task , index)  => {
        state = store.getState().global;
        const _questions = cloneDeep(state?.questions);
        const questionId = resolveQuestionId(item, _questions);
        const savedPipeline = _questions[questionId]?.savedExecutionPipeline;
        if (Array.isArray(savedPipeline)) {
            if(index && task?.type === 'modify'){
                savedPipeline[index].type = ''
            }
            _questions[questionId].executionPipeline = savedPipeline;
            store.dispatch(updateChatData(_questions))
        }
    }

    const deleteExistingTask = async (index, task, item) => {
        state = store.getState().global;
        let _questions = cloneDeep(state?.questions);

        let params = {
            messageId: item?.messageId,
            boardId: state?.activeBoardId,
        }

        let payload = {
            action: "delete",
            stepId: task?._id,
        }

        const response = await store.dispatch(executionPipelineActions({ params, payload }))

        if(!!response?.payload){
            _questions[item?.reqId || item?.id].executionPipeline = response?.payload?.executionPipeline;
            _questions[item?.reqId || item?.id].savedExecutionPipeline = response?.payload?.executionPipeline;
            store.dispatch(updateChatData(_questions))
        }

        return response;
    }

    const editTask = (index, task, item) => {
        state = store.getState().global;
        const _questions = cloneDeep(state?.questions);
        const questionId = resolveQuestionId(item, _questions);
        const question = _questions[questionId] || {};
        let hasEditTask = question?.executionPipeline?.find(el => el?.type === "modify")
        if(hasEditTask){
            hasEditTask.type = "draft"
        }
        // if(hasEditTask){
        //     deleteNewTask(item , hasEditTask , index)
        // }
        let currentExecutionPipeline = cloneDeep(
            question?.executionPipeline || item?.executionPipeline || []
        );

        if (isEmpty(question?.savedExecutionPipeline)) {
            _questions[questionId] = {
                ...question,
                savedExecutionPipeline: currentExecutionPipeline
            };
        } else {
            currentExecutionPipeline = question?.savedExecutionPipeline;
        }

        let _task = { ...task, type: 'modify', step: `Step ${index + 1}` }

        if (!Array.isArray(currentExecutionPipeline)) {
            currentExecutionPipeline = [];
        }
        currentExecutionPipeline.splice(index, 1, _task);

        _questions[questionId] = {
            ..._questions[questionId],
            executionPipeline: currentExecutionPipeline
        };
        store.dispatch(updateChatData(_questions))

    }

    const cancelTask = (task) => {
        if (task?.error) {
            state = store.getState().global;
            let _questions = cloneDeep(state?.questions);
            _questions[task?._id].skipped = true; //Adding this to the tasks that are skipped
            store.dispatch(updateChatData(_questions))
            // COmes into this if there is an error and wants to proceed with the next task
            // If a task is already skipped, we cant skip it again. So adding the flag to hide the skip task button.
            let stepIndex = task?.stepIndex + 1;
            runTask(null, stepIndex, task)
        } else {
            // Skip a current task and run the next task
            cancelOngoingCall(task?._id);
        }
    }

    const restartExecution = (parentQuestion) => {
        let updatedQuestions = cloneDeep(state.questions);
        updatedQuestions = Object.fromEntries(
            Object.entries(updatedQuestions).filter(([key, value]) => !value?.isTask)
        );
        let currentQuestion = updatedQuestions[parentQuestion?.reqId];
        currentQuestion.status = 'draft';
        updatedQuestions[parentQuestion?.reqId] = currentQuestion;
        store.dispatch(updateChatData(updatedQuestions))
        runTask(currentQuestion, 0)
    }

    const fetchHistoricalTask = async (item, task) => {
        state = store.getState().global;
        const { activeBoardId, questions } = state;
        let mockQuestions = cloneDeep(questions)
        if ((task?.hasOwnProperty('hasData') && task?.hasData) || (task?.externalIntegrationAction && task?.status === "completed") || task?.responseFetched) {
            mockQuestions[task?.stepId || task?.id] = { ...task, showResponse: !task?.showResponse }
            store.dispatch(updateChatData(mockQuestions))
        }
        else {
            const params = { pId: item?.messageId, msgId: task?.msgId || task?.messageId, showdata: true }
            const response = await store.dispatch(getSearchHistory({ boardId: activeBoardId, params }))

            if (response?.payload?.history) {
                let executionPipeLineIds = item?.executionPipeline?.map(pipelineItem => pipelineItem?._id);

                response.payload.history.map(historyTask => {
                    if (historyTask?.templateType === "action_send_msteams_message") {
                        historyTask.externalIntegrationAction = true;
                    }

                    if (executionPipeLineIds?.includes(historyTask?.stepId)) {
                        mockQuestions[historyTask?.stepId] = {
                            ...historyTask,
                            showData: true,
                            utterance: historyTask?.question,
                            parentMsgId: item?.reqId,
                            type: 'search',
                            showResponse: historyTask?.showResponse == true
                                ? false
                                : mockQuestions[historyTask?.stepId]?.showResponse == true
                                    ? false
                                    : true,
                            isTask: true,
                            responseFetched: true,
                        };
                    }
                });

                store.dispatch(updateChatData(mockQuestions));
            }
        }
    }


    return {
        runTask,
        runNextTask,
        addNewTask,
        saveTask,
        deleteNewTask,
        deleteExistingTask,
        editTask,
        cancelTask,
        restartExecution,
        fetchHistoricalTask
    }
}

export default MultiIntentExecution;
export {
    MultiIntentExecution
};
