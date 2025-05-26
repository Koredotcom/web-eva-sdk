import { cloneDeep, isEmpty, isUndefined } from "lodash";
import store from "../../redux/store";
import InitiateChatConversationAction from "../../chat/InitiateChatConversationAction";
import { updateChatData } from "../../redux/globalSlice";
import { executionPipelineActions } from "../../redux/actions/global.action";

const multiIntentExecutionFunc = (item) => {

    let state = store.getState().global;

    const runTask = (index, q) => {
        const {activeBoardId} = state;  
        if(!!q){
          let updatedQuestion = cloneDeep(state.questions);
          item = Object.values(updatedQuestion).find(qId => (updatedQuestion[qId.parentMsgId]?.executingActionId ===  q?.id))
          item = updatedQuestion[item?.parentMsgId] || updatedQuestion[q?.parentMsgId] || updatedQuestion[state?.questions[q?.id]?.parentMsgId]
        }
        let _item = cloneDeep(item);
        let task = _item?.executionPipeline?.[index];
        task.stepIndex = index;

        const params = { cId: _item?.id, reqId : _item?.reqId, type: _item?.type, stepId: task?._id, task, currentRunningQuestion: _item}

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

        InitiateChatConversationAction({params, payload, multiIntentExecution: true })
    }

    const runNextTask = (index, status , question) => {
        const nextTaskIndex = index+1;
        // if(nextTaskIndex > item?.executionPipeline?.length) return;
        if([undefined, null, '', 'draft', 'in-progress', 'threadRunning'].includes(status)){
          return;
    
        }
        else runTask(nextTaskIndex , question)
      }

    const addNewTask = (index, task) => {
        const _questions = cloneDeep(state?.questions);
        let currentExecutionPipeline = cloneDeep(_questions[item?.id]?.executionPipeline);
        

        if(isEmpty(_questions[item?.id]?.savedExecutionPipeline)){
          _questions[item?.id].savedExecutionPipeline = currentExecutionPipeline;
        }else{
          currentExecutionPipeline = _questions[item?.id].savedExecutionPipeline;
        }

        let newTask = {
          _id: index, // temp id, it will get replaced with backend id later
          utterance: '',
          headerMsg: 'Oh, it seems I have missed a step. My apologies. Please describe and add the steps.',
          step: `Step ${index+1}`,
          type: 'addTask' 
        }

        _questions[item?.id].executionPipeline.splice(index, 0, newTask);

        store.dispatch(updateChatData(_questions))
      }

    const saveTask = async (index, task, executionPipeline) => {

      let _questions = cloneDeep(state?.questions);
      let utterance = document.getElementById(`utterance-${item?.id}-${index}`)?.value;

      let payload = {
        utterance: utterance,
        action: task?.type == 'addTask' ? 'add' : 'update',
      }

      if(task?._id > 0 && task?.type === 'addTask'){
        payload.stepId = executionPipeline[task?._id - 1]?._id;
      }else if(task?.type === 'modify'){
        payload.stepId = task?._id;
      }

      let params = {
        messageId: item?.messageId,
        boardId: state?.activeBoardId,
      }

      const response = await store.dispatch(executionPipelineActions({params, payload}))
      
      if(!!response?.payload){
        _questions[item?.id].executionPipeline = response?.payload?.executionPipeline;
        _questions[item?.id].savedExecutionPipeline = response?.payload?.executionPipeline;
        store.dispatch(updateChatData(_questions))
      }
    }

    const deleteNewTask = () => {
        const _questions = cloneDeep(state?.questions);
        _questions[item?.id].executionPipeline = _questions[item?.id].savedExecutionPipeline;
        store.dispatch(updateChatData(_questions))
    }

    const deleteExistingTask = async (index, task) => {
      let _questions = cloneDeep(state?.questions);

      let params = {
        messageId: item?.messageId,
        boardId: state?.activeBoardId,
      }

      let payload = {
        action: "delete",
        stepId: task?._id,
      }

      const response = await store.dispatch(executionPipelineActions({params, payload}))

      if(!!response?.payload){
        _questions[item?.id].executionPipeline = response?.payload?.executionPipeline;
        _questions[item?.id].savedExecutionPipeline = response?.payload?.executionPipeline;
        store.dispatch(updateChatData(_questions))
      }
    }

    const editTask = (index, task) => {
      const _questions = cloneDeep(state?.questions);
      let currentExecutionPipeline = cloneDeep(_questions[item?.id]?.executionPipeline);

      if(isEmpty(_questions[item?.reqId]?.savedExecutionPipeline)){
        _questions[item?.reqId].savedExecutionPipeline = currentExecutionPipeline;
      }else{
        currentExecutionPipeline = _questions[item?.reqId].savedExecutionPipeline;
      }

      let _task = {...task, type : 'modify', step : `Step ${index+1}`}

      currentExecutionPipeline.splice(index, 1, _task);

      _questions[item?.reqId].executionPipeline = currentExecutionPipeline;
      store.dispatch(updateChatData(_questions))
    }

     const runButton = document.getElementById(`startBtn-${item?.id}`);
     const editButton = document.getElementById(`editFlowBtn-${item?.id}`);

     if(runButton && !runButton.eventListenerAdded){
        runButton.addEventListener("click", () => {
            runTask(0);
        });
        runButton.eventListenerAdded = true;
     }

     if(editButton && !editButton.eventListenerAdded){
        editButton.addEventListener("click", () => {
            console.log("editButton", item);
        });
        editButton.eventListenerAdded = true;
     }

     item?.executionPipeline?.forEach((task, index) => {
        const addNewTaskBtn = document.getElementById(`addNewTaskBtn-${index}`);
        if(addNewTaskBtn && !addNewTaskBtn.eventListenerAdded){
            addNewTaskBtn.addEventListener("click", () => {
                addNewTask(index, task);
            });
            addNewTaskBtn.eventListenerAdded = true;
        }

        const deleteBtn = document.getElementById(`deleteBtn-${item?.id}-${index}`);
        if(deleteBtn && !deleteBtn.eventListenerAdded){
            deleteBtn.addEventListener("click", () => {
                deleteExistingTask(index, task);
            });
            deleteBtn.eventListenerAdded = true;
        }

        const editBtn = document.getElementById(`editBtn-${item?.id}-${index}`);
        if(editBtn && !editBtn.eventListenerAdded){
            editBtn.addEventListener("click", () => {
                editTask(index, task);
            });
            editBtn.eventListenerAdded = true;
        }

       if (task?.type === 'addTask' || task?.type === 'modify') {
         const cancelBtn = document.getElementById(`cancelBtn-${item?.id}-${index}`);
         if (cancelBtn && !cancelBtn.eventListenerAdded) {
           cancelBtn.addEventListener("click", () => {
            deleteNewTask();
           });
           cancelBtn.eventListenerAdded = true;
         }

         const doneBtn = document.getElementById(`doneBtn-${item?.id}-${index}`);
         if (doneBtn && !doneBtn.eventListenerAdded) {
           doneBtn.addEventListener("click", () => {
             saveTask(index, task, item?.executionPipeline);
           });
           doneBtn.eventListenerAdded = true;
         }
       }

     });

     return {
        runTask,
        runNextTask, 
        addNewTask,
        deleteExistingTask,
        saveTask,
        editTask
     }
}

export { multiIntentExecutionFunc };


