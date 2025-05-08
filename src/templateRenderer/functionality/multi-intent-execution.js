import { cloneDeep } from "lodash";
import store from "../../redux/store";
import InitiateChatConversationAction from "../../chat/InitiateChatConversationAction";

const multiIntentExecutionFunc = (item) => {

    let state = store.getState().global;

    const runTask = (index) => {
        const {activeBoardId} = state;
        
        
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

     const runButton = document.getElementById(`startBtn-${item?.id}`);
     const editButton = document.getElementById(`editBtn-${item?.id}`);

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
}

export { multiIntentExecutionFunc };


