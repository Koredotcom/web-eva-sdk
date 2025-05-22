import { cloneDeep } from "lodash";
import store from "../../redux/store";
import { multiIntentExecutionFunc } from "../functionality/multi-intent-execution";
import TemplateRenderer from "../templateRenderer";
import "./../styles/template.scss";


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

    let initialState = items?.status === "draft"

    let header = `
        <div id="answer-${items?.id}" class="threadName maxLength" >
            ${items?.templateInfo?.label}
        </div>

        ${items?.status === 'draft' ? items?.executionPipeline?.length > 0 ? `
            <button class="startBtn" id = "startBtn-${items?.id}">${items?.templateInfo?.action}</button>
            <button class="editFlowBtn" id = "editFlowBtn-${items?.id}">Edit Flow</button>
        ` : '' : ''}
        `;

       
    let body = `
        ${items?.executionPipeline?.map((task, index) => {
            task = {...task, ..._questions[task?._id], isTask: true};
            let html = TemplateRenderer.generateHTMLTemplate(task, {});
           
            if(task?.type === 'addTask' || task?.type === 'modify'){
                return addNewTaskRenderer(task, index, items);
            }

            return `
                <div class='addNewLineWrapper'>
                  ${initialState ? `<div class='addNewLine'>
                      <button class="addNewTaskBtn" id = "addNewTaskBtn-${index}">+</button>
                  </div>` : ''}
                </div>
                <div class="taskItem">
                    <div class="taskItemHeader">
                        <div class="taskItemHeaderTitle">Task ${index + 1}</div>
                        <div class="contentBlock">
                            ${Array.isArray(task?.intents) && task.intents.length > 0 ? `
                                <div class="agentIcons">
                                ${task.intents.slice(0, 2).map((intent, idx) => `
                                    <div class="agentIcon">
                                        <img src="${intent?.agentMeta?.icon}" alt="Agent ${idx + 1}" />
                                    </div>
                                `).join('')}
                                </div>
                            ` : ''}
                            <div class="utterance">${task?.utterance}</div>
                        </div>
                        ${initialState ? `<div class="optionsWrapper">
                            <button class="editBtn" id = "editBtn-${items?.id}-${index}">Edit</button>
                            <button class="deleteBtn" id = "deleteBtn-${items?.id}-${index}">Delete</button>
                        </div>` : ''}
                        ${task?.showResponse ? `
                            <div class="bottomCard">
                            ${html?.innerHTML}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('')}
    `;

   
    let multiIntentExecution = `
        <div class="multiIntentExecution ${items?.status} ${items?.executionPipeline?.length === 0 ? 'd-none' : ''}">
            ${header}
            ${body}
        </div>
    `;

    // multiIntentExecution += header;


    let timeout
    clearTimeout(timeout)
    timeout = setTimeout(() => {
        multiIntentExecutionFunc(data);
    }, 1000);

    return multiIntentExecution;
}

const addNewTaskRenderer = (task, index, items) => {
    return `
      <div class='addingNewTask'>
        <div class="headerSec">
            ${task?.type === 'addTask' ? `<div class="headerMsg">
               ? ${task?.headerMsg}
            </div>` : ''}
          <div class="headerInfo">
            <div class='step'>${task?.step || `Step ${index+1}`}</div>
              ${items?.executionPipeline?.length > 1 ?
                `<button class="deleteBtn" id = "deleteNewTaskBtn-${items?.id}-${index}">Delete</button>`
              : ''}
          </div>
          <div class="addDescription">
            <input type="text" value = "${task?.utterance}" placeholder="Add the description of step(s) which I missed!" id = "utterance-${items?.id}-${index}" />
          </div>
          <div class="footerSec">
            <div class="btns">
                <button class="cancelBtn" id = "cancelBtn-${items?.id}-${index}">Cancel</button>
                <button class="doneBtn" id = "doneBtn-${items?.id}-${index}">Done</button>
            </div>
          </div>
        </div>
    `;
}



export { render };