import store from "../../redux/store";
import { MultiIntentExecution } from "../../chat";

const multiIntentExecutionFunc = (item) => {

    let state = store.getState().global;

    // Get the MultiIntentExecution functions
    const multiIntentExecutionInstance = MultiIntentExecution();
    const { 
        runTask: runTaskFunc, 
        runNextTask: runNextTaskFunc, 
        addNewTask: addNewTaskFunc, 
        saveTask: saveTaskFunc, 
        deleteNewTask: deleteNewTaskFunc, 
        deleteExistingTask: deleteExistingTaskFunc, 
        editTask: editTaskFunc 
    } = multiIntentExecutionInstance;

    // Wrapper functions that adapt the imported functions to work with DOM event handlers
    const runTask = (index, q) => {
        runTaskFunc(item, index, q);
    }

    const runNextTask = (index, status, question) => {
        runNextTaskFunc(index, status, question, item);
    }

    const addNewTask = (index, task) => {
        addNewTaskFunc(index, task, item);
    }

    const saveTask = async (index, task, executionPipeline) => {
        // Get utterance from DOM for this template-specific implementation
        let utterance = document.getElementById(`utterance-${item?.id}-${index}`)?.value;
        return await saveTaskFunc(index, task, executionPipeline, item, utterance);
    }

    const deleteNewTask = () => {
        deleteNewTaskFunc(item);
    }

    const deleteExistingTask = async (index, task) => {
        return await deleteExistingTaskFunc(index, task, item);
    }

    const editTask = (index, task) => {
        editTaskFunc(index, task, item);
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
            const isEditMode = editButton.textContent === 'Edit';
            if(isEditMode){
            /*fetch the class with taskIteam and  dragHandle and append showOptions to those divs*/
            /*when we click again on this button it should remove the appended showOptions */
            const taskItems = document.querySelectorAll('.taskItem');
            const dragHandles = document.querySelectorAll('.dragHandle');
            taskItems.forEach(taskItem => {
                taskItem.classList.add('showOptions');
            });
            dragHandles.forEach(dragHandle => {
                dragHandle.classList.add('showOptions');
            });   
          }else{
            const taskItems = document.querySelectorAll('.taskItem');
            const dragHandles = document.querySelectorAll('.dragHandle');
            taskItems.forEach(taskItem => {
                taskItem.classList.remove('showOptions');
            });
            dragHandles.forEach(dragHandle => {
                dragHandle.classList.remove('showOptions');
            });
          }          
          editButton.textContent = isEditMode ? 'Done' : 'Edit';
        });
        editButton.eventListenerAdded = true;
     }

     item?.executionPipeline?.forEach((task, index) => {
        const addNewTaskBtn = document.getElementById(`addNewTaskBtn-${index}`);
        const continueBtn = document.getElementById(`continueBtn-${task?._id}`);
        if(continueBtn && !continueBtn.eventListenerAdded){
            continueBtn.addEventListener("click", () => {
                cancelTask(task);
            });
            continueBtn.eventListenerAdded = true;
        }

        if(addNewTaskBtn && !addNewTaskBtn.eventListenerAdded){
            addNewTaskBtn.addEventListener("click", () => {
                addNewTask(index, task , item);
            });
            addNewTaskBtn.eventListenerAdded = true;
        }

        const deleteBtn = document.getElementById(`deleteBtn-${task?._id}`);
        if(deleteBtn && !deleteBtn.eventListenerAdded){
            deleteBtn.addEventListener("click", () => {
                deleteExistingTask(index, task);
            });
            deleteBtn.eventListenerAdded = true;
        }

        const editBtn = document.getElementById(`editBtn-${task?._id}`);
        if(editBtn && !editBtn.eventListenerAdded){
            editBtn.addEventListener("click", () => {
                editTask(index, task);
            });
            editBtn.eventListenerAdded = true;
        }

        const historyBtn = document.getElementById(`historyBtn-${task?._id}`);
        let _questions = cloneDeep(state?.questions);
        if(historyBtn && !historyBtn.eventListenerAdded){
            historyBtn.addEventListener("click", async () => {
                if(_questions?.hasOwnProperty(task?._id) && _questions[task?._id]?.hasOwnProperty('showResponse')){                    
                    /*update the task in the store after the toggle*/
                    _questions[task?._id].showResponse = !_questions[task?._id].showResponse;
                    store.dispatch(updateChatData(_questions));
                }else{
                    /*fetch the historical data*/
                    await fetchHistoricalTask(item, task);
                }                
            });
            historyBtn.eventListenerAdded = true;
        }

       if (task?.type === 'addTask' || task?.type === 'modify') {
         const cancelBtn = document.getElementById(`cancelBtn-${task?._id}`);
         if (cancelBtn && !cancelBtn.eventListenerAdded) {
           cancelBtn.addEventListener("click", () => {
            deleteNewTask(task?._id);
           });
           cancelBtn.eventListenerAdded = true;
         }

         const doneBtn = document.getElementById(`doneBtn-${task?._id}`);
         const utteranceInput = document.getElementById(`utterance-${task?._id}`);         
         
         // Function to check if there are changes by comparing with store values
         const checkForChanges = () => {
           if (!doneBtn || !utteranceInput) return;
           
           const currentState = store.getState().global;
           const currentTask = currentState?.questions[item?.reqId]?.executionPipeline?.[index];
           
           if (!currentTask) return;
           
           const domUtterance = utteranceInput.value || '';
           const storeUtterance = currentTask?.utterance || '';           
           const taskIntents = currentTask?.intents || [];
           const currentTaskSavedIntents = currentState?.questions[item?.reqId]?.savedExecutionPipeline?.[index]?.intents || [];
           
           const hasChanges = 
             domUtterance !== storeUtterance || compareArrays(taskIntents, currentTaskSavedIntents);
           
           if (hasChanges) {
             doneBtn.disabled = false;
             doneBtn.style.opacity = '1';
             doneBtn.style.cursor = 'pointer';
           } else {
             doneBtn.disabled = true;
             doneBtn.style.opacity = '0.5';
             doneBtn.style.cursor = 'not-allowed';
           }
         };

         // Initial check to set correct button state
         if (doneBtn) {
           checkForChanges();
         }

         // Add input listener for description changes
         if (utteranceInput && !utteranceInput.changeListenerAdded) {
           utteranceInput.addEventListener('input', checkForChanges);
           utteranceInput.addEventListener('change', checkForChanges);
           utteranceInput.changeListenerAdded = true;
         }

         if (doneBtn && !doneBtn.eventListenerAdded) {
           doneBtn.addEventListener("click", async () => {
             const utteranceInput = document.getElementById(`utterance-${item?.id}-${index}`);
             const response = await saveTask(index, task, item?.executionPipeline);
             if (response?.payload && utteranceInput) {
               const utteranceDiv = document.createElement("div");
               utteranceDiv.className = "utterance";
               utteranceDiv.id = `utterance-${item?.id}-${index}`;
               utteranceDiv.textContent = utteranceInput.value;
               utteranceInput.replaceWith(utteranceDiv);
             }
           });
           doneBtn.eventListenerAdded = true;
         }

         // Store reference to checkForChanges for intent modifications
         doneBtn.checkForChanges = checkForChanges;

         const addIntentBtn = document.getElementById(`addAgentLabel-${task?._id}`);
         if (addIntentBtn && !addIntentBtn.eventListenerAdded) {
           addIntentBtn.addEventListener("click", (e) => {
             e.preventDefault();
             e.stopPropagation();
             showAgentSelectionPopup(addIntentBtn, index, task, item?.reqId);
           });
           addIntentBtn.eventListenerAdded = true;
         }

         task?.intents?.forEach((intent, idx) => {
          const deleteIntentBtn = document.getElementById(`deleteIntent-${task?._id}-${intent?.agentMeta?.agentId}`);
          if(deleteIntentBtn && !deleteIntentBtn.eventListenerAdded){
            deleteIntentBtn.addEventListener("click", () => {
              deleteIntent(index, intent);
              // Trigger change check after deletion
              if (doneBtn && doneBtn.checkForChanges) {
                setTimeout(() => doneBtn.checkForChanges(), 50);
              }
            });
          }
         })
       }

     });

     // Setup drag and drop functionality
     setupDragAndDrop();

     return {
        runTask,
        runNextTask, 
        addNewTask,
        deleteExistingTask,
        saveTask,
        editTask,
        reorderExecutionPipeline
     }
}

export { multiIntentExecutionFunc };
