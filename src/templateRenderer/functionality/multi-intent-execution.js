import { cloneDeep, isEmpty, isUndefined } from "lodash";
import store from "../../redux/store";
import InitiateChatConversationAction from "../../chat/InitiateChatConversationAction";
import ChatInterface from "../../chat/ChatInterface.js";
import { updateChatData, setCurrentQuestion } from "../../redux/globalSlice";
import { executionPipelineActions, cancelAdvancedSearch } from "../../redux/actions/global.action";
import { createCloseIcon, tickMarkIcon } from "../icons-library.js";
import { cancelOngoingCall } from "../utils/helper.js";
import MultiIntentExecution from "../../multiIntentExecution/multiIntentExecution.js";
import "./multi-intent-execution.css";

/*
 * Delegated handler for "Continue Flow" buttons.
 *
 * During streaming, the multi-intent template DOM is replaced on every chunk.
 * Individual click listeners attached via multiIntentExecutionFunc are wiped and
 * re-attached asynchronously (setTimeout+rAF), leaving a window where clicks are
 * lost. A single delegated listener on the questions-container survives all DOM
 * replacements and handles clicks reliably.
 */
let _continueFlowDelegateAttached = false;
const INTERRUPTED_TASK_MESSAGE = "I see you interrupted the answer generation. Please feel free to provide more details or let me know how can I assist you further";
const ensureContinueFlowDelegate = () => {
    if (_continueFlowDelegateAttached) return;
    const container = document.getElementById('questions-container');
    if (!container) return;
    _continueFlowDelegateAttached = true;

    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-continue-task-id]');
        if (!btn) return;
        e.stopPropagation();

        const taskId = btn.getAttribute('data-continue-task-id');
        const index = parseInt(btn.getAttribute('data-continue-task-index'), 10);
        if (!taskId) return;

        let state = store.getState().global;
        const currentTaskQ = state?.questions?.[taskId];
        if (!currentTaskQ) return;

        const updated = cloneDeep(state.questions);
        updated[taskId] = {
            ...updated[taskId],
            status: "terminated",
            loading: false,
            answer: INTERRUPTED_TASK_MESSAGE,
            templateType: "search_answer",
            streamingStatus: "aborted",
            showResponse: true,
            viewType: undefined,
            botConversation: undefined,
            reqFlow: undefined,
            thoughts: undefined,
        };
        store.dispatch(updateChatData(updated));
        store.dispatch(setCurrentQuestion(null));

        // Kora-React parity: cancel the task-scoped request id.
        // cancelAdvancedSearch() URL-encodes this id before calling the API.
        const reqIdForCancel = currentTaskQ?.isTask ? (currentTaskQ?.reqId || currentTaskQ?.cId || taskId) : taskId;
        try {
            await store.dispatch(cancelAdvancedSearch({
                userId: state?.profile?.data?.id,
                reqId: reqIdForCancel,
                payload: { boardId: state?.activeBoardId }
            }));
        } catch (_) {
            // Proceed to next task even if cancel API fails
        } finally {
            try {
                const stepIndex = currentTaskQ?.stepIndex ?? index;
                MultiIntentExecution().runNextTask(stepIndex, 'completed', updated[taskId]);
            } catch (_) {}
        }
    });
};

