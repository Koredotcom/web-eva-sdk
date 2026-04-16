import { cloneDeep } from "lodash";
import store from "../../redux/store";
import { multiIntentExecutionFunc } from "../functionality/multi-intent-execution";
import TemplateRenderer from "../templateRenderer";
import "./../styles/template.scss";
import { Close, PlusIcon, DragHandleIcon, RadioButtonChecked, createDeleteIcon, EditIcon, HistoryIcon, AddStepFilledIcon, WarningStrokeCircle, tickMarkIcon, IconLoader, AgenticSearchIcon, CheveronDownIcon, cheveronRightIcon } from "../icons-library";

const multiIntentRenderTimers = new Map();


const assistantIconTemplate = () => {
    return `<img src="https://www.google.com/imgres?q=green%20dot&imgurl=https%3A%2F%2Fi.pinimg.com%2F736x%2Fe2%2F29%2F50%2Fe22950b0a26db427c651dccba60ab62c.jpg&imgrefurl=https%3A%2F%2Fin.pinterest.com%2Fpin%2Fgreen-circle-logo--333547916161752097%2F&docid=C6G2J8KBo9zd2M&tbnid=Np_pFb0VPiJdvM&vet=12ahUKEwiE-dPf3JONAxV2cmwGHVL7JgcQM3oECG8QAA..i&w=735&h=752&hcb=2&ved=2ahUKEwiE-dPf3JONAxV2cmwGHVL7JgcQM3oECG8QAA" alt="Assistant Icon" height="20" width="20"/>`;
}
const userIconTemplate = () => {
    return `<img src="https://www.google.com/imgres?q=green%20dot&imgurl=https%3A%2F%2Fi.pinimg.com%2F736x%2Fe2%2F29%2F50%2Fe22950b0a26db427c651dccba60ab62c.jpg&imgrefurl=https%3A%2F%2Fin.pinterest.com%2Fpin%2Fgreen-circle-logo--333547916161752097%2F&docid=C6G2J8KBo9zd2M&tbnid=Np_pFb0VPiJdvM&vet=12ahUKEwiE-dPf3JONAxV2cmwGHVL7JgcQM3oECG8QAA..i&w=735&h=752&hcb=2&ved=2ahUKEwiE-dPf3JONAxV2cmwGHVL7JgcQM3oECG8QAA" alt="User Icon" height="20" width="20"/>`;
};

