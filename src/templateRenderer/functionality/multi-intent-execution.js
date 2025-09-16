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
        let currentExecutionPipeline = cloneDeep(_questions[item?.reqId]?.executionPipeline);
        

        if(isEmpty(_questions[item?.reqId]?.savedExecutionPipeline)){
          _questions[item?.reqId].savedExecutionPipeline = currentExecutionPipeline;
        }else{
          currentExecutionPipeline = _questions[item?.reqId].savedExecutionPipeline;
        }

        let newTask = {
          _id: index, // temp id, it will get replaced with backend id later
          utterance: '',
          headerMsg: 'Oh, it seems I have missed a step. My apologies. Please describe and add the steps.',
          step: `Step ${index+1}`,
          type: 'addTask' 
        }

        _questions[item?.reqId].executionPipeline.splice(index, 0, newTask);

        store.dispatch(updateChatData(_questions))
      }

    const saveTask = async (index, task, executionPipeline) => {

      let _questions = cloneDeep(state?.questions);
      let utterance = document.getElementById(`utterance-${item?.reqId}-${index}`)?.value;

      let payload = {
        utterance: utterance,
        action: task?.type == 'addTask' ? 'add' : 'update',
        addIntents: task?.intents?.filter(intent => !intent?._id)?.map(intent => intent?.id)
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
        _questions[item?.reqId].executionPipeline = response?.payload?.executionPipeline;
        _questions[item?.reqId].savedExecutionPipeline = response?.payload?.executionPipeline;
        store.dispatch(updateChatData(_questions))
      }
    }

    const deleteNewTask = () => {
        const _questions = cloneDeep(state?.questions);
        _questions[item?.reqId].executionPipeline = _questions[item?.reqId].savedExecutionPipeline;
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
        _questions[item?.reqId].executionPipeline = response?.payload?.executionPipeline;
        _questions[item?.reqId].savedExecutionPipeline = response?.payload?.executionPipeline;
        store.dispatch(updateChatData(_questions))
      }
    }

    const editTask = (index, task) => {
      const _questions = cloneDeep(state?.questions);
      let currentExecutionPipeline = cloneDeep(_questions[item?.reqId]?.executionPipeline);

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

    const addIntent = (index, task, selectedAgent) => {
      const _questions = cloneDeep(state?.questions);
      let currentExecutionPipeline = cloneDeep(_questions[item?.reqId]?.executionPipeline);
      if(!currentExecutionPipeline[index].intents){
        currentExecutionPipeline[index].intents = [];
      }
      currentExecutionPipeline[index].intents.push({
        agentId: selectedAgent.id,
        agentMeta: {
          name: selectedAgent.name,
          icon: selectedAgent.icon
        },
        name: selectedAgent.name,
        id: selectedAgent.id
      });
      _questions[item?.reqId].executionPipeline = currentExecutionPipeline;
      store.dispatch(updateChatData(_questions))
    }

    // show agent selection popup
    const showAgentSelectionPopup = (buttonElement, index, task, reqId) => {
      // Remove any existing popup
      const existingPopup = document.querySelector('.agent-selection-popup');
      if (existingPopup) {
        existingPopup.remove();
      }

      // Get available agents from Redux store
      const state = store.getState();
      const allAgents = state?.global?.allAgents?.data?.agents || [];
      const enabledAgents = allAgents.filter(agent => agent?.enabled && agent?.type !== "agenticApp");

      if (enabledAgents.length === 0) {
        console.warn('No enabled agents available');
        return;
      }

      // Create the popup
      const popup = document.createElement('sl-popup');
      popup.className = 'agent-selection-popup';
      popup.setAttribute('placement', 'top-start');
      popup.setAttribute('auto-size', 'vertical');
      popup.setAttribute('flip', 'true');
      popup.setAttribute('shift', 'true');
      popup.style.cssText = `
        z-index: 10000;
      `;

      // Create menu with agents
      const menu = document.createElement('sl-menu');
      menu.style.cssText = `
        max-height: 200px;
        overflow-y: auto;
        min-width: 200px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.15);
      `;

      // Add agents as menu items
      enabledAgents.forEach(agent => {
        const menuItem = document.createElement('sl-menu-item');
        menuItem.setAttribute('value', agent.id);
        menuItem.style.cssText = `
          display: flex;
          align-items: center;
          padding: 8px 12px;
          cursor: pointer;
        `;
        
        menuItem.innerHTML = `
          <div slot="prefix" style="display: flex; align-items: center; margin-right: 8px;">
            <img src="${agent.icon || ''}" alt="${agent.name}" style="width: 16px; height: 16px; border-radius: 2px;" onerror="this.style.display='none'" />
          </div>
          <span style="font-size: 14px; color: #374151;">${agent.name}</span>
        `;

        // Add click handler
        menuItem.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Add the selected agent
          addIntent(index, task, agent);
          
          // Hide and remove popup
          if (popup.hide) {
            popup.hide();
          } else {
            popup.removeAttribute('active');
            popup.style.display = 'none';
          }
          setTimeout(() => popup.remove(), 100);
        });

        menu.appendChild(menuItem);
      });

      popup.appendChild(menu);
      document.body.appendChild(popup);

      // Set the button as anchor and show popup
      popup.anchor = buttonElement;
      
      // Show popup with fallback
      if (popup.show) {
        popup.show();
      } else {
        popup.setAttribute('active', '');
        popup.style.display = 'block';
      }

      // Close popup when clicking outside
      const closePopup = (e) => {
        if (!popup.contains(e.target) && !buttonElement.contains(e.target)) {
          if (popup.hide) {
            popup.hide();
          } else {
            popup.removeAttribute('active');
            popup.style.display = 'none';
          }
          setTimeout(() => popup.remove(), 100);
          document.removeEventListener('click', closePopup);
        }
      };

      // Add close handler with delay to avoid immediate closure
      setTimeout(() => {
        document.addEventListener('click', closePopup);
      }, 100);
    }

    const deleteIntent = (index, task) => {
      const _questions = cloneDeep(state?.questions);
      let currentExecutionPipeline = cloneDeep(_questions[item?.reqId]?.executionPipeline);
      currentExecutionPipeline[index].intents = currentExecutionPipeline[index].intents.filter(intent => intent.agentId !== task?.intents[0].agentId);
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

        const deleteBtn = document.getElementById(`deleteBtn-${item?.reqId}-${index}`);
        if(deleteBtn && !deleteBtn.eventListenerAdded){
            deleteBtn.addEventListener("click", () => {
                deleteExistingTask(index, task);
            });
            deleteBtn.eventListenerAdded = true;
        }

        const editBtn = document.getElementById(`editBtn-${item?.reqId}-${index}`);
        if(editBtn && !editBtn.eventListenerAdded){
            editBtn.addEventListener("click", () => {
                editTask(index, task);
            });
            editBtn.eventListenerAdded = true;
        }

       if (task?.type === 'addTask' || task?.type === 'modify') {
         const cancelBtn = document.getElementById(`cancelBtn-${item?.reqId}-${index}`);
         if (cancelBtn && !cancelBtn.eventListenerAdded) {
           cancelBtn.addEventListener("click", () => {
            deleteNewTask();
           });
           cancelBtn.eventListenerAdded = true;
         }

         const doneBtn = document.getElementById(`doneBtn-${item?.reqId}-${index}`);
         if (doneBtn && !doneBtn.eventListenerAdded) {
           doneBtn.addEventListener("click", () => {
             saveTask(index, task, item?.executionPipeline);
           });
           doneBtn.eventListenerAdded = true;
         }

         const addIntentBtn = document.getElementById(`addAgentLabel-${item?.reqId}-${index}`);
         if (addIntentBtn && !addIntentBtn.eventListenerAdded) {
           addIntentBtn.addEventListener("click", (e) => {
             e.preventDefault();
             e.stopPropagation();
             showAgentSelectionPopup(addIntentBtn, index, task, item?.reqId);
           });
           addIntentBtn.eventListenerAdded = true;
         }

         const deleteIntentBtn = document.getElementById(`deleteIntent-${item?.reqId}-${index}`);
         if (deleteIntentBtn && !deleteIntentBtn.eventListenerAdded) {
           deleteIntentBtn.addEventListener("click", () => {
             deleteIntent(index, task);
           });
           deleteIntentBtn.eventListenerAdded = true;
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