const multiIntentExecutionFunc = (item) => {

    let state = store.getState().global;
    const { fetchHistoricalTask } = MultiIntentExecution();

    ensureContinueFlowDelegate();

    // Auto-scroll helper: scroll only when a new task starts.
    let _lastAutoScrolledTaskId = null;
    const scrollToTaskCard = (taskId) => {
      try {
        if (typeof document === "undefined") return;
        if (taskId === undefined || taskId === null) return;
        const idStr = String(taskId);
        if (_lastAutoScrolledTaskId === idStr) return;
        _lastAutoScrolledTaskId = idStr;
        const el = document.querySelector(`.dragTaskItem[data-task-id="${idStr.replace(/"/g, '\\"')}"]`);
        if (!el) return;
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      } catch (e) {
        // ignore
      }
    };

    const runTask = (index, q) => {
        // Always use fresh state + fresh parent question (avoid overwriting pipeline with stale `item`)
        state = store.getState().global;
        const { activeBoardId } = state;
        const questions = state.questions || {};
        let parent = questions[item?.reqId] || item;
        if (q) {
          // Resolve parent from current executing action id (task id)
          parent =
            Object.values(questions).find(
              (qId) => questions[qId?.parentMsgId]?.executingActionId === q?.id
            ) ||
            questions[parent?.parentMsgId] ||
            questions[q?.parentMsgId] ||
            parent;
        }

        // Exit edit/add mode when starting execution: strip temp `type` flags from pipeline tasks
        const pipelineBase = parent?.savedExecutionPipeline || parent?.executionPipeline || [];
        const sanitizedPipeline = Array.isArray(pipelineBase)
          ? pipelineBase.map((t) => {
              if (!t || typeof t !== "object") return t;
              const { type, ...rest } = t;
              return rest;
            })
          : [];

        const _item = { ...cloneDeep(parent), executionPipeline: sanitizedPipeline };
        const sourceTask = _item?.executionPipeline?.[index];
        if (!sourceTask) return;
        const task = { ...sourceTask, stepIndex: index };
        scrollToTaskCard(task?._id);

        store.dispatch(
          updateChatData({
            ...questions,
            [parent?.reqId]: {
              ...parent,
              executionPipeline: sanitizedPipeline,
              status: "in-progress",
            },
          })
        );

      const params = { cId: _item?.id, type: _item?.type, stepId: task?._id, task, currentRunningQuestion: _item, parentMsgId: _item?.reqId , reqId : _item?.id}

        const selectedAgentId = task?.intents?.[0]?.agentId;
        const selectedIntentId = task?.intents?.[0]?.id;

        // mcpAgent parity: intentId must NOT be sent for mcpAgent (matches Kora-React MultiIntentExecution.jsx)
        const allAgents = state?.allAgents?.data?.agents || [];
        const selectedAgentType = allAgents.find(a => a?.id === selectedAgentId)?.type;
        const context = {
          agentId: selectedAgentId,
          stepId: task?._id,
          ...(selectedAgentType !== 'mcpAgent' ? { intentId: selectedIntentId } : {})
        };

        const payload = {
            "question": task?.utterance,
            "boardId": activeBoardId,
            "parentId": _item?.messageId,
            "context": context
          }

        InitiateChatConversationAction({params, payload, multiIntentExecution: true })
    }

    const runNextTask = (index, status , question) => {
        const nextTaskIndex = index+1;
        if([undefined, null, '', 'draft', 'in-progress', 'threadRunning'].includes(status)){
          return;
        }
        else runTask(nextTaskIndex , question)
      }

   const addNewTask = (index, task, item) => {
        state = store.getState().global;
        const _questions = cloneDeep(state?.questions);
        const questionId = item?.reqId || item?.id;
        const question = _questions[questionId] || {};
        const hasAddTask = question?.executionPipeline?.some(el => el?.type === "addTask")
        let hasEditTask = question?.executionPipeline?.find(el => el?.type === "modify")
        if(hasEditTask){
            hasEditTask.type = "draft"
        }
        const addedTaskIndex = question?.executionPipeline?.findIndex(el => el.type === "addTask");
        let currentExecutionPipeline = question?.executionPipeline || item?.executionPipeline || [];
        if (isEmpty(question?.savedExecutionPipeline)) {
          _questions[questionId] = {
            ...question,
            savedExecutionPipeline: cloneDeep(currentExecutionPipeline)
          };
        } else {
          if(addedTaskIndex !== -1 && index > 0 && addedTaskIndex < index){
             index-=1;
             currentExecutionPipeline.splice(addedTaskIndex, 1);
          }
          else currentExecutionPipeline = question?.savedExecutionPipeline;
        }

        let newTask = {
          // temp id: MUST NOT collide with real step ids (e.g. "1" for 2nd task)
          _id: `tmp-${questionId}-${Date.now()}-${index}`,
          utterance: '',
          headerMsg: 'Oh, it seems I have missed a step. My apologies. Please describe and add the steps.',
          step: `Step ${index+1}`,
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

    const saveTask = async (index, task, executionPipeline) => {
      // Always use fresh state (handlers can run after other dispatches)
      state = store.getState().global;
      let _questions = cloneDeep(state?.questions);
      let utterance = document.getElementById(`utterance-${task?._id}`)?.value;

      // CRITICAL: task is a render-time snapshot. Intents/utterance are updated in the store
      // via addIntent()/persistUtterance() after the listener was registered.
      // Always read the fresh task from the store to get the latest intents.
      const freshTask = _questions[item?.reqId]?.executionPipeline?.[index] || task;
      const taskType = freshTask?.type || task?.type;

      let payload = {
        utterance: utterance,
        action: taskType === 'addTask' ? 'add' : 'update',
      }

      // Compute intents diff (same for both addTask and modify — matches Kora-React logic)
      const baselinePipeline = cloneDeep(_questions[item?.reqId]?.savedExecutionPipeline || item?.executionPipeline || []);
      const savedIntentsAtIndex = baselinePipeline?.[index]?.intents || [];
      const currentIntents = freshTask?.intents || [];

      const addedIntents = currentIntents
        .filter(({ agentId }) => !savedIntentsAtIndex.some(s => s?.agentId === agentId))
        .map(intent => intent?.agentId)
        .filter(Boolean);

      const deletedIntents = savedIntentsAtIndex
        .filter(({ agentId }) => !currentIntents.some(c => c?.agentId === agentId))
        .map(intent => intent?._id)
        .filter(Boolean);

      if(taskType === 'addTask'){
        // Kora-React: for multi_intent_execution templateType, send index only (not stepId)
        payload.index = index;
        if(addedIntents?.length > 0){
          payload.addIntents = addedIntents;
        }
      } else if(taskType === 'modify'){
        payload.stepId = freshTask?._id || task?._id;
        payload.index = index;
        if(addedIntents?.length > 0){
          payload.addIntents = addedIntents;
        }
        if(deletedIntents?.length > 0){
          payload.deletedIntents = deletedIntents;
        }
      }

      let params = {
        messageId: item?.messageId,
        boardId: state?.activeBoardId,
      }
      
      /*put the loading state in the task */
      let currentExecutionPipeline = cloneDeep(_questions[item?.reqId]?.executionPipeline) || [];
      currentExecutionPipeline[index] = { ...currentExecutionPipeline[index], loading: true };
      const updatedQuestions = {
        ..._questions,
        [item?.reqId]: {
          ..._questions[item?.reqId],
          executionPipeline: currentExecutionPipeline
        }
      };
      store.dispatch(updateChatData(updatedQuestions))

      const response = await store.dispatch(executionPipelineActions({params, payload}))
      
      if(!!response?.payload){
        // Refresh again after await to avoid overwriting newer store changes
        state = store.getState().global;
        _questions = cloneDeep(state?.questions);
        const responsePipeline = cloneDeep(response?.payload?.executionPipeline || []);
        const localPipeline = cloneDeep(_questions[item?.reqId]?.executionPipeline || []);

        // Kora-React parity: preserve local step UI state on the first modify/update
        // if the API response omits transient client-side fields like intents/showResponse.
        responsePipeline.forEach((serverTask, pipelineIndex) => {
          const localTaskAtIndex = localPipeline?.[pipelineIndex];
          if (!serverTask || !localTaskAtIndex) return;

          const sameTask =
            (serverTask?._id && localTaskAtIndex?._id && serverTask._id === localTaskAtIndex._id) ||
            pipelineIndex === index;

          if (!sameTask) return;

          if ((!Array.isArray(serverTask?.intents) || serverTask.intents.length === 0) && Array.isArray(localTaskAtIndex?.intents) && localTaskAtIndex.intents.length > 0) {
            serverTask.intents = localTaskAtIndex.intents;
          }
          if (localTaskAtIndex?.showResponse !== undefined && serverTask?.showResponse === undefined) {
            serverTask.showResponse = localTaskAtIndex.showResponse;
          }
        });
        const updatedQuestions = {
          ..._questions,
          [item?.reqId]: {
            ..._questions[item?.reqId],
            executionPipeline: responsePipeline,
            savedExecutionPipeline: responsePipeline
          }
        };
        store.dispatch(updateChatData(updatedQuestions))
      }
    }

    const deleteNewTask = (taskId) => {
        state = store.getState().global;
        const _questions = cloneDeep(state?.questions);
        /*remove type key from the savedExecutionPipeline of that particular task which is having _id as task?._id*/
      const taskIndex = _questions[item?.reqId].savedExecutionPipeline?.findIndex(task => task?._id === taskId);
      if(taskIndex !== -1){
        const {type, ...rest} = _questions[item?.reqId].savedExecutionPipeline?.[taskIndex];  
        _questions[item?.reqId].savedExecutionPipeline[taskIndex] = rest;  
      }    

        const updatedQuestions = {
          ..._questions,
          [item?.reqId]: { 
            ..._questions[item?.reqId], 
          executionPipeline: _questions[item?.reqId].savedExecutionPipeline
          }
        };
        store.dispatch(updateChatData(updatedQuestions))
    }

    const deleteExistingTask = async (index, task) => {
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

      const response = await store.dispatch(executionPipelineActions({params, payload}))

      if(!!response?.payload){
        const updatedQuestions = {
          ..._questions,
          [item?.reqId]: {
            ..._questions[item?.reqId],
            executionPipeline: response?.payload?.executionPipeline,
            savedExecutionPipeline: response?.payload?.executionPipeline
          }
        };
        store.dispatch(updateChatData(updatedQuestions))
      }
    }

    const editTask = (index, task) => {
      state = store.getState().global;
      const _questions = cloneDeep(state?.questions);
      let currentExecutionPipeline = cloneDeep(_questions[item?.reqId]?.executionPipeline);
      const addTaskIndexExists = currentExecutionPipeline?.findIndex(el => el?.type === 'addTask');

      if(isEmpty(_questions[item?.reqId]?.savedExecutionPipeline)){
        _questions[item?.reqId].savedExecutionPipeline = cloneDeep(currentExecutionPipeline);
      }
      else{
        if( addTaskIndexExists !== -1 && addTaskIndexExists < index && index > 0){
          index-=1;
          currentExecutionPipeline.splice(addTaskIndexExists, 1);

        }
        else currentExecutionPipeline = _questions[item?.reqId].savedExecutionPipeline;
      }

      let _task = {...task, type : 'modify', step : `Step ${index+1}`}

      currentExecutionPipeline.splice(index, 1, _task);
      /*need to remove the type key from other tasks which are having type key other than this index */
      currentExecutionPipeline.forEach((task, pipeLineIndex) => {
        if(pipeLineIndex !== index){
          task.hasOwnProperty('type') ? delete task.type : '';
        }
      });

      const updatedQuestions = {
        ..._questions,
        [item?.reqId]: { ..._questions[item?.reqId], executionPipeline: currentExecutionPipeline }
      };
      store.dispatch(updateChatData(updatedQuestions))
    }

    const addIntent = (index, task, selectedAgent) => {
      // Always use fresh state (agent selection triggers re-renders)
      state = store.getState().global;
      const _questions = cloneDeep(state?.questions);
      let currentQuestion = cloneDeep(_questions[item?.reqId]);
      let currentExecutionPipeline = cloneDeep(currentQuestion?.executionPipeline) || [];

      // Persist the current utterance from DOM before mutating pipeline (prevents it from disappearing)
      const utteranceInput = document.getElementById(`utterance-${task?._id}`);
      if (utteranceInput) {
        const utterance = utteranceInput.value || '';
        if (currentExecutionPipeline[index]) {
          currentExecutionPipeline[index].utterance = utterance;
        }
      }
      // Preserve baseline savedExecutionPipeline (used to enable Done)
      let savedExecutionPipeline = cloneDeep(currentQuestion?.savedExecutionPipeline || currentExecutionPipeline);
      // Kora-React parity: single selection. Replace existing intents instead of appending.
      currentExecutionPipeline[index].intents = [{
        agentId: selectedAgent.id,
        agentMeta: {
          name: selectedAgent.name,
          icon: selectedAgent.icon
        },
        name: selectedAgent.name,
        id: selectedAgent.name
      }];
      
      const updatedQuestions = {
        ..._questions,
        [item?.reqId]: { ...currentQuestion, executionPipeline: currentExecutionPipeline, savedExecutionPipeline }
      };
      store.dispatch(updateChatData(updatedQuestions));
      
      // Trigger change check for Done button
      const doneBtn = document.getElementById(`doneBtn-${task?._id}`);
      if (doneBtn && doneBtn.checkForChanges) {
        
        doneBtn.checkForChanges();
      }
    }

    const showAgentSelectionPopup = (buttonElement, index, task, reqId) => {
      const existingPopup = document.querySelector('.agent-selection-popup');
      if (existingPopup) {
        existingPopup.remove();
      }

      const state = store.getState();
      const allAgents = state?.global?.allAgents?.data?.agents || [];
      const enabledAgents = allAgents.filter(agent => agent?.enabled && agent?.type !== "agenticApp");

      if (enabledAgents.length === 0) {
        console.warn('No enabled agents available');
        return;
      }

      // Create agent menu item HTML
      const createAgentMenuItemHTML = (agent) => {
        const isSelected = task?.intents?.length > 0 && task?.intents?.find(intent => intent?.agentId === agent.id);
        const disabledAttr = isSelected ? 'disabled' : '';
        const className = isSelected ? 'menu-item disabled' : 'menu-item';
        
        return `
          <sl-menu-item 
            value="${agent.id}" 
            class="${className}" 
            ${disabledAttr}
            data-agent-id="${agent.id}"
            data-agent-name="${agent.name}"
            data-agent-icon="${agent.icon || ''}"
            data-is-selected="${isSelected}"
          >
            <div slot="prefix" style="display: flex; align-items: center; margin-right: 8px;">
              <img src="${agent.icon || ''}" alt="${agent.name}" style="max-width: 1.5rem; height: 1rem; object-fit: contain;" onerror="this.style.display='none'" />
            </div>
            <span style="font-size: .875rem; font-weight: 500; line-height: 1.25rem; color: #424242; max-width: 16.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${agent.name}</span>
            ${isSelected ? `<div slot="suffix" style="display: flex;margin-left: 0.5rem;align-items: center;">${tickMarkIcon({ size: 12, color: "#475467" })}</div>` : ''}
          </sl-menu-item>
        `;
      };

      // Generate agents HTML
      const generateAgentsHTML = (agentsToRender = enabledAgents) => {
        if (agentsToRender.length === 0) {
          return '<div class="no-results">No agents found</div>';
        }
        
        return agentsToRender.map(agent => createAgentMenuItemHTML(agent)).join('');
      };

      // Create popup HTML
      const popupHTML = `
        <div class="popup-container">
          <div class="agentsTabWrapper">
            <div class="agentsHeader">
              <div class="agentsTabHeadingWrapper">All agents published to you</div>
              <div class="agentSearch">
                <input type="text" placeholder="Search" class="popup-search-input" id="popup-search-input" />
                <div class="agentCancel popup-close-button" id="popup-close-button">${createCloseIcon({ size: 12, color: "#667085" })}</div>
              </div>
            </div>
          </div>
          <sl-menu class="popup-menu" id="popup-menu">
            ${generateAgentsHTML()}
          </sl-menu>
        </div>
      `;

      // Create popup element
      const popup = document.createElement('sl-popup');
      popup.className = 'agent-selection-popup';
      popup.setAttribute('placement', 'top-start');
      popup.setAttribute('auto-size', 'vertical');
      popup.setAttribute('flip', 'true');
      popup.setAttribute('shift', 'true');
      popup.innerHTML = popupHTML;

      document.body.appendChild(popup);
      popup.anchor = buttonElement;

      // Get references to elements after DOM creation
      const searchInput = popup.querySelector('#popup-search-input');
      const closeButton = popup.querySelector('#popup-close-button');
      const menu = popup.querySelector('#popup-menu');

      // Function to render agents based on search
      const renderAgents = (agentsToRender = enabledAgents) => {
        menu.innerHTML = generateAgentsHTML(agentsToRender);
        attachMenuItemListeners();
      };

      // Attach event listeners to menu items
      const attachMenuItemListeners = () => {
        const menuItems = menu.querySelectorAll('sl-menu-item:not([disabled])');
        menuItems.forEach(menuItem => {
          menuItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const agentData = {
              id: menuItem.dataset.agentId,
              name: menuItem.dataset.agentName,
              icon: menuItem.dataset.agentIcon
            };
            
            addIntent(index, task, agentData);
            
            // Trigger change check after adding agent
            const doneBtn = document.getElementById(`doneBtn-${task?._id}`);
            if (doneBtn && doneBtn.checkForChanges) {
              setTimeout(() => doneBtn.checkForChanges(), 50);
            }
            
            closePopupFunction();
          });
        });
      };

      // Close popup function
      const closePopupFunction = () => {
        if (popup.hide) {
          popup.hide();
        } else {
          popup.removeAttribute('active');
          popup.style.display = 'none';
        }
        setTimeout(() => popup.remove(), 100);
        document.removeEventListener('click', closePopup);
      };

      // Initial attach of menu item listeners
      attachMenuItemListeners();

      // Add search functionality
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
          renderAgents();
        } else {
          const filteredAgents = enabledAgents.filter(agent => 
            agent.name.toLowerCase().includes(searchTerm)
          );
          renderAgents(filteredAgents);
        }
      });

      // Add keyboard navigation
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closePopupFunction();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          // Select the first available (non-disabled) agent from current filter
          const firstMenuItem = menu.querySelector('sl-menu-item:not([disabled])');
          if (firstMenuItem) {
            firstMenuItem.click();
          }
        }
      });

      // Add close button functionality
      closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closePopupFunction();
      });

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
          closePopupFunction();
        }
      };

      // Add close handler with delay to avoid immediate closure
      setTimeout(() => {
        document.addEventListener('click', closePopup);
      }, 100);
      
      setTimeout(() => {
        searchInput.focus();
      }, 150);
    }

    const deleteIntent = (index, intentToDelete) => {
      state = store.getState().global;
      const _questions = cloneDeep(state?.questions);
      let currentQuestion = cloneDeep(_questions[item?.reqId]);
      let currentExecutionPipeline = cloneDeep(currentQuestion?.executionPipeline);
      // Preserve baseline savedExecutionPipeline (used to enable Done)
      let savedExecutionPipeline = cloneDeep(currentQuestion?.savedExecutionPipeline || currentExecutionPipeline); 
      let task = currentExecutionPipeline[index];     
      currentExecutionPipeline[index].intents = currentExecutionPipeline[index]?.intents?.filter(intent => intent?.agentId !== intentToDelete?.agentId);
            
      currentQuestion.executionPipeline[index].intents = currentExecutionPipeline?.[index]?.intents || [];
      
      /*lets check whether the utterance is changed or not for the executionPipeline with this index */
      const utteranceInput = document.getElementById(`utterance-${task?._id}`);
      const utterance = utteranceInput?.value || '';
      const currentUtterance = currentExecutionPipeline[index]?.utterance || '';
      if(utterance !== currentUtterance){
        currentExecutionPipeline[index].utterance = utterance;
        currentQuestion.executionPipeline[index].utterance = utterance;
      }
      const updatedQuestions = {
        ..._questions,
        [item?.reqId]: { ...currentQuestion, executionPipeline: currentExecutionPipeline, savedExecutionPipeline }
      };
      store.dispatch(updateChatData(updatedQuestions));
      
      // Trigger change check for Done button      
      const doneBtn = document.getElementById(`doneBtn-${task?._id}`);
      if (doneBtn && doneBtn.checkForChanges) {
        doneBtn.checkForChanges();
      }
    }
