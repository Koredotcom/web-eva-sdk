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
        runTaskFunc(index, item, q);
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