function render(data) {

    let state = store?.getState()?.global;
    let _questions = cloneDeep(state?.questions);
    let items = data || {};

    let initialState = items?.status === "draft";

    // Determine whether Start button should be disabled (same as Kora-React actionButtonDisabledFn)
    const hasEditOrAddTask = items?.executionPipeline?.some(t => t?.type === 'addTask' || t?.type === 'modify');

    let header = `
        <div id="answer-${items?.reqId}" class="threadName maxLength" >
            ${items?.templateInfo?.label}
        </div>

        ${items?.status === 'draft' ? items?.executionPipeline?.length > 0 ? `
        <div class="btnWrapper">
                <button class="kr-primary-btn-black btn-lg startBtn" id="startBtn-${items?.reqId}" ${hasEditOrAddTask ? 'disabled' : ''}>${items?.templateInfo?.action}</button>
                <button class="kr-secondary-btn btn-lg editFlowBtn" id="editFlowBtn-${items?.reqId}">Edit</button>
            </div>
        ` : '' : ''}
        `;

    // Common agents (power tools): filter out personalHub and disabled ones
    const allCommonAgents = state?.commonAgents || [];
    const powerTools = Array.isArray(allCommonAgents)
        ? allCommonAgents.filter(a => a?.id !== 'personalHub' && !a?.disabled)
        : [];

    let body = `
        ${items?.executionPipeline?.map((task, index) => {
        const originalTaskId = task?._id;
        // Save the pipeline-level type BEFORE merging store question data.
        // constructQuestionInitial stores questions at task._id with type: "search" and loading: true
        // when a step executes. These must NOT override the pipeline's edit-mode type ('addTask'/'modify')
        // or bleed 'loading' into the edit form.
        const pipelineType = task?.type;
        task = { ...task, ..._questions[task?._id], isTask: true, _id: originalTaskId };
        // Restore the pipeline type so edit mode is preserved correctly
        if (pipelineType === 'addTask' || pipelineType === 'modify') {
            task.type = pipelineType;
            // Do NOT carry 'loading' from step execution into the edit form —
            // the edit form has its own loading state managed via the Done button handler
            task.loading = false;
        }
        let html = TemplateRenderer.generateHTMLTemplate(task, {});

        if (task?.type === 'addTask' || task?.type === 'modify') {
            return addNewTaskRenderer(task, index, items, powerTools);
        }

        const isLastTask = index === items?.executionPipeline?.length - 1;
        const showCheveron = task?.status === "completed" || task?.status === "discard" || task?.status === "terminated" || task?.showResponse || task?.apiSuccess;
        const taskItemClasses = [
            'taskItem',
            (task?.loading || task?.showResponse || task?.showResponseFlow) ? 'loadingSkeleton' : '',
            task?.loading ? 'loading' : '',
            showCheveron ? 'showCheveron' : ''
        ].filter(Boolean).join(' ');

            return `
                <div class="tasksToRun">
                    <div class="taskItems">
                        <div class='addNewLineWrapper'>
                            ${initialState ? `<div class='addNewLine'>
                                <span class="stepIcon addNewTaskBtn" id="addNewTaskBtn-${items?.reqId}-${index}" title="Add step">
                                    ${AddStepFilledIcon({ size: 32, color: "#98A2B3" })}
                                </span>
                            </div>` : ''}
                        </div>
                        <div class="dragTaskItem"
                            id="dragTaskItem-${items?.reqId}-${index}"
                            draggable="${initialState && items?.executionPipeline?.length > 1 ? 'true' : 'false'}" 
                            data-task-id="${task?._id}" 
                            data-task-index="${index}">
                            ${initialState && items?.executionPipeline?.length > 1 ? `<div class="dragHandle" title="Drag to reorder">
                                ${DragHandleIcon({ size: 14, color: "#9CA3AF" })}
                            </div>` : ''}
                            <div class="${taskItemClasses}" id="taskItem-${task?._id}">
                                <div class="topCard" ${showCheveron ? `id="historyBtn-${task?._id}" data-toggle-task-id="${task?._id}" data-toggle-req-id="${items?.reqId}"` : ''}>
                                    <div class="leftBlock">
                                ${task?.loading ? `<div class="statusIcon">
                                    <span class="spinLoader">${IconLoader({ size: 16 })}</span>
                                </div>` :
                                task?.status === "completed"
                                    ? tickMarkIcon({ size: 16, color: "#475467" })
                                            : task?.status === "discard"
                                                ? WarningStrokeCircle({ size: 16, color: "white", stroke: "#F04438", insideFill: "#F04438" })
                                                : HistoryIcon({ size: 16, color: "#98A2B3" })
                                        }
                              
                                        <div class="contentBlock">
                                            <div class="agentsAmbiguity">
                                            ${Array.isArray(task?.intents) && task.intents.length > 0 ?
                                                task.intents.slice(0, 1).map((intent, idx) => `
                                                    <div class="agentIcon">
                                                        <img src="${intent?.agentMeta?.icon}" alt="Agent ${idx + 1}" />
                                                    </div>
                                                `).join('')
                                                : AgenticSearchIcon({ size: 16 })
                                            }
                                            </div>
                                            <div class="utterance tooltipForEllipsis" id="utteranceText-${task?._id}" title="${task?.utterance}">${task?.utterance}</div>                                            
                                        </div>
                                    </div>
                                    ${showCheveron ? `
                                        <div class="rightBlock showCheveronBlock" id="cheveronBtn-${task?._id}" data-toggle-task-id="${task?._id}" data-toggle-req-id="${items?.reqId}">
                                            <div class="cheveronDown${task?.showResponse ? ' rotate' : ''}">
                                                ${CheveronDownIcon({ size: 16, color: "#667085" })}
                                            </div>
                                        </div>
                                    ` : initialState ? `
                                    <div class="rightBlock">
                                        <div class="options">
                                            <div class="opItem" id="editBtn-${task?._id}" title="Edit">${EditIcon({ size: 14, color: "#667085" })}</div>
                                            <div class="opItem" id="deleteBtn-${task?._id}" title="Delete">${createDeleteIcon({ size: 14, color: "#667085" })}</div>
                                        </div>
                                    </div>
                                    ` : ''}
                                </div> 
                                ${(task?.showResponse || task?.showResponseFlow) ? `
                                    <div class="bottomCard">
                                        ${html?.innerHTML || ''}
                                        ${task?.showResponse && index < items?.executionPipeline?.length - 1 && [undefined, null, '', 'draft', 'in-progress', 'threadRunning'].includes(task?.status) ?
                                        `<div class='continuebtn' id="continueBtn-${task?._id}" data-continue-task-id="${task?._id}" data-continue-task-index="${index}" data-continue-req-id="${items?.reqId}">
                                            Continue Flow 
                                        </div>` : ''
                                        }
                                    </div>
                            ` : ''}                               
                            </div>             
                        </div>
                        ${initialState && isLastTask ? `
                        <div class='addNewLineWrapper'>
                            <div class='addNewLine'>
                                <span class="stepIcon addNewTaskBtn" id="addNewTaskLastBtn-${items?.reqId}" title="Add step">
                                    ${AddStepFilledIcon({ size: 32, color: "#98A2B3" })}
                                </span>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            `;
        }).join('')}
    `;


    let multiIntentExecution = `
        <div class="multiIntentExecution ${items?.status} ${items?.executionPipeline?.length === 0 ? 'd-none' : ''}" id="multiIntentExecution-${items?.reqId}">
            ${header}
            ${body}
        </div>
    `;

    const timerKey = items?.reqId || items?.messageId || items?.id;
    if (timerKey && multiIntentRenderTimers.has(timerKey)) {
        clearTimeout(multiIntentRenderTimers.get(timerKey));
    }
    const timeout = setTimeout(() => {
        requestAnimationFrame(() => {
            multiIntentExecutionFunc(data);
        });
    }, 0);
    if (timerKey) {
        multiIntentRenderTimers.set(timerKey, timeout);
    }

    return multiIntentExecution;
}

const addNewTaskRenderer = (task, index, items, powerTools = []) => {
    const isAddTask = task?.type === 'addTask';
    const hasIntents = task?.intents?.length > 0;
    const utteranceEmpty = !task?.utterance || task?.utterance?.trim()?.length === 0;

    return `
      <div class='addingNewTask'>
        <div class="headerSec">
            ${isAddTask ? `<div class="headerMsg">
               ${AgenticSearchIcon({ size: 20, color: "#475467" })} ${task?.headerMsg}
            </div>` : ''}
          <div class="headerInfo">
            <div class='step'>${task?.step || `Step ${index + 1}`}</div>
              ${items?.executionPipeline?.length > 1 ?
            `<div class="opItem" id="deleteNewTaskBtn-${task?._id}" title="Delete">${createDeleteIcon({ size: 14, color: "#667085" })}</div>`
            : ''}
          </div>
          <div class="addDescription ${isAddTask ? 'showFullborders' : ''}">
            <input type="text" value="${task?.utterance || ''}" placeholder="Add the description of step(s) which I missed!" id="utterance-${task?._id}" />

            <div class="agentBlock ${!hasIntents ? 'space-between' : ''}">
            ${!hasIntents ? `
              <div class="addAgentAndPowerToolsWrapper">
                <span class="add-agent-label" id="addAgentLabel-${task?._id}">
                    + Add Agent
                </span>
                ${powerTools?.length > 0 ? `
                  <span class="separator">|</span>
                  <div class="powerToolsButtons">
                    ${powerTools.map(pt => `
                      <span class="powerToolButton" id="powerToolBtn-${task?._id}-${pt?.id}" data-power-tool-id="${pt?.id}" data-task-id="${task?._id}" title="${pt?.name || pt?.id}">
                        <div class="powerToolIcon"><img src="${pt?.icon || ''}" alt="${pt?.name || ''}" onerror="this.style.display='none'" style="width: 16px; height: 16px;" /></div>
                        <div class="powerToolName">${pt?.name || pt?.id}</div>
                      </span>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            ` : ''}
            ${hasIntents ? task?.intents?.map((intent, idx) => `
                <div class="agentBadgeWrapper">
                    <div class="agentBadge">
                            <span class='badgeimg'><img src="${intent?.agentMeta?.icon}" /></span>
                            <span class='ellipsisTextBlock'>${intent?.agentMeta?.name}</span>
                            <span class='badge-close' id="deleteIntent-${task?._id}-${intent?.agentId}">
                            ${Close({ size: "8", color: "#98A2B3" })}
                            </span>
                    </div>
                </div>
            `).join('') : ''}
            ${!hasIntents && !isAddTask ? `<div class='agentBlock-last'>${AgenticSearchIcon({ size: 16})}<span class='defaultSearchText'>Default Search will respond</span></div>` : ''}
          </div>
          </div>
          
          <div class="footerSec">
            <div class="btns">
                <button class="kr-secondary-btn btn-sm cancelBtn" id="cancelBtn-${task?._id}">Cancel</button>
                <button class="kr-primary-btn-black btn-sm doneBtn ${utteranceEmpty ? 'disabled' : ''}" id="doneBtn-${task?._id}" ${utteranceEmpty ? 'disabled' : ''}>Done</button>                
            </div>
            ${!hasIntents && !isAddTask ? `<span class='errorMessage'>Relevant agent not found</span>` : ''}
            ${task?.error ? `<span class='errorMessage'>Relevant agent not found. Please update/elaborate description</span>` : ''}
          </div>
        </div>
    `;
}



export { render };