/*this compare array should check where the array are same or not, if same then not changes are required so it should return false, else true */
    const compareArrays = (arr1, arr2) => {
      if(arr1.length !== arr2.length) return true;
      /*this below line should check whether the arrays are same, if same then no changes are required so it should return false, else true */
      return !arr1.every(item => arr2.some(item2 => item2.agentId === item.agentId));
    }

    const cancelTask = (task) => {
      cancelOngoingCall(task?._id);
    }

    // Drag and Drop functionality
    let draggedElement = null;
    let draggedIndex = null;
    let dropIndicator = null;

    const createDropIndicator = () => {
      const indicator = document.createElement('div');
      indicator.className = 'drop-indicator';
      indicator.style.cssText = `
        height: 2px;
        background-color: #3b82f6;
        border-radius: 1px;
        margin: 4px 0;
        transition: all 0.2s ease;
        opacity: 0;
      `;
      return indicator;
    };

    const showDropIndicator = (target, position) => {
      hideDropIndicator();
      dropIndicator = createDropIndicator();
      dropIndicator.style.opacity = '1';
      
      if (position === 'before') {
        target.parentNode.insertBefore(dropIndicator, target);
      } else {
        target.parentNode.insertBefore(dropIndicator, target.nextSibling);
      }
    };

    const hideDropIndicator = () => {
      if (dropIndicator) {
        dropIndicator.remove();
        dropIndicator = null;
      }
    };

    const reorderExecutionPipeline = async (fromIndex, toIndex) => {
      state = store.getState().global;
      const _questions = cloneDeep(state?.questions);
      let currentExecutionPipeline = cloneDeep(_questions[item?.reqId]?.executionPipeline);
      
      if(!currentExecutionPipeline || currentExecutionPipeline.length <= 1) return;

      const draggedItem = currentExecutionPipeline.splice(fromIndex, 1)[0];
      currentExecutionPipeline.splice(toIndex, 0, draggedItem);

      // Optimistic UI update
      const updatedQuestions = {
        ..._questions,
        [item?.reqId]: {
          ..._questions[item?.reqId],
          executionPipeline: currentExecutionPipeline,
          savedExecutionPipeline: currentExecutionPipeline
        }
      };
      store.dispatch(updateChatData(updatedQuestions));

      // Persist reorder to server (same as Kora-React: action: 'reOrder')
      const params = {
        messageId: item?.messageId,
        boardId: state?.activeBoardId,
      };
      const payload = {
        action: 'reOrder',
        stepId: draggedItem?._id,
        index: toIndex,
      };
      const response = await store.dispatch(executionPipelineActions({ params, payload }));
      if(response?.payload?.executionPipeline){
        state = store.getState().global;
        const freshQuestions = cloneDeep(state?.questions);
        const serverPipeline = cloneDeep(response.payload.executionPipeline || []);
        const localPipeline = cloneDeep(freshQuestions?.[item?.reqId]?.executionPipeline || currentExecutionPipeline || []);

        // Preserve client-side step metadata the reorder API may omit.
        const localById = new Map(
          localPipeline
            .filter(step => step?._id)
            .map(step => [step._id, step])
        );

        const mergedPipeline = serverPipeline.map((serverStep) => {
          const localStep = localById.get(serverStep?._id);
          if (!localStep) return serverStep;
          return {
            ...localStep,
            ...serverStep,
            intents: (Array.isArray(serverStep?.intents) && serverStep.intents.length > 0)
              ? serverStep.intents
              : (localStep?.intents || []),
            showResponse: serverStep?.showResponse ?? localStep?.showResponse,
            showResponseFlow: serverStep?.showResponseFlow ?? localStep?.showResponseFlow,
          };
        });
        store.dispatch(updateChatData({
          ...freshQuestions,
          [item?.reqId]: {
            ...freshQuestions[item?.reqId],
            executionPipeline: mergedPipeline,
            savedExecutionPipeline: mergedPipeline
          }
        }));
      }
    };

    const setupDragAndDrop = () => {
      const multiIntentRoot = document.getElementById(`multiIntentExecution-${item?.reqId}`);
      const taskItems = multiIntentRoot
        ? multiIntentRoot.querySelectorAll('.dragTaskItem[draggable="true"]')
        : document.querySelectorAll('.dragTaskItem[draggable="true"]');
      
      taskItems.forEach((taskItem, index) => {
        
        if (taskItem.dragListenersAdded) return;
        
        taskItem.addEventListener('dragstart', (e) => {
          draggedElement = taskItem;
          draggedIndex = parseInt(taskItem.dataset.taskIndex);
          
          
          taskItem.style.opacity = '0.5';
          taskItem.classList.add('dragging');
          
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/html', taskItem.outerHTML);
        });

        taskItem.addEventListener('dragend', (e) => {
          // Reset visual state
          taskItem.style.opacity = '';
          taskItem.classList.remove('dragging');
          hideDropIndicator();
          
          // Reset drag variables
          draggedElement = null;
          draggedIndex = null;
        });

        taskItem.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          
          if (draggedElement && draggedElement !== taskItem) {
            const rect = taskItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const position = e.clientY < midpoint ? 'before' : 'after';
            
            showDropIndicator(taskItem, position);
          }
        });

        taskItem.addEventListener('drop', (e) => {
          e.preventDefault();
          hideDropIndicator();
          
          if (draggedElement && draggedElement !== taskItem) {
            const targetIndex = parseInt(taskItem.dataset.taskIndex);
            const rect = taskItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            let newIndex;
            if (e.clientY < midpoint) {
              // Dropping before the target
              newIndex = targetIndex;
            } else {
              // Dropping after the target
              newIndex = targetIndex + 1;
            }
            
            
            if (draggedIndex < newIndex) {
              newIndex--;
            }
            
            
            if (draggedIndex !== newIndex) {
              reorderExecutionPipeline(draggedIndex, newIndex);
            }
          }
        });

        
        taskItem.dragListenersAdded = true;
      });

      
      const container = document.querySelector('.multiIntentExecution');
      if (container && !container.dragOverListenerAdded) {
        container.addEventListener('dragover', (e) => {
          e.preventDefault();
          hideDropIndicator();
        });
        
        container.addEventListener('drop', (e) => {
          e.preventDefault();
          hideDropIndicator();
        });
        
        container.dragOverListenerAdded = true;
      }
    };

     const runButton = document.getElementById(`startBtn-${item?.reqId}`);
     const editButton = document.getElementById(`editFlowBtn-${item?.reqId}`);

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

     // "Add step" button after the last task
     const addNewTaskLastBtn = document.getElementById(`addNewTaskLastBtn-${item?.reqId}`);
     if(addNewTaskLastBtn && !addNewTaskLastBtn.eventListenerAdded){
        addNewTaskLastBtn.addEventListener("click", () => {
            const lastIndex = (store.getState()?.global?.questions?.[item?.reqId]?.executionPipeline?.length) || item?.executionPipeline?.length;
            const lastTask = item?.executionPipeline?.[lastIndex - 1];
            addNewTask(lastIndex, lastTask, item);
        });
        addNewTaskLastBtn.eventListenerAdded = true;
     }

     // Cheveron (history toggle) button for completed/terminated tasks
     item?.executionPipeline?.forEach((task) => {
        const cheveronBtn = document.getElementById(`cheveronBtn-${task?._id}`);
        if(cheveronBtn && !cheveronBtn.eventListenerAdded){
            cheveronBtn.addEventListener("click", async (e) => {
                e?.stopPropagation?.();
                state = store.getState().global;
                let _qs = cloneDeep(state?.questions);
                if(_qs?.hasOwnProperty(task?._id) && _qs[task?._id]?.hasOwnProperty('showResponse')){
                    _qs[task?._id].showResponse = !_qs[task?._id].showResponse;
                    store.dispatch(updateChatData(_qs));
                }else{
                    await fetchHistoricalTask(item, task);
                }
            });
            cheveronBtn.eventListenerAdded = true;
        }
     });

     // NOTE: "Continue Flow" buttons are handled via event delegation (ensureContinueFlowDelegate)
     // so they don't need per-element listeners that break during streaming DOM replacement.

     item?.executionPipeline?.forEach((task, index) => {
        const addNewTaskBtn = document.getElementById(`addNewTaskBtn-${item?.reqId}-${index}`);

        if(addNewTaskBtn && !addNewTaskBtn.eventListenerAdded){
            addNewTaskBtn.addEventListener("click", () => {
                addNewTask(index, task , item);
            });
            addNewTaskBtn.eventListenerAdded = true;
        }

        const deleteBtn = document.getElementById(`deleteBtn-${task?._id}`);
        if(deleteBtn && !deleteBtn.eventListenerAdded){
            deleteBtn.addEventListener("click", (e) => {
                e?.stopPropagation?.();
                deleteExistingTask(index, task);
            });
            deleteBtn.eventListenerAdded = true;
        }

        const editBtn = document.getElementById(`editBtn-${task?._id}`);
        if(editBtn && !editBtn.eventListenerAdded){
            editBtn.addEventListener("click", (e) => {
                e?.stopPropagation?.();
                editTask(index, task);
            });
            editBtn.eventListenerAdded = true;
        }

        const utteranceTextEl = document.getElementById(`utteranceText-${task?._id}`);
        if(utteranceTextEl && !utteranceTextEl.eventListenerAdded){
            utteranceTextEl.addEventListener("click", (e) => {
                e?.stopPropagation?.();
                const currentStatus = store.getState()?.global?.questions?.[item?.reqId]?.status || item?.status;
                if(currentStatus === 'draft'){
                    editTask(index, task);
                }
            });
            utteranceTextEl.eventListenerAdded = true;
        }

        // Entire taskItem card is clickable to trigger edit for draft pipeline (matches Kora-React)
        const taskItemEl = document.getElementById(`taskItem-${task?._id}`);
        if(taskItemEl && !taskItemEl.eventListenerAdded){
            taskItemEl.addEventListener("click", (e) => {
                const currentStatus = store.getState()?.global?.questions?.[item?.reqId]?.status || item?.status;
                if(currentStatus === 'draft'){
                    editTask(index, task);
                }
            });
            taskItemEl.eventListenerAdded = true;
        }

        const historyBtn = document.getElementById(`historyBtn-${task?._id}`);
        if(historyBtn && !historyBtn.eventListenerAdded){
            historyBtn.addEventListener("click", async () => {
                state = store.getState().global;
                let _questions = cloneDeep(state?.questions);
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

         // Delete icon in the edit/add form header:
         // - addTask  → only remove the form from local state (it was never saved to server)
         // - modify   → remove the form locally AND call the delete API (Kora-React parity)
         const deleteNewTaskBtn = document.getElementById(`deleteNewTaskBtn-${task?._id}`);
         if (deleteNewTaskBtn && !deleteNewTaskBtn.eventListenerAdded) {
           deleteNewTaskBtn.addEventListener("click", (e) => {
             e?.stopPropagation?.();
             deleteNewTask(task?._id);
             if (task?.type === 'modify') {
               deleteExistingTask(index, task);
             }
           });
           deleteNewTaskBtn.eventListenerAdded = true;
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
           const savedUtterance = currentState?.questions[item?.reqId]?.savedExecutionPipeline?.[index]?.utterance || '';
           const taskIntents = currentTask?.intents || [];
           const currentTaskSavedIntents = currentState?.questions[item?.reqId]?.savedExecutionPipeline?.[index]?.intents || [];
           
           // Done button disabled if utterance is empty (matches Kora-React) or no meaningful changes
           const utteranceEmpty = !domUtterance || domUtterance.trim().length === 0;
           const hasChanges = !utteranceEmpty && (domUtterance !== savedUtterance || compareArrays(taskIntents, currentTaskSavedIntents));
           
           if (hasChanges) {
             doneBtn.disabled = false;
             doneBtn.classList.remove('disabled');
             doneBtn.style.opacity = '1';
             doneBtn.style.cursor = 'pointer';
           } else {
             doneBtn.disabled = true;
             doneBtn.classList.add('disabled');
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
           // Persist typed utterance into store so it survives re-renders (e.g., when adding an agent)
           const persistUtterance = () => {
             const currentState = store.getState().global;
             const qs = cloneDeep(currentState.questions);
             const q = qs[item?.reqId];
             if (!q?.executionPipeline?.[index]) return;
             q.executionPipeline[index].utterance = utteranceInput.value || '';
             qs[item?.reqId] = q;
             store.dispatch(updateChatData(qs));
           };
           utteranceInput.addEventListener('input', checkForChanges);
           utteranceInput.addEventListener('change', checkForChanges);
           // IMPORTANT: Do NOT dispatch on every keystroke (causes UI fluctuation due to full re-render).
           // Persist only on change/blur; before actions like "Add Agent" we already copy DOM -> store.
           utteranceInput.addEventListener('change', persistUtterance);
           utteranceInput.changeListenerAdded = true;
         }

         if (doneBtn && !doneBtn.eventListenerAdded) {
           doneBtn.addEventListener("click", (e) => {
             if (doneBtn.disabled) {
               e.preventDefault();
               return;
             }
             // Show loading state in-button while the API call is in-flight
             doneBtn.textContent = 'Loading...';
             doneBtn.disabled = true;
             doneBtn.classList.add('disabled');
             doneBtn.style.opacity = '0.5';
             doneBtn.style.cursor = 'not-allowed';
             // Pass fresh pipeline from store so saveTask reads up-to-date intents
             const freshPipeline = store.getState()?.global?.questions?.[item?.reqId]?.executionPipeline || item?.executionPipeline;
             saveTask(index, task, freshPipeline);
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

         // Power tools buttons (common agents quick-select)
         const powerToolBtns = document.querySelectorAll(`[id^="powerToolBtn-${task?._id}-"]`);
         powerToolBtns.forEach(btn => {
           if(btn && !btn.eventListenerAdded){
             btn.addEventListener("click", (e) => {
               e.preventDefault();
               e.stopPropagation();
               const powerToolId = btn.dataset.powerToolId;
               const freshState = store.getState().global;
               const allCommonAgents = freshState?.commonAgents || [];
               const agents = Array.isArray(allCommonAgents) ? allCommonAgents : (allCommonAgents?.data || []);
               const selectedAgent = agents.find(a => a?.id === powerToolId);
               if(selectedAgent){
                 addIntent(index, task, selectedAgent);
                 if(doneBtn && doneBtn.checkForChanges){
                   setTimeout(() => doneBtn.checkForChanges(), 50);
                 }
               }
             });
             btn.eventListenerAdded = true;
           }
         });

         // Refresh Start button disabled state after any pipeline edit/add change
         const _startBtn = document.getElementById(`startBtn-${item?.reqId}`);
         if(_startBtn){
           const freshPipeline = store.getState()?.global?.questions?.[item?.reqId]?.executionPipeline || [];
           const _hasEditOrAddTask = freshPipeline.some(t => t?.type === 'addTask' || t?.type === 'modify');
           _startBtn.disabled = _hasEditOrAddTask;
         }

         task?.intents?.forEach((intent, idx) => {
         const deleteIntentBtn = document.getElementById(`deleteIntent-${task?._id}-${intent?.agentId}`);
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
